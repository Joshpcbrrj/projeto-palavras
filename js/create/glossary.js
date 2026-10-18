/**
 * Tradução para o glossário dos PDFs: o material fica autossuficiente para quem
 * estuda sozinho, longe do app.
 *
 * Fontes (ambas grátis), na ordem de preferência:
 * 1. Google Gemini (chave do usuário): escolhe as palavras-chave do texto e traduz no contexto;
 * 2. Tradutor embutido do Chrome/Edge (API `Translator`, roda no aparelho, sem chave).
 */

import { extrairPalavras } from '../text/extract.js';

export const IDIOMA_TRADUCAO = 'pt';
const MAX_TERMOS_GLOSSARIO = 15;

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

/** Tradutor do Gemini. */
export function tradutorGemini(ia, idiomaOrigem) {
  return {
    nome: 'Gemini',
    async traduzirLista(itens, { signal } = {}) {
      const resultado = [];
      for (let i = 0; i < itens.length; i += 80) {
        const lote = itens.slice(i, i + 80);
        const resposta = await ia.gerar({
          mensagens: [
            {
              role: 'system',
              content: 'You are a precise translator for language learners. Answer only with JSON.',
            },
            {
              role: 'user',
              content: `Translate each item from ${idiomaOrigem} into Brazilian Portuguese, as a learner's dictionary would (short and common meaning). Return a JSON array of strings with exactly ${lote.length} items, in the same order.\n\n${JSON.stringify(lote)}`,
            },
          ],
          maxTokens: lote.length * 20 + 100,
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
    async criarGlossario(texto, { nivel = 'iniciante', signal } = {}) {
      const resposta = await ia.gerar({
        mensagens: [
          {
            role: 'system',
            content:
              'You are a language teacher who builds glossaries for learners. Answer only with JSON.',
          },
          {
            role: 'user',
            content: `From the text below, choose the ${MAX_TERMOS_GLOSSARIO} most useful words or short expressions for a ${nivel} learner (skip very common words and proper names). Translate each into Brazilian Portuguese with the meaning used in the text. Return a JSON array of objects like {"term": "...", "translation": "..."}, ordered as they appear in the text.\n\n"""${String(texto).slice(0, 6000)}"""`,
          },
        ],
        maxTokens: 900,
        temperatura: 0.2,
        json: true,
        signal,
      });
      const itens = lerJson(resposta);
      if (!Array.isArray(itens)) throw new Error('Resposta de glossário inválida.');
      return itens
        .map((i) => ({
          termo: String(i.term ?? i.termo ?? '').trim(),
          traducao: String(i.translation ?? i.traducao ?? '').trim(),
        }))
        .filter((i) => i.termo && i.traducao)
        .slice(0, MAX_TERMOS_GLOSSARIO);
    },
  };
}

/** Escolhe palavras-chave sem IA: as mais longas (tendem a ser as menos comuns), sem nomes próprios. */
export function escolherPalavrasChave(texto, idioma, maximo = MAX_TERMOS_GLOSSARIO) {
  const nomesProprios = new Set(
    (String(texto).match(/(?<=[a-z,;]\s)[A-Z][a-z]+/g) || []).map((p) => p.toLowerCase())
  );
  const candidatas = extrairPalavras(texto, { idioma, ignorarComuns: true }).filter(
    (p) => p.length >= 4 && !nomesProprios.has(p.toLowerCase()) && p === p.toLowerCase()
  );
  const escolhidas = new Set([...candidatas].sort((a, b) => b.length - a.length).slice(0, maximo));
  return candidatas.filter((p) => escolhidas.has(p)); // mantém a ordem do texto
}

/** Tempo máximo para o navegador preparar o tradutor (na 1ª vez ele baixa o pacote do idioma). */
export const LIMITE_PREPARO_MS = 45000;

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
    async traduzirLista(itens) {
      const resultado = [];
      for (const item of itens) resultado.push(String(await tradutor.translate(item)).trim());
      return resultado;
    },
    async criarGlossario(texto) {
      const termos = escolherPalavrasChave(texto, idiomaOrigem);
      const traducoes = await this.traduzirLista(termos);
      return termos
        .map((termo, i) => ({ termo, traducao: traducoes[i] }))
        .filter((i) => i.traducao);
    },
  };
}

/**
 * Obtém um tradutor disponível (Gemini, se configurado; senão o do navegador).
 * @returns {Promise<null | {nome: string, traduzirLista: Function, criarGlossario: Function}>}
 */
export async function obterTradutor({ idioma, ia, api } = {}) {
  if (base(idioma) === IDIOMA_TRADUCAO) return null; // o material já está em português
  if (ia) return tradutorGemini(ia, idioma);
  return tradutorNavegador(idioma, { api });
}

/**
 * Monta o glossário de um material.
 * - textos: palavras-chave escolhidas e traduzidas;
 * - palavras/frases: a tradução de cada item, na mesma ordem.
 * @returns {Promise<{termo: string, traducao: string}[]>}
 */
export async function montarGlossario(material, tradutor, { signal } = {}) {
  if (material.tipo === 'texto') {
    return tradutor.criarGlossario(material.texto, { nivel: material.nivel, signal });
  }
  const traducoes = await tradutor.traduzirLista(material.itens, { signal });
  return material.itens
    .map((termo, i) => ({ termo, traducao: traducoes[i] || '' }))
    .filter((g) => g.traducao);
}
