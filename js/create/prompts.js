/**
 * Montagem dos pedidos (prompts) para a IA e limpeza das respostas.
 *
 * Modelos pequenos seguem melhor instruções curtas, diretas e repetidas no fim.
 * Por isso cada pedido termina com o formato exato esperado.
 */

import { IDIOMAS } from '../config.js';
import { ORIENTACOES_NIVEL, tamanhoDoNivel } from './levels.js';

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

/** Referência usada em diálogos e textos por nível (fatos de apoio, não o texto todo). */
const MAX_PALAVRAS_REFERENCIA = 600;
/** Artigo enviado para adaptação: precisa ter material para textos de até 2000 palavras. */
const MAX_PALAVRAS_ARTIGO = 2500;

/** Tokens de saída necessários para ≈ N palavras (com folga). */
const tokensPara = (palavras) => Math.round(palavras * 1.7) + 200;

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
 * Pedido para criar um diálogo sobre o tema. O tamanho vem do nível
 * (ou de `palavras`, se informado).
 * @param {{tema: string, idioma: string, nivel: string, palavras?: number,
 *   referencia?: {titulo: string, texto: string}, reforcado?: boolean}} opcoes
 */
export function promptDialogo({ tema, idioma, nivel, palavras, referencia, reforcado = false }) {
  const alvo = tamanhoDoNivel(nivel);
  const total = palavras ?? alvo.palavras;
  const falas = Math.max(4, Math.round((total / alvo.palavras) * alvo.falas));
  return montar(
    idioma,
    [
      blocoReferencia(referencia),
      `Write a long, natural, realistic conversation between two people, Anna and Ben, about the topic ${descreverTema(tema, referencia)}.`,
      `Language level: ${ORIENTACOES_NIVEL[nivel]}`,
      `Length: at least ${total} words in total, in about ${falas} lines, alternating speakers, starting with Anna. Do not stop early.`,
      'Make it useful for a learner: an everyday situation that develops step by step, questions and answers, opinions, small problems and how they are solved, and many useful expressions. Do not repeat the same idea.',
      referencia
        ? 'Keep the conversation focused on the topic above; use the reference only for a few interesting facts.'
        : '',
      'Format: every line must start with the speaker name followed by a colon, like this:\nAnna: ...\nBen: ...',
      lembreteIdioma(idioma, reforcado),
    ],
    tokensPara(total)
  );
}

/** Pedido para criar um texto explicativo no nível escolhido. */
export function promptTextoNivel({ tema, idioma, nivel, palavras, referencia, reforcado = false }) {
  const total = palavras ?? tamanhoDoNivel(nivel).palavras;
  return montar(
    idioma,
    [
      blocoReferencia(referencia),
      `Write an interesting, informative study text about the topic ${descreverTema(tema, referencia)}.`,
      `Language level: ${ORIENTACOES_NIVEL[nivel]}`,
      `Length: at least ${total} words. Do not stop early. Cover the topic in depth: what it is, its history or origin, how it works, examples from everyday life, advantages and problems, and the future.`,
      'Organize the text in short paragraphs separated by a blank line. Every few paragraphs, add a short section title on its own line (plain text, no markdown, no numbers). Do not repeat sentences or ideas.',
      'Do not use bullet points or numbered lists. Do not quote words from other languages.',
      lembreteIdioma(idioma, reforcado),
    ],
    tokensPara(total)
  );
}

/** Pedido para reescrever um artigo (mergulho no tema) no nível escolhido. */
export function promptAdaptarArtigo({
  titulo,
  texto,
  idioma,
  nivel,
  palavras,
  reforcado = false,
  retorno = '',
}) {
  const total = palavras ?? tamanhoDoNivel(nivel).palavras;
  return montar(
    idioma,
    [
      retorno,
      `Rewrite the following article about "${titulo}" as a study text for a language learner.`,
      `Language level: ${ORIENTACOES_NIVEL[nivel]}`,
      `Keep the important facts, the origin/history and the main ideas. Keep the section titles on their own lines (plain text). Length: at least ${total} words — if the article is short, explain the ideas in more detail with examples from everyday life, using what you know about the topic.`,
      '"""',
      resumirReferencia(texto, MAX_PALAVRAS_ARTIGO),
      '"""',
      'Write only the rewritten article.',
      lembreteIdioma(idioma, reforcado),
    ],
    tokensPara(total)
  );
}

/**
 * Pedido para continuar um texto que ficou mais curto que o pedido
 * (os modelos costumam parar antes do tamanho pedido em textos longos).
 */
export function promptContinuar({ texto, formato, idioma, nivel, faltam }) {
  const dialogo = formato === 'dialogo';
  return montar(
    idioma,
    [
      dialogo
        ? 'Here is the beginning of a conversation between Anna and Ben, written as study material:'
        : 'Here is the beginning of a study text:',
      '"""',
      texto,
      '"""',
      dialogo
        ? `Continue the conversation with about ${faltam} more words, in the same format (every line starts with "Anna:" or "Ben:"). Develop the situation with new questions, details and useful expressions, and end the conversation naturally.`
        : `Continue the text with about ${faltam} more words. Add new information and examples, with short section titles on their own lines (plain text), and finish with a short conclusion.`,
      `Language level: ${ORIENTACOES_NIVEL[nivel]}`,
      'Do not repeat anything that is already written. Write only the continuation, starting right after the last sentence.',
      lembreteIdioma(idioma, false),
    ],
    tokensPara(faltam)
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
