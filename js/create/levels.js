/**
 * Níveis de compreensão e métricas de legibilidade.
 *
 * As orientações de cada nível seguem o QECR/CEFR e guiam a IA na escolha de
 * vocabulário, tamanho de frase e tempos verbais. As métricas permitem conferir
 * se o texto gerado ficou no nível pedido.
 */

import { NIVEIS } from '../config.js';

export const ORIENTACOES_NIVEL = Object.freeze({
  iniciante: [
    'CEFR level A1-A2 (beginner).',
    'Use only very common, everyday words (about the 1,000 most frequent words).',
    'Keep sentences short: 5 to 10 words each.',
    'Use mainly the present simple, present continuous and past simple.',
    'Avoid idioms, phrasal verbs, slang and technical terms; if a topic word is necessary, explain it with simple words.',
  ].join(' '),
  intermediario: [
    'CEFR level B1-B2 (intermediate).',
    'Use mostly common, everyday vocabulary plus a few topic-specific words; briefly explain any difficult word.',
    'Use sentences of 10 to 18 words with some variety (because, although, which).',
    'Use a range of tenses (present perfect, future, conditionals) and a few common phrasal verbs.',
  ].join(' '),
  fluente: [
    'CEFR level C1-C2 (advanced/fluent).',
    'Use rich, precise and natural vocabulary, including idioms and phrasal verbs where natural.',
    'Use complex sentences, nuance and a natural native-like style.',
  ].join(' '),
});

/** Tamanho alvo (em palavras) por formato. */
export const TAMANHOS = Object.freeze({
  curto: { nome: 'Curto', palavras: 150, falas: 8 },
  medio: { nome: 'Médio', palavras: 300, falas: 14 },
  longo: { nome: 'Longo', palavras: 500, falas: 20 },
});

export function nomeNivel(nivel) {
  return NIVEIS[nivel] ? `${NIVEIS[nivel].nome} (${NIVEIS[nivel].cefr})` : nivel;
}

/** Conta sílabas de uma palavra em inglês (heurística usada pelas fórmulas de legibilidade). */
export function contarSilabas(palavra) {
  const p = String(palavra)
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (!p) return 0;
  if (p.length <= 3) return 1;
  const semFinal = p.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const grupos = semFinal.match(/[aeiouy]{1,2}/g);
  return Math.max(1, grupos ? grupos.length : 1);
}

/**
 * Métricas de legibilidade de um texto em inglês.
 * @returns {{palavras: number, frases: number, palavrasPorFrase: number,
 *   silabasPorPalavra: number, facilidade: number, nivelEstimado: string}}
 */
export function analisarTexto(texto) {
  const limpo = String(texto || '').replace(/^[\p{L} .'-]{1,24}:\s+/gmu, ''); // remove nomes de falantes
  const palavras = limpo.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [];
  const frases = Math.max(1, (limpo.match(/[.!?]+(\s|$)/g) || []).length);
  const silabas = palavras.reduce((soma, p) => soma + contarSilabas(p), 0);
  const total = palavras.length || 1;
  const palavrasPorFrase = palavras.length / frases;
  const silabasPorPalavra = silabas / total;
  // Flesch Reading Ease: quanto maior, mais fácil (90+ muito fácil, <30 muito difícil).
  const facilidade = Math.round(206.835 - 1.015 * palavrasPorFrase - 84.6 * silabasPorPalavra);

  let nivelEstimado = 'fluente';
  if (facilidade >= 70) nivelEstimado = 'iniciante';
  else if (facilidade >= 45) nivelEstimado = 'intermediario';

  return {
    palavras: palavras.length,
    frases,
    palavrasPorFrase: Math.round(palavrasPorFrase * 10) / 10,
    silabasPorPalavra: Math.round(silabasPorPalavra * 100) / 100,
    facilidade,
    nivelEstimado,
  };
}
