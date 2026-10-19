/**
 * Busca de conteúdo na Wikipédia (API pública, gratuita e sem chave).
 *
 * O usuário pode digitar o tema em português ("economia") mesmo estudando inglês:
 * o tema é procurado também na Wikipédia em português e o artigo equivalente no
 * idioma de estudo é obtido pelos links interlínguas. Para iniciantes em inglês
 * é usada a Simple English Wikipedia, escrita para quem está aprendendo a língua.
 */

import { contarPalavras } from '../text/extract.js';

const SECOES_IGNORADAS =
  /^(see also|references|notes|external links|further reading|bibliography|sources|citations|footnotes|gallery|related pages|other websites|ver também|referências|notas|ligações externas|bibliografia|véase también|referencias|enlaces externos|voir aussi|références|liens externes|siehe auch|einzelnachweise|literatur|weblinks|voci correlate|note|collegamenti esterni)$/i;

export const LICENCA_WIKIPEDIA = 'CC BY-SA 4.0';

/** Código do site da Wikipédia para o idioma (e nível) de estudo. */
export function codigoWiki(idioma, nivel) {
  const base = String(idioma || 'en')
    .split('-')[0]
    .toLowerCase();
  if (base === 'en' && nivel === 'iniciante') return 'simple';
  return base;
}

export function urlArtigo(wiki, titulo) {
  return `https://${wiki}.wikipedia.org/wiki/${encodeURIComponent(titulo.replace(/ /g, '_'))}`;
}

async function consultar(wiki, parametros, fetchFn) {
  const params = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    origin: '*',
    ...parametros,
  });
  let resposta;
  try {
    resposta = await fetchFn(`https://${wiki}.wikipedia.org/w/api.php?${params}`);
  } catch {
    throw new Error('Sem conexão com a Wikipédia. Verifique sua internet.');
  }
  if (resposta.status === 429) {
    throw new Error(
      'A Wikipédia recebeu muitas buscas seguidas. Aguarde um minuto e tente de novo.'
    );
  }
  if (!resposta.ok) throw new Error(`A Wikipédia respondeu com erro (${resposta.status}).`);
  return resposta.json();
}

function tokens(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
}

/** Quanto do tema aparece no título (0 a 1). */
export function similaridade(tema, titulo) {
  const alvo = tokens(tema);
  if (!alvo.length) return 0;
  const doTitulo = new Set(tokens(titulo));
  return alvo.filter((t) => doTitulo.has(t)).length / alvo.length;
}

async function pesquisar(wiki, tema, fetchFn, limite = 5) {
  const dados = await consultar(
    wiki,
    { action: 'query', list: 'search', srsearch: tema, srlimit: String(limite) },
    fetchFn
  );
  return (dados.query?.search || []).map((s) => s.title);
}

async function linkInterlingua(wikiOrigem, titulo, wikiDestino, fetchFn) {
  const dados = await consultar(
    wikiOrigem,
    { action: 'query', prop: 'langlinks', titles: titulo, lllang: wikiDestino, redirects: '1' },
    fetchFn
  );
  return dados.query?.pages?.[0]?.langlinks?.[0]?.title || null;
}

/**
 * Encontra o artigo mais adequado para o tema.
 * @returns {Promise<{titulo: string, wiki: string, url: string, alternativas: string[]}>}
 */
export async function buscarArtigo(
  tema,
  { idioma = 'en-US', nivel, fetchFn = globalThis.fetch.bind(globalThis) } = {}
) {
  const termo = String(tema || '').trim();
  if (!termo) throw new Error('Informe um tema.');
  const destinos = [codigoWiki(idioma, nivel)];
  if (destinos[0] === 'simple') destinos.push('en'); // nem todo tema existe na Simple English

  for (const wiki of destinos) {
    const candidatos = [];
    const diretos = await pesquisar(wiki, termo, fetchFn);
    diretos.forEach((titulo, i) =>
      candidatos.push({ titulo, pontos: similaridade(termo, titulo) - i * 0.01 })
    );

    // Tema digitado em português: procura na Wikipédia em português e segue o link interlíngua.
    if (wiki !== 'pt') {
      const emPortugues = (await pesquisar('pt', termo, fetchFn, 1))[0];
      if (emPortugues) {
        const traduzido = await linkInterlingua('pt', emPortugues, wiki, fetchFn);
        if (traduzido)
          candidatos.push({ titulo: traduzido, pontos: similaridade(termo, emPortugues) + 0.005 });
      }
    }

    if (candidatos.length) {
      candidatos.sort((a, b) => b.pontos - a.pontos);
      const titulos = [...new Set(candidatos.map((c) => c.titulo))];
      return {
        titulo: titulos[0],
        wiki,
        url: urlArtigo(wiki, titulos[0]),
        // Só sugere alternativas que realmente têm a ver com o tema digitado.
        alternativas: [
          ...new Set(
            candidatos
              .slice(1)
              .filter((c) => c.pontos >= 0.3)
              .map((c) => c.titulo)
          ),
        ]
          .filter((t) => t !== titulos[0])
          .slice(0, 4),
      };
    }
  }
  throw new Error(
    `Nenhum artigo encontrado sobre "${termo}". Tente outro tema ou uma palavra mais comum.`
  );
}

/** Baixa o texto completo de um artigo (texto puro, com títulos de seção). */
export async function obterArtigo(
  titulo,
  wiki,
  { fetchFn = globalThis.fetch.bind(globalThis) } = {}
) {
  const dados = await consultar(
    wiki,
    {
      action: 'query',
      prop: 'extracts',
      explaintext: '1',
      exsectionformat: 'wiki',
      titles: titulo,
      redirects: '1',
    },
    fetchFn
  );
  const pagina = dados.query?.pages?.[0];
  if (!pagina || pagina.missing || !pagina.extract)
    throw new Error(`Artigo "${titulo}" não encontrado.`);
  return {
    titulo: pagina.title,
    wiki,
    url: urlArtigo(wiki, pagina.title),
    extrato: pagina.extract,
  };
}

/** Notas de navegação do topo dos artigos ("For the American sport, see ..."), que não são conteúdo. */
const NOTA_NAVEGACAO =
  /^(for (the|other|a|an) [^.]{0,80}, see\b|this article is about\b|not to be confused with\b|"[^"]{1,60}" redirects here\b|para outros significados|não confundir com\b)/i;

/**
 * Limpa o texto do artigo e o corta no tamanho pedido, mantendo a introdução e
 * as seções na ordem original.
 * @param {string} extrato
 * @param {object} [opcoes]
 * @param {number} [opcoes.maxPalavras]
 * @param {boolean} [opcoes.pularIntroducao] começa na primeira seção (para complementar outro texto)
 * @returns {string} texto com os títulos de seção em linhas próprias
 */
export function prepararArtigo(extrato, { maxPalavras = 900, pularIntroducao = false } = {}) {
  const linhas = String(extrato || '')
    .replace(/\r/g, '')
    .replace(/\{\\displaystyle[^}]*\}/g, '')
    .split('\n');

  const secoes = [{ titulo: null, nivel: 1, paragrafos: [] }];
  for (const linha of linhas) {
    const cabecalho = linha.match(/^(={2,6})\s*(.+?)\s*\1$/);
    if (cabecalho) {
      secoes.push({ titulo: cabecalho[2], nivel: cabecalho[1].length, paragrafos: [] });
    } else if (linha.trim() && !NOTA_NAVEGACAO.test(linha.trim())) {
      secoes.at(-1).paragrafos.push(linha.trim().replace(/\s{2,}/g, ' '));
    }
  }

  const partes = [];
  let palavras = 0;
  let ignorandoNivel = null;
  for (const secao of pularIntroducao ? secoes.slice(1) : secoes) {
    if (ignorandoNivel !== null && secao.nivel > ignorandoNivel) continue;
    ignorandoNivel = null;
    if (secao.titulo && SECOES_IGNORADAS.test(secao.titulo)) {
      ignorandoNivel = secao.nivel;
      continue;
    }
    if (!secao.paragrafos.length) {
      if (secao.titulo) partes.push({ titulo: secao.titulo, paragrafos: [] });
      continue;
    }
    // Segue parágrafo a parágrafo, sem pular nenhum, até atingir o tamanho pedido
    // (o tamanho é um mínimo: o último parágrafo entra inteiro).
    const bloco = { titulo: secao.titulo, paragrafos: [] };
    for (const paragrafo of secao.paragrafos) {
      bloco.paragrafos.push(paragrafo);
      palavras += contarPalavras(paragrafo);
      if (palavras >= maxPalavras) break;
    }
    if (bloco.paragrafos.length) partes.push(bloco);
    if (palavras >= maxPalavras) break;
  }

  // Remove títulos que ficaram sem conteúdo (ex.: seção-mãe sem texto seguida de corte).
  const texto = [];
  partes.forEach((parte, i) => {
    const temConteudoDepois =
      parte.paragrafos.length || partes.slice(i + 1).some((p) => p.paragrafos.length);
    if (parte.titulo && temConteudoDepois) texto.push(parte.titulo);
    texto.push(...parte.paragrafos);
  });
  return texto.join('\n\n').trim();
}
