/**
 * Planejamento do áudio exportado: divide o conteúdo em trechos curtos, escolhe a
 * voz de cada trecho e define as pausas. Independente do motor de voz.
 */

import { TIPOS } from '../../config.js';
import { dividirParaLeitura } from '../../text/extract.js';

const FALANTE = /^([\p{L}][\p{L} .'-]{0,23})\s*:\s+(.+)$/u;

/** Separa "Anna: Olá!" em { falante: 'Anna', fala: 'Olá!' }. Retorna null se não for uma fala. */
export function separarFalante(linha) {
  const m = String(linha || '')
    .trim()
    .match(FALANTE);
  return m ? { falante: m[1].trim(), fala: m[2].trim() } : null;
}

/** O texto é um diálogo? (a maioria das linhas no formato "Nome: fala", com 2+ falantes) */
export function ehDialogo(texto) {
  const linhas = String(texto || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (linhas.length < 2) return false;
  const falas = linhas.map(separarFalante).filter(Boolean);
  const falantes = new Set(falas.map((f) => f.falante.toLowerCase()));
  return falantes.size >= 2 && falantes.size <= 6 && falas.length / linhas.length >= 0.6;
}

/**
 * @typedef {{texto: string, voz: number, pausaDepoisMs: number}} Segmento
 * `voz` é o índice da voz (0 = principal, 1 = segunda voz dos diálogos).
 */

/**
 * Monta a lista de trechos a sintetizar.
 * @param {object} conteudo
 * @param {string} conteudo.tipo 'palavras' | 'frases' | 'texto'
 * @param {string[]} [conteudo.itens]
 * @param {string} [conteudo.texto]
 * @param {object} [opcoes]
 * @param {number} [opcoes.repeticoes=1] quantas vezes falar cada palavra/frase
 * @param {number} [opcoes.pausaMs=900] pausa entre palavras/frases
 * @param {boolean} [opcoes.numerar=false] falar o número do item ("Number 3") para acompanhar no PDF
 * @param {Map<string, string>} [opcoes.traducoes] item (minúsculo) → tradução, falada depois do item
 * @returns {Segmento[]}
 */
export function planejarAudio(
  { tipo, itens = [], texto = '' },
  { repeticoes = 1, pausaMs = 900, numerar = false, traducoes } = {}
) {
  const segmentos = [];

  if (tipo === TIPOS.PALAVRAS || tipo === TIPOS.FRASES) {
    const vezes = Math.max(1, Math.min(5, Math.round(repeticoes)));
    // A numeração segue a do PDF, que conta os itens não vazios.
    const validos = itens.map((item) => String(item).trim()).filter(Boolean);
    for (const [indice, conteudo] of validos.entries()) {
      const traducao = traducoes?.get(conteudo.toLowerCase());
      for (let i = 0; i < vezes; i++) {
        const ultima = i === vezes - 1;
        segmentos.push({
          // O número vai junto com a 1ª leitura: cada chamada à voz tem um custo fixo
          // (≈ 1,5 s), então um trecho só sai quase duas vezes mais rápido que dois.
          texto: numerar && i === 0 ? `Number ${indice + 1}. ${conteudo}` : conteudo,
          voz: 0,
          pausaDepoisMs: !ultima ? 500 : traducao ? 600 : pausaMs,
        });
      }
      if (traducao) segmentos.push({ texto: traducao, voz: 0, pausaDepoisMs: pausaMs });
    }
    return segmentos;
  }

  if (ehDialogo(texto)) {
    const vozes = new Map();
    for (const linha of texto.split('\n')) {
      const fala = separarFalante(linha);
      if (!fala) continue;
      const chave = fala.falante.toLowerCase();
      if (!vozes.has(chave)) vozes.set(chave, vozes.size % 2);
      segmentos.push({ texto: fala.fala, voz: vozes.get(chave), pausaDepoisMs: 650 });
    }
    return segmentos;
  }

  // Texto corrido: frases curtas do mesmo parágrafo são agrupadas (menos chamadas à voz,
  // geração mais rápida e entonação mais natural), com pausas maiores entre parágrafos
  // e após títulos.
  const trechos = dividirParaLeitura(texto);
  trechos.forEach((trecho, i) => {
    const proximo = trechos[i + 1];
    const entre = proximo ? texto.slice(trecho.fim, proximo.inicio) : '';
    const titulo = !/[.!?…:;"'”)\]]$/u.test(trecho.texto) && trecho.texto.length < 80;
    let pausa = PAUSA_FRASE;
    if (titulo) pausa = 900;
    else if (/\n/.test(entre)) pausa = 750;
    const anterior = segmentos.at(-1);
    if (
      anterior?.pausaDepoisMs === PAUSA_FRASE &&
      !titulo &&
      anterior.texto.length + 1 + trecho.texto.length <= MAX_CARACTERES_TRECHO
    ) {
      anterior.texto += ` ${trecho.texto}`;
      anterior.pausaDepoisMs = pausa;
    } else {
      segmentos.push({ texto: trecho.texto, voz: 0, pausaDepoisMs: pausa });
    }
  });
  return segmentos;
}

const PAUSA_FRASE = 300;
/** Tamanho máximo de um trecho agrupado (o Kokoro lida bem com até ≈ 400 caracteres). */
const MAX_CARACTERES_TRECHO = 220;

/** Estimativa grosseira da duração (em segundos), útil para avisar o usuário. */
export function estimarDuracao(segmentos, velocidade = 1) {
  return segmentos.reduce(
    (total, s) => total + s.texto.length / (14 * velocidade) + s.pausaDepoisMs / 1000,
    0
  );
}
