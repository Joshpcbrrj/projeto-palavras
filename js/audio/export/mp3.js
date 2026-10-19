/**
 * Montagem de um arquivo MP3 a partir de trechos de áudio (PCM) e pausas.
 * Usa o lamejs (codificador MP3 em JavaScript), carregado sob demanda.
 */

import { CDN } from '../../config.js';

export const TAXA_PADRAO = 24000; // Hz — taxa nativa do Kokoro
const AMOSTRAS_POR_QUADRO = 1152;

let lamePromessa = null;
/** Carrega o construtor Mp3Encoder do lamejs. */
export async function obterEncoderMp3() {
  lamePromessa ??= import(/* @vite-ignore */ CDN.lame);
  const lame = await lamePromessa;
  return lame.Mp3Encoder;
}

/** Converte amostras float (-1..1) em inteiros de 16 bits. */
export function paraInt16(amostras) {
  const saida = new Int16Array(amostras.length);
  for (let i = 0; i < amostras.length; i++) {
    const s = Math.max(-1, Math.min(1, amostras[i]));
    saida[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return saida;
}

/** Reamostragem linear simples (suficiente para voz). */
export function reamostrar(amostras, taxaOrigem, taxaDestino) {
  if (taxaOrigem === taxaDestino) return amostras;
  const razao = taxaOrigem / taxaDestino;
  const total = Math.floor(amostras.length / razao);
  const saida = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const pos = i * razao;
    const a = Math.floor(pos);
    const b = Math.min(a + 1, amostras.length - 1);
    saida[i] = amostras[a] + (amostras[b] - amostras[a]) * (pos - a);
  }
  return saida;
}

/**
 * Construtor incremental de MP3 mono: adicione trechos e pausas e finalize.
 * Codifica aos poucos para não acumular todo o áudio na memória.
 */
export class Mp3Builder {
  constructor(Mp3Encoder, { taxa = TAXA_PADRAO, kbps = 64 } = {}) {
    this.encoder = new Mp3Encoder(1, taxa, kbps);
    this.taxa = taxa;
    this.partes = [];
    this.amostras = 0;
  }

  /** Adiciona amostras float na taxa do construtor. */
  adicionar(amostras) {
    const inteiros = paraInt16(amostras);
    for (let i = 0; i < inteiros.length; i += AMOSTRAS_POR_QUADRO) {
      const bloco = this.encoder.encodeBuffer(inteiros.subarray(i, i + AMOSTRAS_POR_QUADRO));
      if (bloco.length) this.partes.push(new Uint8Array(bloco));
    }
    this.amostras += amostras.length;
  }

  silencio(ms) {
    if (ms > 0) this.adicionar(new Float32Array(Math.round((this.taxa * ms) / 1000)));
  }

  get duracaoSegundos() {
    return this.amostras / this.taxa;
  }

  /** @returns {Blob} arquivo audio/mpeg */
  finalizar() {
    const final = this.encoder.flush();
    if (final.length) this.partes.push(new Uint8Array(final));
    return new Blob(this.partes, { type: 'audio/mpeg' });
  }
}

const dbParaGanho = (db) => 10 ** (db / 20);

/**
 * Nivela o volume ao longo do trecho. O Kokoro começa as frases forte e termina
 * bem mais baixo (de −16 dB para −35 dB numa frase longa); ouvido em sequência,
 * isso soa como "trechos baixos e rompantes". Aqui o volume de cada janela de 50 ms
 * é puxado para um alvo comum, com ganho suavizado (sem efeito de "bombeamento"),
 * silêncio não é amplificado e os picos passam por um limitador suave.
 */
export function nivelar(
  amostras,
  {
    taxa = TAXA_PADRAO,
    alvoDb = -19,
    maxGanhoDb = 9,
    minGanhoDb = -6,
    portaDb = -45,
    janelaMs = 50,
    suavizarMs = 200,
    teto = 0.89,
  } = {}
) {
  const total = amostras.length;
  if (!total) return amostras;
  const jan = Math.max(1, Math.round((taxa * janelaMs) / 1000));
  const nJanelas = Math.ceil(total / jan);

  // Ganho desejado (dB) por janela.
  const ganhos = new Float32Array(nJanelas);
  for (let j = 0; j < nJanelas; j++) {
    let soma = 0;
    const fim = Math.min(total, (j + 1) * jan);
    for (let i = j * jan; i < fim; i++) soma += amostras[i] * amostras[i];
    const db = 10 * Math.log10(soma / (fim - j * jan) + 1e-12);
    ganhos[j] = db < portaDb ? 0 : Math.max(minGanhoDb, Math.min(maxGanhoDb, alvoDb - db));
  }

  // Suaviza o ganho entre janelas vizinhas (média móvel).
  const raio = Math.max(0, Math.round(suavizarMs / janelaMs / 2));
  const suaves = new Float32Array(nJanelas);
  for (let j = 0; j < nJanelas; j++) {
    let soma = 0;
    let n = 0;
    for (let k = Math.max(0, j - raio); k <= Math.min(nJanelas - 1, j + raio); k++) {
      soma += ganhos[k];
      n++;
    }
    suaves[j] = dbParaGanho(soma / n);
  }

  // Aplica o ganho interpolado amostra a amostra e limita os picos suavemente.
  const saida = new Float32Array(total);
  const joelho = teto * 0.8;
  for (let i = 0; i < total; i++) {
    const pos = i / jan - 0.5;
    const a = Math.max(0, Math.min(nJanelas - 1, Math.floor(pos)));
    const b = Math.min(nJanelas - 1, a + 1);
    const t = Math.max(0, Math.min(1, pos - a));
    let v = amostras[i] * (suaves[a] + (suaves[b] - suaves[a]) * t);
    const abs = Math.abs(v);
    if (abs > joelho) {
      v = Math.sign(v) * (joelho + (teto - joelho) * Math.tanh((abs - joelho) / (teto - joelho)));
    }
    saida[i] = v;
  }
  return saida;
}

/** Entrada e saída suaves (evita estalos nas emendas entre trechos). */
export function suavizarBordas(amostras, { taxa = TAXA_PADRAO, entradaMs = 6, saidaMs = 25 } = {}) {
  const entrada = Math.min(amostras.length, Math.round((taxa * entradaMs) / 1000));
  const saida = Math.min(amostras.length, Math.round((taxa * saidaMs) / 1000));
  for (let i = 0; i < entrada; i++) amostras[i] *= i / entrada;
  for (let i = 0; i < saida; i++) amostras[amostras.length - 1 - i] *= i / saida;
  return amostras;
}

/** Prepara um trecho sintetizado para o MP3: apara, nivela e suaviza as bordas. */
export function prepararTrecho(pcm, taxaOrigem, taxa = TAXA_PADRAO) {
  return suavizarBordas(nivelar(aparar(reamostrar(pcm, taxaOrigem, taxa)), { taxa }), { taxa });
}

/** Remove silêncio no início e no fim de um trecho, para as pausas ficarem regulares. */
export function aparar(amostras, limiar = 0.01) {
  let inicio = 0;
  let fim = amostras.length;
  while (inicio < fim && Math.abs(amostras[inicio]) < limiar) inicio++;
  while (fim > inicio && Math.abs(amostras[fim - 1]) < limiar) fim--;
  return amostras.subarray(Math.max(0, inicio - 240), Math.min(amostras.length, fim + 480));
}
