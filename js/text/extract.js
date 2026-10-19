/**
 * Extração de palavras e frases de um texto.
 *
 * Funciona com qualquer alfabeto (latino, cirílico, CJK...). Quando o navegador
 * oferece `Intl.Segmenter`, ele é usado para segmentar idiomas sem espaços entre
 * as palavras (japonês, chinês) e para dividir frases respeitando a pontuação local.
 */

import { unicos } from '../core/utils.js';
import { semPalavrasComuns } from './comuns.js';

const LETRA = /\p{L}/u;
const PONTA_NAO_LETRA = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

function criarSegmentador(idioma, granularity) {
  if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') return null;
  try {
    return new Intl.Segmenter(idioma || undefined, { granularity });
  } catch {
    return null;
  }
}

function idiomaSemEspacos(idioma) {
  return /^(ja|zh|th|lo|km|my)\b/i.test(idioma || '');
}

/** Normaliza espaços, aspas tipográficas e caracteres invisíveis. */
export function normalizarTexto(texto) {
  return String(texto ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Extrai palavras do texto.
 * @param {string} texto
 * @param {object} [opcoes]
 * @param {string} [opcoes.idioma] código BCP-47 (melhora a segmentação de ja/zh)
 * @param {boolean} [opcoes.removerDuplicadas=true]
 * @param {number} [opcoes.minimo=1] tamanho mínimo da palavra
 * @param {boolean} [opcoes.ignorarComuns=false] remove palavras muito comuns (the, a, to...)
 * @returns {string[]}
 */
export function extrairPalavras(
  texto,
  { idioma, removerDuplicadas = true, minimo = 1, ignorarComuns = false } = {}
) {
  const limpo = normalizarTexto(texto);
  if (!limpo) return [];

  let palavras;
  const segmentador = criarSegmentador(idioma, 'word');
  if (segmentador && (idiomaSemEspacos(idioma) || !/\s/.test(limpo) || /[぀-ヿ一-鿿]/.test(limpo))) {
    palavras = Array.from(segmentador.segment(limpo))
      .filter((s) => s.isWordLike)
      .map((s) => s.segment);
  } else {
    palavras = limpo
      .split(/[\s\-\u2013\u2014/\\|]+/u)
      .map((p) => p.replace(PONTA_NAO_LETRA, ''))
      .flatMap((p) => p.split(/[^\p{L}\p{M}\p{N}'\u2019]+/u));
  }

  palavras = palavras
    .map((p) => p.replace(/^['\u2019]+|['’]+$/g, ''))
    .filter((p) => p.length >= minimo && LETRA.test(p));

  if (ignorarComuns) palavras = semPalavrasComuns(palavras, idioma || 'en');
  return removerDuplicadas ? unicos(palavras) : palavras;
}

/**
 * Divide o texto em frases.
 * @param {string} texto
 * @param {object} [opcoes]
 * @param {string} [opcoes.idioma]
 * @param {boolean} [opcoes.removerDuplicadas=true]
 * @param {boolean} [opcoes.manterPontuacao=false] mantém ".", "!" e "?" no final
 * @returns {string[]}
 */
export function extrairFrases(
  texto,
  { idioma, removerDuplicadas = true, manterPontuacao = false } = {}
) {
  const limpo = normalizarTexto(texto);
  if (!limpo) return [];

  const frases = [];
  for (const bloco of limpo.split(/\n{1,}/)) {
    frases.push(...segmentarFrases(bloco, idioma));
  }

  const resultado = frases
    .map((f) => f.trim())
    .map((f) => (manterPontuacao ? f : f.replace(/[\s.!?;:。！？\u2026]+$/u, '')))
    .map((f) => f.replace(/^[\s\-\u2013\u2014\u2022*]+/u, '').trim())
    .filter((f) => LETRA.test(f));

  return removerDuplicadas ? unicos(resultado) : resultado;
}

function segmentarFrases(bloco, idioma) {
  if (!bloco.trim()) return [];
  const segmentador = criarSegmentador(idioma, 'sentence');
  const partes = segmentador
    ? Array.from(segmentador.segment(bloco)).map((s) => s.segment)
    : bloco.match(/[^.!?;。！？]+(?:[.!?;。！？]+["'”’»)]*|$)/gu) || [bloco];

  // Ponto e vírgula também separa frases (comportamento das versões anteriores).
  return partes.flatMap((p) => p.split(/;\s*/u));
}

/**
 * Divide um texto longo em trechos curtos para a síntese de voz.
 * Navegadores como o Chrome interrompem falas muito longas (~15 s), então cada
 * frase é falada separadamente; frases muito longas são quebradas em vírgulas.
 * @returns {{texto: string, inicio: number, fim: number}[]} trechos com posição no texto original
 */
export function dividirParaLeitura(texto, { idioma, maxCaracteres = 220 } = {}) {
  const original = String(texto ?? '');
  if (!original.trim()) return [];

  const segmentador = criarSegmentador(idioma, 'sentence');
  let frases;
  if (segmentador) {
    frases = Array.from(segmentador.segment(original)).map((s) => ({
      texto: s.segment,
      inicio: s.index,
    }));
  } else {
    frases = [];
    const regex = /[^.!?。！？\n]+(?:[.!?。！？]+["'”’»)]*|\n|$)/gu;
    let m;
    while ((m = regex.exec(original)) !== null) {
      if (!m[0]) {
        regex.lastIndex++;
        continue;
      }
      frases.push({ texto: m[0], inicio: m.index });
    }
  }

  const trechos = [];
  for (const frase of frases) {
    // Quebras de linha separam parágrafos/títulos mesmo sem pontuação.
    let deslocamento = 0;
    for (const linha of frase.texto.split('\n')) {
      const inicioLinha = frase.inicio + deslocamento;
      deslocamento += linha.length + 1;
      for (const parte of quebrarLongo(linha, maxCaracteres)) {
        const semEspacoInicial = parte.texto.length - parte.texto.trimStart().length;
        const limpo = parte.texto.trim();
        if (!/[\p{L}\p{N}]/u.test(limpo)) continue;
        const inicio = inicioLinha + parte.inicio + semEspacoInicial;
        trechos.push({ texto: limpo, inicio, fim: inicio + limpo.length });
      }
    }
  }
  return trechos;
}

function quebrarLongo(texto, max) {
  if (texto.length <= max) return [{ texto, inicio: 0 }];
  const partes = [];
  let inicio = 0;
  while (inicio < texto.length) {
    let fim = Math.min(texto.length, inicio + max);
    if (fim < texto.length) {
      const janela = texto.slice(inicio, fim);
      const corte = Math.max(
        janela.lastIndexOf(', '),
        janela.lastIndexOf('; '),
        janela.lastIndexOf(': '),
        janela.lastIndexOf('、'),
        janela.lastIndexOf('，')
      );
      const espaco = janela.lastIndexOf(' ');
      if (corte > max * 0.4) fim = inicio + corte + 1;
      else if (espaco > max * 0.4) fim = inicio + espaco;
    }
    partes.push({ texto: texto.slice(inicio, fim), inicio });
    inicio = fim;
  }
  return partes;
}

export function contarPalavras(texto) {
  return extrairPalavras(texto, { removerDuplicadas: false }).length;
}

/**
 * A linha parece um título de seção? (curta, sem pontuação final e que não é
 * fala de diálogo). Usado no PDF (título em destaque) e no MP3 (pausa maior).
 */
export function pareceTitulo(linha) {
  const t = String(linha).trim();
  return (
    t.length > 0 &&
    t.length < 80 &&
    !/[.!?…:;,"'”)\]]$/u.test(t) &&
    !/^[\p{L}][\p{L} .'-]{0,23}:\s/u.test(t)
  );
}
