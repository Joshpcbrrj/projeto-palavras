/**
 * Montagem dos pedidos (prompts) para a IA local e limpeza das respostas.
 *
 * Modelos pequenos seguem melhor instruções curtas, diretas e repetidas no fim.
 * Por isso cada pedido termina com o formato exato esperado.
 */

import { IDIOMAS } from '../config.js';
import { ORIENTACOES_NIVEL, TAMANHOS } from './levels.js';

/** Nome do idioma em inglês (os modelos entendem melhor instruções em inglês). */
const IDIOMA_EM_INGLES = {
  'en-US': 'American English',
  'en-GB': 'British English',
  'pt-BR': 'Brazilian Portuguese',
  'pt-PT': 'European Portuguese',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'zh-CN': 'Simplified Chinese',
  'ru-RU': 'Russian',
};

export function nomeIdiomaIngles(idioma) {
  return IDIOMA_EM_INGLES[idioma] || IDIOMAS[idioma]?.nome || 'English';
}

const MAX_PALAVRAS_REFERENCIA = 300;

/** Encurta o texto de referência para caber no contexto de modelos pequenos. */
export function resumirReferencia(texto, maxPalavras = MAX_PALAVRAS_REFERENCIA) {
  const palavras = String(texto || '')
    .split(/\s+/)
    .filter(Boolean);
  return palavras.length <= maxPalavras
    ? palavras.join(' ')
    : `${palavras.slice(0, maxPalavras).join(' ')} …`;
}

function sistema(idioma) {
  return [
    'You are an expert language teacher who writes original study material for learners.',
    `Always write the final text only in ${nomeIdiomaIngles(idioma)}.`,
    'Output only the requested text: no title, no introduction, no notes, no markdown, no translations.',
  ].join(' ');
}

function blocoReferencia(referencia) {
  if (!referencia?.texto) return '';
  return [
    `Reference information about the topic (from Wikipedia article "${referencia.titulo}"). Use these facts, but do NOT copy its sentences: rewrite the ideas in your own words at the requested level.`,
    '"""',
    resumirReferencia(referencia.texto),
    '"""',
  ].join('\n');
}

/**
 * Descreve o tema para a IA. Quando há um artigo da Wikipédia, usa o título dele
 * (já no idioma de estudo): modelos pequenos tendem a responder no idioma em que
 * o tema foi escrito, e o usuário costuma digitá-lo em português.
 */
function descreverTema(tema, referencia) {
  if (referencia?.titulo && referencia.titulo.toLowerCase() !== String(tema).toLowerCase()) {
    return `"${tema}" (related encyclopedia article: "${referencia.titulo}")`;
  }
  return `"${tema}"`;
}

const SINAIS_PORTUGUES =
  /[ãõçáéíóúâêôà]|\b(de|do|da|dos|das|num|numa|no|na|nos|nas|para|com|em|um|uma|os|as|pedir|fazer|como)\b/i;

/** O tema parece escrito em outro idioma (ex.: português) quando o texto é em inglês? */
export function temaPrecisaTraducao(tema, idioma) {
  // Sempre traduz quando há um tema: a detecção por palavras falha em casos como
  // "meio ambiente", e a IA devolve o próprio tema se ele já estiver no idioma certo.
  return Boolean(String(tema || '').trim() && idioma);
}

/** O tema tem sinais claros de português (usado para avisos). */
export function temaEmPortugues(tema) {
  return SINAIS_PORTUGUES.test(String(tema || ''));
}

/** Pedido curto para traduzir o tema antes de escrever o texto. */
export function promptTraduzirTema(tema, idioma) {
  const lingua = nomeIdiomaIngles(idioma);
  return {
    mensagens: [
      {
        role: 'system',
        content: `You translate short phrases into ${lingua}. Answer with the translation only.`,
      },
      {
        role: 'user',
        content: `Translate into ${lingua} (if it is already in ${lingua}, repeat it): "${tema}"`,
      },
    ],
    maxTokens: 40,
  };
}

/** Limpa a tradução do tema (primeira linha, sem aspas nem pontuação final). */
export function limparTraducaoTema(texto, original) {
  const linha = String(texto || '')
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  const limpa = (linha || '')
    .replace(/^(translation|tradução)\s*:\s*/i, '')
    .replace(/^["'“”]+|["'“”.!]+$/g, '')
    .trim();
  return limpa && limpa.length <= 100 ? limpa : original;
}

/** Última linha do pedido: modelos pequenos dão mais peso ao que vem no fim. */
function lembreteIdioma(idioma, reforcado) {
  const lingua = nomeIdiomaIngles(idioma);
  const base = `IMPORTANT: write the whole text in ${lingua} only, even if the topic or the reference is written in another language.`;
  return reforcado
    ? `${base} Your previous answer was in the wrong language. Every single sentence must be in ${lingua}.`
    : base;
}

function montar(idioma, partes, maxTokens) {
  return {
    mensagens: [
      { role: 'system', content: sistema(idioma) },
      { role: 'user', content: partes.filter(Boolean).join('\n\n') },
    ],
    maxTokens,
  };
}

/**
 * Pedido para criar um diálogo sobre o tema.
 * @param {{tema: string, idioma: string, nivel: string, tamanho?: string,
 *   referencia?: {titulo: string, texto: string}, reforcado?: boolean}} opcoes
 */
export function promptDialogo({
  tema,
  idioma,
  nivel,
  tamanho = 'medio',
  referencia,
  reforcado = false,
}) {
  const falas = TAMANHOS[tamanho]?.falas ?? TAMANHOS.medio.falas;
  return montar(
    idioma,
    [
      blocoReferencia(referencia),
      `Write a natural, realistic conversation between two people, Anna and Ben, about the topic ${descreverTema(tema, referencia)}.`,
      `Language level: ${ORIENTACOES_NIVEL[nivel]}`,
      `Write exactly ${falas} lines, alternating speakers, starting with Anna.`,
      'Make it useful for a learner: an everyday situation, questions and answers, and useful expressions. Do not repeat the same idea.',
      referencia
        ? 'Keep the conversation focused on the topic above; use the reference only for one or two interesting facts.'
        : '',
      'Format: every line must start with the speaker name followed by a colon, like this:\nAnna: ...\nBen: ...',
      lembreteIdioma(idioma, reforcado),
    ],
    falas * 60 + 100
  );
}

/** Pedido para criar um texto explicativo no nível escolhido. */
export function promptTextoNivel({
  tema,
  idioma,
  nivel,
  tamanho = 'medio',
  referencia,
  reforcado = false,
}) {
  const palavras = TAMANHOS[tamanho]?.palavras ?? TAMANHOS.medio.palavras;
  return montar(
    idioma,
    [
      blocoReferencia(referencia),
      `Write an interesting, informative text about the topic ${descreverTema(tema, referencia)}.`,
      `Language level: ${ORIENTACOES_NIVEL[nivel]}`,
      `Length: about ${palavras} words, in short paragraphs separated by a blank line. Do not repeat sentences or ideas.`,
      'Do not use headings, bullet points or numbered lists. Do not quote words from other languages.',
      'Write only the paragraphs.',
      lembreteIdioma(idioma, reforcado),
    ],
    Math.round(palavras * 1.8) + 100
  );
}

/** Pedido para reescrever um artigo (mergulho no tema) no nível escolhido. */
export function promptAdaptarArtigo({
  titulo,
  texto,
  idioma,
  nivel,
  maxPalavras = 700,
  reforcado = false,
  retorno = '',
}) {
  return montar(
    idioma,
    [
      retorno,
      `Rewrite the following article about "${titulo}" for a language learner.`,
      `Language level: ${ORIENTACOES_NIVEL[nivel]}`,
      `Keep the important facts, the origin/history and the main ideas. Keep the section titles on their own lines. Length: about ${maxPalavras} words.`,
      '"""',
      resumirReferencia(texto, 900),
      '"""',
      'Write only the rewritten article.',
      lembreteIdioma(idioma, reforcado),
    ],
    Math.round(maxPalavras * 1.8) + 150
  );
}

const PALAVRAS_FUNCIONAIS = {
  en: [
    'the',
    'and',
    'is',
    'are',
    'to',
    'of',
    'you',
    'it',
    'in',
    'that',
    'with',
    'for',
    'this',
    'what',
    'do',
  ],
  pt: [
    'o',
    'os',
    'de',
    'que',
    'não',
    'é',
    'um',
    'uma',
    'para',
    'com',
    'em',
    'da',
    'do',
    'você',
    'eu',
    'são',
  ],
  es: [
    'el',
    'los',
    'de',
    'que',
    'es',
    'un',
    'una',
    'para',
    'con',
    'en',
    'del',
    'y',
    'por',
    'usted',
    'yo',
    'muy',
  ],
  fr: [
    'le',
    'les',
    'de',
    'que',
    'est',
    'un',
    'une',
    'pour',
    'avec',
    'en',
    'des',
    'et',
    'vous',
    'je',
    'pas',
  ],
  de: [
    'der',
    'die',
    'das',
    'und',
    'ist',
    'ein',
    'eine',
    'für',
    'mit',
    'nicht',
    'ich',
    'sie',
    'zu',
    'auf',
  ],
  it: [
    'il',
    'gli',
    'di',
    'che',
    'è',
    'un',
    'una',
    'per',
    'con',
    'non',
    'della',
    'io',
    'sono',
    'anche',
  ],
};

/**
 * O texto parece estar no idioma pedido? Compara palavras funcionais comuns.
 * Para idiomas sem lista (japonês, russo...), não bloqueia.
 */
export function pareceIdioma(texto, idioma) {
  const alvo = String(idioma || 'en').split('-')[0];
  if (!PALAVRAS_FUNCIONAIS[alvo]) return true;
  const palavras = String(texto || '')
    .toLowerCase()
    .replace(/^[\p{L} .'-]{1,24}:\s+/gmu, '')
    .match(/\p{L}+/gu);
  if (!palavras || palavras.length < 8) return true;
  const contagem = Object.fromEntries(
    Object.entries(PALAVRAS_FUNCIONAIS).map(([lingua, lista]) => {
      const conjunto = new Set(lista);
      return [lingua, palavras.filter((p) => conjunto.has(p)).length];
    })
  );
  const melhor = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
  return melhor[0] === alvo || contagem[alvo] >= melhor[1] * 0.8;
}
const PREAMBULO =
  /^(sure|certainly|of course|here is|here's|here are|claro|aqui está|below is)\b[^\n]*[:.!]\s*$/i;

/**
 * Limpa a resposta da IA: remove markdown, frases introdutórias e comentários finais.
 * @param {string} texto
 * @param {'dialogo'|'texto'} formato
 */
export function limparResposta(texto, formato = 'texto') {
  let linhas = String(texto || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) =>
      l
        .replace(/^#{1,6}\s*/, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/^\s*[-*•]\s+/, '')
        .trimEnd()
    );

  while (linhas.length && (!linhas[0].trim() || PREAMBULO.test(linhas[0].trim()))) linhas.shift();
  while (linhas.length && !linhas.at(-1).trim()) linhas.pop();

  if (formato === 'dialogo') {
    linhas = linhas
      .map((l) =>
        l
          .trim()
          .replace(
            /^\*?([\p{L}][\p{L} .'-]{0,23}?)\*?\s*[:：]\s*/u,
            (_, nome) => `${nome.trim()}: `
          )
      )
      .filter((l) => /^[\p{L}][\p{L} .'-]{0,23}: \S/u.test(l));
    return linhas.join('\n');
  }

  // Remove notas finais típicas ("Note: ...", "(Word count: 300)").
  while (linhas.length && /^(\(?word count|note:|\(note)/i.test(linhas.at(-1).trim())) linhas.pop();
  return linhas
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
