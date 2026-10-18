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

/** Remove silêncio no início e no fim de um trecho, para as pausas ficarem regulares. */
export function aparar(amostras, limiar = 0.01) {
  let inicio = 0;
  let fim = amostras.length;
  while (inicio < fim && Math.abs(amostras[inicio]) < limiar) inicio++;
  while (fim > inicio && Math.abs(amostras[fim - 1]) < limiar) fim--;
  return amostras.subarray(Math.max(0, inicio - 240), Math.min(amostras.length, fim + 480));
}
