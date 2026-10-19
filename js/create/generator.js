/**
 * Criação de textos de estudo em três modos:
 * - "dialogo": conversa entre duas pessoas sobre o tema;
 * - "mergulho": conteúdo explicativo baseado na Wikipédia (opcionalmente adaptado pela IA);
 * - "nivel": texto sobre o tema escrito para o nível escolhido.
 *
 * O nível define a dificuldade e o tamanho (iniciante 700, intermediário 1200 e
 * fluente 2000 palavras). A Wikipédia fornece os fatos; a IA (Gemini) reescreve
 * no formato e no nível pedidos e completa o texto se ele sair curto.
 */

import { IDIOMAS, NIVEIS } from '../config.js';
import { contarPalavras } from '../text/extract.js';
import { analisarTexto, tamanhoDoNivel } from './levels.js';
import {
  limparResposta,
  pareceIdioma,
  promptAdaptarArtigo,
  promptContinuar,
  promptDialogo,
  promptTextoNivel,
} from './prompts.js';
import { LICENCA_WIKIPEDIA, buscarArtigo, obterArtigo, prepararArtigo } from './wikipedia.js';

export const MODOS = Object.freeze({
  DIALOGO: 'dialogo',
  MERGULHO: 'mergulho',
  NIVEL: 'nivel',
});

/** O tamanho do nível é um mínimo: abaixo dele, o texto é considerado curto. */
const FRACAO_MINIMA = 1;
/** Ao continuar um texto, pede pelo menos isto (pedidos muito pequenos rendem pouco). */
const MIN_PALAVRAS_CONTINUACAO = 150;
/** Quantas vezes, no máximo, a IA é chamada para continuar um texto curto. */
const MAX_CONTINUACOES = 3;
/** Referência (fatos de apoio) para diálogos e textos por nível. */
const PALAVRAS_REFERENCIA = 900;
/** Teto do artigo enviado à IA para adaptação. */
const MAX_PALAVRAS_ARTIGO = 2500;

function fonteWikipedia(referencia) {
  const fonte = {
    nome: 'Wikipédia',
    titulo: referencia.titulo,
    url: referencia.url,
    licenca: LICENCA_WIKIPEDIA,
  };
  if (referencia.complemento) {
    fonte.titulo = `${referencia.titulo} (Simple English) e ${referencia.complemento.titulo} (English)`;
  }
  return fonte;
}

/**
 * Busca o artigo e prepara até `palavras` palavras. Artigos da Simple English
 * costumam ser curtos (às vezes 200–600 palavras); nesse caso o texto é completado
 * com as seções do mesmo artigo na Wikipédia em inglês normal.
 */
async function buscarReferencia({ tema, idioma, nivel, fetchFn, aoEtapa, palavras }) {
  aoEtapa?.('Buscando informações na Wikipédia…');
  const encontrado = await buscarArtigo(tema, { idioma, nivel, fetchFn });
  const artigo = await obterArtigo(encontrado.titulo, encontrado.wiki, { fetchFn });
  const texto = prepararArtigo(artigo.extrato, { maxPalavras: palavras });
  const referencia = { ...artigo, alternativas: encontrado.alternativas, texto, complemento: null };

  const tamanho = contarPalavras(texto);
  if (artigo.wiki === 'simple' && tamanho < palavras * FRACAO_MINIMA) {
    try {
      aoEtapa?.('O artigo em inglês simples é curto. Completando com a Wikipédia em inglês…');
      const completo = await obterArtigo(artigo.titulo, 'en', { fetchFn });
      const extra = prepararArtigo(completo.extrato, {
        maxPalavras: palavras - tamanho,
        pularIntroducao: true,
      });
      if (extra) {
        referencia.texto = `${texto}\n\n${extra}`;
        referencia.complemento = completo;
      }
    } catch {
      // Sem o artigo equivalente em inglês: segue só com o da Simple English.
    }
  }
  return referencia;
}

/** Aviso para textos da Wikipédia entregues sem IA (mais difíceis ou mais curtos que o pedido). */
function avisoSemIA(referencia, palavras, nivel) {
  const total = contarPalavras(referencia.texto);
  if (total < palavras * FRACAO_MINIMA) {
    return `A Wikipédia só tem ${total} palavras sobre “${referencia.titulo}” (o nível pede ${palavras}). Para um texto maior, configure a IA (Gemini) ou escolha um tema mais amplo.`;
  }
  // Só para iniciantes a Wikipédia normal é "mais difícil" que o esperado.
  if (referencia.complemento && nivel === 'iniciante') {
    return 'O artigo em inglês simples era curto: a parte final veio da Wikipédia em inglês normal, que é mais difícil. Com a IA (Gemini) configurada, o texto todo sai no nível escolhido.';
  }
  return '';
}

/**
 * Cria um texto de estudo.
 * @param {object} opcoes
 * @param {'dialogo'|'mergulho'|'nivel'} opcoes.modo
 * @param {string} opcoes.tema
 * @param {string} opcoes.idioma idioma do texto (ex.: 'en-US')
 * @param {'iniciante'|'intermediario'|'fluente'} opcoes.nivel define a dificuldade e o tamanho
 * @param {number} [opcoes.palavras] tamanho alvo (padrão: o do nível)
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
  palavras,
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
  const alvo = palavras ?? tamanhoDoNivel(nivel).palavras;
  const completar = (texto, formato) =>
    garantirTamanho({
      ia,
      texto,
      formato,
      idioma,
      nivel,
      palavras: alvo,
      aoTexto,
      aoEtapa,
      signal,
    });

  if (modo === MODOS.MERGULHO) {
    const artigo = await buscarReferencia({
      tema: assunto,
      idioma,
      nivel,
      fetchFn,
      aoEtapa,
      // A IA recebe mais material do que vai escrever, para não precisar inventar.
      palavras: iaDisponivel ? Math.min(MAX_PALAVRAS_ARTIGO, Math.round(alvo * 1.3)) : alvo,
    });
    let texto = artigo.texto;
    let aviso = '';
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
              palavras: alvo,
              reforcado,
            }),
          aoTexto,
          aoEtapa,
          signal,
        });
        texto = await completar(texto, 'texto');
      } catch (erro) {
        if (erro?.name === 'AbortError') throw erro;
        aoEtapa?.('Não foi possível adaptar; mostrando o artigo original.');
        texto = prepararArtigo(artigo.texto, { maxPalavras: alvo });
        aoTexto?.(texto);
        aviso = avisoSemIA({ ...artigo, texto }, alvo, nivel);
      }
    } else {
      aoTexto?.(texto);
      aviso = avisoSemIA(artigo, alvo, nivel);
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
      aviso,
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
        // Sem IA, o próprio artigo vira o texto; com IA, é só a base de fatos.
        palavras: iaDisponivel ? PALAVRAS_REFERENCIA : alvo,
      });
    } catch (erro) {
      // Sem Wikipédia (offline ou tema não encontrado): a IA escreve sozinha.
      aoEtapa?.(`${erro.message} Continuando só com a IA…`);
    }
  }

  if (!iaDisponivel) {
    if (modo === MODOS.NIVEL && referencia) {
      // Sem IA: entrega o artigo da Wikipédia do nível mais próximo (Simple English para iniciantes).
      aoTexto?.(referencia.texto);
      return resultado({
        modo,
        titulo: referencia.titulo,
        texto: referencia.texto,
        idioma,
        nivel,
        fonte: fonteWikipedia(referencia),
        geradoPorIA: false,
        aviso: avisoSemIA(referencia, alvo, nivel),
      });
    }
    throw new Error(
      'Este modo precisa de IA. Configure a chave gratuita do Gemini no painel acima.'
    );
  }

  aoEtapa?.(modo === MODOS.DIALOGO ? 'Escrevendo o diálogo…' : 'Escrevendo o texto…');
  const opcoes = { tema: assunto, idioma, nivel, palavras: alvo, referencia };
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
      palavras: alvo,
      aoTexto,
      aoEtapa,
      signal,
    });
  }
  texto = await completar(texto, formato);

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
  palavras,
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
    palavras,
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

/**
 * Os modelos costumam parar antes do tamanho pedido em textos longos. Enquanto o
 * texto tiver menos palavras que o nível pede, pede para a IA continuar
 * (até 3 vezes), sem repetir o que já foi escrito.
 */
async function garantirTamanho({
  ia,
  texto,
  formato,
  idioma,
  nivel,
  palavras,
  aoTexto,
  aoEtapa,
  signal,
}) {
  const separador = formato === 'dialogo' ? '\n' : '\n\n';
  let atual = texto;
  for (let rodada = 0; rodada < MAX_CONTINUACOES; rodada++) {
    const total = contarPalavras(atual);
    if (total >= palavras * FRACAO_MINIMA) break;
    aoEtapa?.(`O texto tem ${total} de ${palavras} palavras. Continuando a escrever…`);
    const pedido = promptContinuar({
      texto: atual,
      formato,
      idioma,
      nivel,
      faltam: Math.max(palavras - total, MIN_PALAVRAS_CONTINUACAO),
    });
    let resposta;
    try {
      resposta = await ia.gerar({
        mensagens: pedido.mensagens,
        maxTokens: pedido.maxTokens,
        temperatura: 0.7,
        aoTexto: (parcial) => aoTexto?.(`${atual}${separador}${parcial}`),
        signal,
      });
    } catch (erro) {
      if (erro?.name === 'AbortError') throw erro;
      break; // fica com o que já tem
    }
    const extra = limparResposta(resposta, formato);
    const repetido = extra && atual.includes(extra.slice(0, 80));
    if (!extra || repetido || !pareceIdioma(extra, idioma) || contarPalavras(extra) < 20) break;
    atual = `${atual}${separador}${extra}`;
  }
  aoTexto?.(atual);
  return atual;
}

function resultado(dados) {
  return { ...dados, analise: dados.idioma.startsWith('en') ? analisarTexto(dados.texto) : null };
}
