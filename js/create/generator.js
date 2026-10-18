/**
 * Criação de textos de estudo em três modos:
 * - "dialogo": conversa entre duas pessoas sobre o tema;
 * - "mergulho": conteúdo explicativo de 1–2 páginas (Wikipédia, opcionalmente adaptado pela IA);
 * - "nivel": texto sobre o tema escrito para o nível escolhido.
 *
 * A Wikipédia fornece os fatos; a IA (Gemini) reescreve no formato e no nível pedidos.
 */

import { IDIOMAS, NIVEIS } from '../config.js';
import { TAMANHOS, analisarTexto } from './levels.js';
import {
  limparResposta,
  pareceIdioma,
  promptAdaptarArtigo,
  promptDialogo,
  promptTextoNivel,
} from './prompts.js';
import { LICENCA_WIKIPEDIA, buscarArtigo, obterArtigo, prepararArtigo } from './wikipedia.js';

export const MODOS = Object.freeze({
  DIALOGO: 'dialogo',
  MERGULHO: 'mergulho',
  NIVEL: 'nivel',
});

/** Tamanho do conteúdo do "mergulho" (em palavras): curto ≈ meia página, longo ≈ 2 páginas. */
const PALAVRAS_MERGULHO = { curto: 300, medio: 550, longo: 1000 };

function fonteWikipedia(artigo) {
  return { nome: 'Wikipédia', titulo: artigo.titulo, url: artigo.url, licenca: LICENCA_WIKIPEDIA };
}

async function buscarReferencia({ tema, idioma, nivel, fetchFn, aoEtapa, maxPalavras = 700 }) {
  aoEtapa?.('Buscando informações na Wikipédia…');
  const encontrado = await buscarArtigo(tema, { idioma, nivel, fetchFn });
  const artigo = await obterArtigo(encontrado.titulo, encontrado.wiki, { fetchFn });
  return {
    ...artigo,
    alternativas: encontrado.alternativas,
    texto: prepararArtigo(artigo.extrato, { maxPalavras }),
  };
}

/**
 * Cria um texto de estudo.
 * @param {object} opcoes
 * @param {'dialogo'|'mergulho'|'nivel'} opcoes.modo
 * @param {string} opcoes.tema
 * @param {string} opcoes.idioma idioma do texto (ex.: 'en-US')
 * @param {'iniciante'|'intermediario'|'fluente'} opcoes.nivel
 * @param {'curto'|'medio'|'longo'} [opcoes.tamanho]
 * @param {boolean} [opcoes.usarWikipedia=true] usar a Wikipédia como base de fatos
 * @param {boolean} [opcoes.usarIA=true] usar a IA (se `ia` foi informado)
 * @param {{gerar: Function}} [opcoes.ia] motor de IA carregado
 * @param {Function} [opcoes.fetchFn]
 * @param {(etapa: string) => void} [opcoes.aoEtapa]
 * @param {(parcial: string) => void} [opcoes.aoTexto]
 * @param {AbortSignal} [opcoes.signal]
 */
export async function criarTexto({
  modo,
  tema,
  idioma = 'en-US',
  nivel = 'iniciante',
  tamanho = 'medio',
  usarWikipedia = true,
  usarIA = true,
  ia,
  fetchFn = globalThis.fetch?.bind(globalThis),
  aoEtapa,
  aoTexto,
  signal,
}) {
  const assunto = String(tema || '').trim();
  if (!assunto) throw new Error('Informe um tema.');
  if (!NIVEIS[nivel]) throw new Error('Nível inválido.');
  const iaDisponivel = Boolean(usarIA && ia);

  if (modo === MODOS.MERGULHO) {
    const maxPalavras = PALAVRAS_MERGULHO[tamanho] ?? PALAVRAS_MERGULHO.medio;
    const artigo = await buscarReferencia({
      tema: assunto,
      idioma,
      nivel,
      fetchFn,
      aoEtapa,
      maxPalavras,
    });
    let texto = artigo.texto;
    if (iaDisponivel) {
      aoEtapa?.(`Adaptando o conteúdo para o nível ${NIVEIS[nivel].nome.toLowerCase()}…`);
      try {
        texto = await gerarNoIdioma({
          ia,
          idioma,
          formato: 'texto',
          construir: (reforcado) =>
            promptAdaptarArtigo({
              titulo: artigo.titulo,
              texto: artigo.texto,
              idioma,
              nivel,
              maxPalavras,
              reforcado,
            }),
          aoTexto,
          aoEtapa,
          signal,
        });
      } catch (erro) {
        if (erro?.name === 'AbortError') throw erro;
        aoEtapa?.('Não foi possível adaptar; mostrando o artigo original.');
        aoTexto?.(artigo.texto);
        texto = artigo.texto;
      }
    } else {
      aoTexto?.(texto);
    }
    return resultado({
      modo,
      titulo: artigo.titulo,
      texto,
      idioma,
      nivel,
      fonte: fonteWikipedia(artigo),
      geradoPorIA: iaDisponivel,
      alternativas: artigo.alternativas,
    });
  }

  if (modo !== MODOS.DIALOGO && modo !== MODOS.NIVEL) throw new Error('Modo de criação inválido.');

  let referencia = null;
  if (usarWikipedia) {
    try {
      // Para iniciante e intermediário, a referência vem da Simple English Wikipedia:
      // artigos complexos levam modelos pequenos a escrever acima do nível pedido.
      const nivelReferencia = nivel === 'fluente' ? 'fluente' : 'iniciante';
      referencia = await buscarReferencia({
        tema: assunto,
        idioma,
        nivel: nivelReferencia,
        fetchFn,
        aoEtapa,
      });
    } catch (erro) {
      // Sem Wikipédia (offline ou tema não encontrado): a IA escreve sozinha.
      aoEtapa?.(`${erro.message} Continuando só com a IA…`);
    }
  }

  if (!iaDisponivel) {
    if (modo === MODOS.NIVEL && referencia) {
      // Sem IA: entrega o artigo da Wikipédia do nível mais próximo (Simple English para iniciantes).
      const texto = prepararArtigo(referencia.extrato, {
        maxPalavras: TAMANHOS[tamanho]?.palavras ?? TAMANHOS.medio.palavras,
      });
      aoTexto?.(texto);
      return resultado({
        modo,
        titulo: referencia.titulo,
        texto,
        idioma,
        nivel,
        fonte: fonteWikipedia(referencia),
        geradoPorIA: false,
      });
    }
    throw new Error(
      'Este modo precisa de IA. Configure a chave gratuita do Gemini no painel acima.'
    );
  }

  aoEtapa?.(modo === MODOS.DIALOGO ? 'Escrevendo o diálogo…' : 'Escrevendo o texto…');
  const opcoes = { tema: assunto, idioma, nivel, tamanho, referencia };
  const formato = modo === MODOS.DIALOGO ? 'dialogo' : 'texto';
  let texto = await gerarNoIdioma({
    ia,
    idioma,
    formato,
    temperatura: modo === MODOS.DIALOGO ? 0.8 : 0.7,
    construir: (reforcado) =>
      modo === MODOS.DIALOGO
        ? promptDialogo({ ...opcoes, reforcado })
        : promptTextoNivel({ ...opcoes, reforcado }),
    aoTexto,
    aoEtapa,
    signal,
  });
  if (modo === MODOS.DIALOGO && texto.split('\n').length < 4) {
    throw new Error('A IA não conseguiu montar um diálogo válido. Tente de novo.');
  }
  if (!texto.trim()) throw new Error('A IA não gerou texto. Tente novamente.');

  if (modo === MODOS.NIVEL) {
    texto = await simplificarSeNecessario({
      ia,
      texto,
      tema: assunto,
      idioma,
      nivel,
      tamanho,
      aoTexto,
      aoEtapa,
      signal,
    });
  }

  const prefixo = modo === MODOS.DIALOGO ? 'Diálogo' : 'Texto';
  return resultado({
    modo,
    titulo: `${prefixo}: ${assunto}`,
    texto,
    idioma,
    nivel,
    fonte: referencia ? fonteWikipedia(referencia) : null,
    geradoPorIA: true,
  });
}

/**
 * Gera com a IA e confere se o texto saiu no idioma pedido; se não, tenta mais
 * uma vez com a instrução reforçada (modelos pequenos às vezes respondem no
 * idioma em que o tema foi digitado).
 */
async function gerarNoIdioma({
  ia,
  idioma,
  formato,
  construir,
  temperatura = 0.7,
  aoTexto,
  aoEtapa,
  signal,
}) {
  for (const reforcado of [false, true]) {
    const pedido = construir(reforcado);
    const resposta = await ia.gerar({
      mensagens: pedido.mensagens,
      maxTokens: pedido.maxTokens,
      temperatura,
      aoTexto,
      signal,
    });
    if (signal?.aborted) throw new DOMException('Criação cancelada.', 'AbortError');
    const texto = limparResposta(resposta, formato);
    if (pareceIdioma(texto, idioma)) return texto;
    if (!reforcado)
      aoEtapa?.(
        `O texto saiu em outro idioma. Tentando de novo em ${IDIOMAS[idioma]?.nome || idioma}…`
      );
  }
  throw new Error(
    `A IA não conseguiu escrever em ${IDIOMAS[idioma]?.nome || idioma}. Tente de novo.`
  );
}

const ORDEM_NIVEL = { iniciante: 0, intermediario: 1, fluente: 2 };
const MAX_PALAVRAS_FRASE = { iniciante: 10, intermediario: 16 };

/**
 * Modelos pequenos costumam escrever acima do nível pedido. Se a métrica de
 * legibilidade indicar isso, pede uma reescrita mais simples (uma vez) e fica
 * com a versão que estiver mais próxima do nível.
 */
async function simplificarSeNecessario({
  ia,
  texto,
  tema,
  idioma,
  nivel,
  tamanho,
  aoTexto,
  aoEtapa,
  signal,
}) {
  if (!String(idioma).startsWith('en') || !(nivel in MAX_PALAVRAS_FRASE)) return texto;
  const antes = analisarTexto(texto);
  if (ORDEM_NIVEL[antes.nivelEstimado] <= ORDEM_NIVEL[nivel]) return texto;

  aoEtapa?.('O texto ficou difícil demais para o nível escolhido. Simplificando…');
  const pedido = promptAdaptarArtigo({
    titulo: tema,
    texto,
    idioma,
    nivel,
    maxPalavras: TAMANHOS[tamanho]?.palavras ?? TAMANHOS.medio.palavras,
    retorno: `The previous version was too difficult (about ${Math.round(antes.palavrasPorFrase)} words per sentence). Use sentences of at most ${MAX_PALAVRAS_FRASE[nivel]} words and only common words.`,
  });
  try {
    const resposta = await ia.gerar({
      mensagens: pedido.mensagens,
      maxTokens: pedido.maxTokens,
      temperatura: 0.5,
      aoTexto,
      signal,
    });
    const simplificado = limparResposta(resposta, 'texto');
    if (!simplificado || !pareceIdioma(simplificado, idioma)) return texto;
    return analisarTexto(simplificado).facilidade > antes.facilidade ? simplificado : texto;
  } catch (erro) {
    if (erro?.name === 'AbortError') throw erro;
    return texto;
  }
}

function resultado(dados) {
  return { ...dados, analise: dados.idioma.startsWith('en') ? analisarTexto(dados.texto) : null };
}
