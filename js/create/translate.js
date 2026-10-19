/**
 * Tradução para o português, colocada no fim dos PDFs para revisar rápido.
 *
 * Fontes (ambas grátis), na ordem de preferência:
 * 1. Google Gemini (chave do usuário): traduz no contexto, com boa qualidade;
 * 2. Tradutor embutido do Chrome/Edge (API `Translator`, roda no aparelho, sem chave).
 *
 * O texto é traduzido parte por parte (cada parágrafo ou título), e as listas item
 * por item, para que cada tradução corresponda exatamente ao original.
 */

export const IDIOMA_TRADUCAO = 'pt';
/** Partes por pedido ao Gemini (textos de 2000 palavras cabem em 1–2 pedidos). */
const LOTE = 60;
/** Tempo máximo para o navegador preparar o tradutor (na 1ª vez ele baixa o pacote do idioma). */
export const LIMITE_PREPARO_MS = 45000;

/** Extrai JSON de uma resposta (aceita blocos ```json). */
export function lerJson(texto) {
  const limpo = String(texto || '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  return JSON.parse(limpo);
}

function base(idioma) {
  return String(idioma || 'en')
    .split('-')[0]
    .toLowerCase();
}

const INSTRUCOES = {
  itens:
    "Translate each item into Brazilian Portuguese, as a learner's dictionary would: the short, common meaning (for sentences, a natural translation).",
  texto:
    'These are consecutive parts (paragraphs and section titles) of one study text. Translate each part into natural, fluent Brazilian Portuguese, keeping the meaning and the tone of the whole text.',
};

/** Tradutor do Gemini. */
export function tradutorGemini(ia, idiomaOrigem) {
  return {
    nome: 'Gemini',
    async traduzirPartes(partes, { modo = 'itens', signal } = {}) {
      const resultado = [];
      for (let i = 0; i < partes.length; i += LOTE) {
        const lote = partes.slice(i, i + LOTE);
        const palavras = lote.join(' ').split(/\s+/).length;
        const resposta = await ia.gerar({
          mensagens: [
            {
              role: 'system',
              content: 'You are a precise translator for language learners. Answer only with JSON.',
            },
            {
              role: 'user',
              content: `${INSTRUCOES[modo]} The source language is ${idiomaOrigem}. Return a JSON array of strings with exactly ${lote.length} items, in the same order (one translation per item; do not merge or split items).\n\n${JSON.stringify(lote)}`,
            },
          ],
          maxTokens: Math.round(palavras * 2) + 200,
          temperatura: 0.2,
          json: true,
          signal,
        });
        const traducoes = lerJson(resposta);
        if (!Array.isArray(traducoes)) throw new Error('Resposta de tradução inválida.');
        lote.forEach((_, k) => resultado.push(String(traducoes[k] ?? '').trim()));
      }
      return resultado;
    },
  };
}

/**
 * Tradutor embutido do navegador (Chrome/Edge 138+), se disponível para o par de idiomas.
 * Retorna null se não houver; lança erro se o navegador demorar demais para prepará-lo.
 */
export async function tradutorNavegador(
  idiomaOrigem,
  { api = globalThis.Translator, limiteMs = LIMITE_PREPARO_MS } = {}
) {
  if (!api?.create) return null;
  const par = { sourceLanguage: base(idiomaOrigem), targetLanguage: IDIOMA_TRADUCAO };
  let disponibilidade;
  try {
    disponibilidade = await api.availability?.(par);
  } catch {
    return null;
  }
  if (disponibilidade === 'unavailable') return null;

  let limite;
  const tradutor = await Promise.race([
    api.create(par),
    new Promise((_, rejeitar) => {
      limite = setTimeout(
        () =>
          rejeitar(
            new Error(
              'o tradutor do navegador ainda está baixando o pacote do idioma; tente de novo em alguns minutos'
            )
          ),
        limiteMs
      );
    }),
  ]).finally(() => clearTimeout(limite));
  return {
    nome: 'Tradutor do navegador',
    async traduzirPartes(partes, { signal } = {}) {
      const resultado = [];
      for (const parte of partes) {
        if (signal?.aborted) throw new DOMException('Tradução cancelada.', 'AbortError');
        resultado.push(String(await tradutor.translate(parte)).trim());
      }
      return resultado;
    },
  };
}

/**
 * Obtém um tradutor disponível (Gemini, se configurado; senão o do navegador).
 * @returns {Promise<null | {nome: string, traduzirPartes: Function}>}
 */
export async function obterTradutor({ idioma, ia, api } = {}) {
  if (base(idioma) === IDIOMA_TRADUCAO) return null; // o material já está em português
  if (ia) return tradutorGemini(ia, idioma);
  return tradutorNavegador(idioma, { api });
}

/**
 * Traduz um texto mantendo a estrutura: cada linha não vazia (parágrafo ou título)
 * vira uma linha traduzida, e as linhas em branco ficam onde estavam.
 */
export async function traduzirTexto(texto, tradutor, { signal } = {}) {
  const linhas = String(texto).replace(/\r/g, '').split('\n');
  const indices = linhas.flatMap((l, i) => (l.trim() ? [i] : []));
  const traducoes = await tradutor.traduzirPartes(
    indices.map((i) => linhas[i].trim()),
    { modo: 'texto', signal }
  );
  const saida = [...linhas];
  indices.forEach((i, k) => (saida[i] = traducoes[k] || ''));
  return saida.join('\n');
}

/** Traduz uma lista de palavras ou frases, item por item, na mesma ordem. */
export function traduzirItens(itens, tradutor, { signal } = {}) {
  return tradutor.traduzirPartes(itens, { modo: 'itens', signal });
}
