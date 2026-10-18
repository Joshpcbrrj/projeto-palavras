import { describe, expect, test, vi } from 'vitest';
import { analisarTexto, contarSilabas } from '../js/create/levels.js';
import {
  buscarArtigo,
  codigoWiki,
  obterArtigo,
  prepararArtigo,
  similaridade,
} from '../js/create/wikipedia.js';
import {
  limparResposta,
  promptAdaptarArtigo,
  promptDialogo,
  promptTextoNivel,
  limparTraducaoTema,
  pareceIdioma,
  resumirReferencia,
  temaPrecisaTraducao,
} from '../js/create/prompts.js';
import { MODOS, criarTexto } from '../js/create/generator.js';
import { idModelo, verificarSuporte } from '../js/create/llm.js';

/** Simula a API da Wikipédia respondendo conforme os parâmetros da URL. */
function wikipediaFalsa({ buscas = {}, links = {}, artigos = {} } = {}) {
  const chamadas = [];
  const fetchFn = vi.fn(async (url) => {
    const u = new URL(url);
    const wiki = u.hostname.split('.')[0];
    const p = Object.fromEntries(u.searchParams);
    chamadas.push({ wiki, ...p });
    let corpo = {};
    if (p.list === 'search') {
      corpo = {
        query: { search: (buscas[`${wiki}:${p.srsearch}`] || []).map((title) => ({ title })) },
      };
    } else if (p.prop === 'langlinks') {
      const destino = links[`${wiki}:${p.titles}:${p.lllang}`];
      corpo = {
        query: {
          pages: [
            {
              title: p.titles,
              langlinks: destino ? [{ lang: p.lllang, title: destino }] : undefined,
            },
          ],
        },
      };
    } else if (p.prop === 'extracts') {
      const extrato = artigos[`${wiki}:${p.titles}`];
      corpo = {
        query: {
          pages: [
            extrato ? { title: p.titles, extract: extrato } : { title: p.titles, missing: true },
          ],
        },
      };
    }
    return { ok: true, status: 200, json: async () => corpo };
  });
  return { fetchFn, chamadas };
}

const ARTIGO = [
  'Economics is the study of how people use resources.',
  '',
  '== History ==',
  'People have traded goods for thousands of years. Money was invented to make trade easier.',
  '=== Modern times ===',
  'Today economies are connected around the world.',
  '== See also ==',
  'Money',
  '== References ==',
  '1. Some book',
].join('\n');

describe('níveis e legibilidade', () => {
  test('conta sílabas de forma aproximada', () => {
    expect(contarSilabas('cat')).toBe(1);
    expect(contarSilabas('table')).toBe(2);
    expect(contarSilabas('economy')).toBe(4);
  });

  test('texto simples parece iniciante e texto complexo parece fluente', () => {
    const facil = 'I have a cat. The cat is black. It likes milk. We play in the park.';
    const dificil =
      'Notwithstanding considerable macroeconomic volatility, contemporary governmental institutions systematically implemented comprehensive regulatory frameworks, fundamentally transforming international financial intermediation.';
    expect(analisarTexto(facil).nivelEstimado).toBe('iniciante');
    expect(analisarTexto(dificil).nivelEstimado).toBe('fluente');
  });

  test('ignora os nomes dos falantes em diálogos', () => {
    expect(analisarTexto('Anna: Hi there.\nBen: Hello.').palavras).toBe(3);
  });
});

describe('Wikipédia', () => {
  test('iniciantes em inglês usam a Simple English Wikipedia', () => {
    expect(codigoWiki('en-US', 'iniciante')).toBe('simple');
    expect(codigoWiki('en-GB', 'fluente')).toBe('en');
    expect(codigoWiki('es-ES', 'iniciante')).toBe('es');
    expect(codigoWiki('zh-CN')).toBe('zh');
  });

  test('similaridade ignora acentos e maiúsculas', () => {
    expect(similaridade('Inteligência Artificial', 'Inteligencia artificial')).toBe(1);
    expect(similaridade('economia', 'URSAL')).toBe(0);
  });

  test('tema em português encontra o artigo em inglês pelo link interlíngua', async () => {
    const { fetchFn } = wikipediaFalsa({
      buscas: { 'en:economia': ['URSAL', 'Itaipu Dam'], 'pt:economia': ['Economia'] },
      links: { 'pt:Economia:en': 'Economics' },
    });
    const achado = await buscarArtigo('economia', { idioma: 'en-US', nivel: 'fluente', fetchFn });
    expect(achado).toMatchObject({ titulo: 'Economics', wiki: 'en' });
    expect(achado.url).toBe('https://en.wikipedia.org/wiki/Economics');
    expect(achado.alternativas).not.toContain('URSAL'); // resultados sem relação não são sugeridos
  });

  test('tema em inglês continua usando a busca direta', async () => {
    const { fetchFn } = wikipediaFalsa({
      buscas: {
        'simple:space travel': ['Space travel', 'Outer space'],
        'pt:space travel': ['Turismo espacial'],
      },
      links: { 'pt:Turismo espacial:simple': 'Space tourism' },
    });
    const achado = await buscarArtigo('space travel', {
      idioma: 'en-US',
      nivel: 'iniciante',
      fetchFn,
    });
    expect(achado.titulo).toBe('Space travel');
  });

  test('se a Simple English não tem o tema, usa a Wikipédia em inglês', async () => {
    const { fetchFn } = wikipediaFalsa({
      buscas: { 'en:quantum chromodynamics': ['Quantum chromodynamics'] },
    });
    const achado = await buscarArtigo('quantum chromodynamics', {
      idioma: 'en-US',
      nivel: 'iniciante',
      fetchFn,
    });
    expect(achado.wiki).toBe('en');
  });

  test('erros claros: tema vazio, nada encontrado, limite de buscas', async () => {
    const { fetchFn } = wikipediaFalsa();
    await expect(buscarArtigo('  ', { fetchFn })).rejects.toThrow('Informe um tema');
    await expect(buscarArtigo('xyzxyz', { fetchFn })).rejects.toThrow('Nenhum artigo');
    const limitado = async () => ({ ok: false, status: 429 });
    await expect(buscarArtigo('casa', { fetchFn: limitado })).rejects.toThrow('Aguarde um minuto');
    const offline = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(buscarArtigo('casa', { fetchFn: offline })).rejects.toThrow('Sem conexão');
  });

  test('obtém o artigo e prepara o texto sem seções de referência', async () => {
    const { fetchFn } = wikipediaFalsa({ artigos: { 'en:Economics': ARTIGO } });
    const artigo = await obterArtigo('Economics', 'en', { fetchFn });
    const texto = prepararArtigo(artigo.extrato);
    expect(texto).toBe(
      [
        'Economics is the study of how people use resources.',
        'History',
        'People have traded goods for thousands of years. Money was invented to make trade easier.',
        'Modern times',
        'Today economies are connected around the world.',
      ].join('\n\n')
    );
    await expect(obterArtigo('Nada', 'en', { fetchFn })).rejects.toThrow('não encontrado');
  });

  test('corta o artigo perto do tamanho pedido', () => {
    const paragrafo = 'word '.repeat(100).trim();
    const longo = Array.from({ length: 20 }, (_, i) => `== Part ${i} ==\n${paragrafo}`).join('\n');
    const palavras = prepararArtigo(longo, { maxPalavras: 500 }).split(/\s+/).length;
    expect(palavras).toBeGreaterThan(400);
    expect(palavras).toBeLessThan(620);
  });
});

describe('pedidos para a IA', () => {
  const referencia = {
    titulo: 'Restaurant',
    texto: 'A restaurant is a place where people pay to eat.',
  };

  test('diálogo: nível, quantidade de falas, formato e referência', () => {
    const { mensagens, maxTokens } = promptDialogo({
      tema: 'ordering food',
      idioma: 'en-GB',
      nivel: 'iniciante',
      tamanho: 'curto',
      referencia,
    });
    const pedido = mensagens.at(-1).content;
    expect(mensagens[0].content).toContain('British English');
    expect(pedido).toContain('A1-A2');
    expect(pedido).toContain('exactly 8 lines');
    expect(pedido).toContain('Anna: ...');
    expect(pedido).toContain('A restaurant is a place');
    expect(maxTokens).toBeGreaterThan(400);
  });

  test('texto por nível e adaptação de artigo', () => {
    expect(
      promptTextoNivel({ tema: 'climate', idioma: 'en-US', nivel: 'fluente', tamanho: 'longo' })
        .mensagens[1].content
    ).toMatch(/C1-C2[\s\S]*about 500 words/);
    expect(
      promptAdaptarArtigo({
        titulo: 'Economy',
        texto: 'x',
        idioma: 'en-US',
        nivel: 'intermediario',
      }).mensagens[1].content
    ).toContain('B1-B2');
  });

  test('a referência é encurtada para caber no contexto de modelos pequenos', () => {
    expect(resumirReferencia('a '.repeat(1000), 10).split(' ')).toHaveLength(11);
  });

  test('limpa introduções, markdown e notas da resposta', () => {
    const resposta =
      "Sure! Here's your text:\n\n## The city\n\n**Paris** is big.\n\nIt is old.\n\nWord count: 6";
    expect(limparResposta(resposta)).toBe('The city\n\nParis is big.\n\nIt is old.');
  });

  test('diálogo: mantém só as falas no formato "Nome: fala"', () => {
    const resposta =
      'Here is a dialogue:\n**Anna:** Hi, Ben!\n\nBen : Hello, Anna.\n(They smile.)\n- Anna: How are you?';
    expect(limparResposta(resposta, 'dialogo')).toBe(
      'Anna: Hi, Ben!\nBen: Hello, Anna.\nAnna: How are you?'
    );
  });
});

describe('verificação de idioma', () => {
  test('reconhece inglês e português', () => {
    expect(
      pareceIdioma(
        'Anna: Where is the station? Ben: It is near the park, you can walk there.',
        'en-US'
      )
    ).toBe(true);
    expect(
      pareceIdioma(
        'Anna: Pedir comida num restaurante é fácil, não é? Ben: Sim, eu posso escolher o prato que quiser.',
        'en-US'
      )
    ).toBe(false);
    expect(pareceIdioma('Eu não sei o que é isso, mas você pode ver com a gente.', 'pt-BR')).toBe(
      true
    );
  });

  test('não bloqueia idiomas sem lista nem textos muito curtos', () => {
    expect(pareceIdioma('こんにちは。これは私の声です。', 'ja-JP')).toBe(true);
    expect(pareceIdioma('Olá!', 'en-US')).toBe(true);
  });

  test('detecta temas em português e limpa a tradução', () => {
    expect(temaPrecisaTraducao('pedir comida num restaurante', 'en-US')).toBe(true);
    expect(temaPrecisaTraducao('meio ambiente', 'en-US')).toBe(true); // sem acentos: antes passava despercebido
    expect(temaPrecisaTraducao('', 'en-US')).toBe(false);
    expect(limparTraducaoTema('"Ordering food at a restaurant."\nextra', 'x')).toBe(
      'Ordering food at a restaurant'
    );
    expect(limparTraducaoTema('', 'original')).toBe('original');
  });

  test('o pedido termina com o lembrete de idioma', () => {
    const { mensagens } = promptDialogo({
      tema: 'ordering food',
      idioma: 'en-US',
      nivel: 'iniciante',
    });
    expect(mensagens[1].content.trim().split('\n').at(-1)).toMatch(
      /^IMPORTANT: write the whole text in American English/
    );
  });
});

describe('criarTexto (orquestração)', () => {
  const wiki = () =>
    wikipediaFalsa({
      buscas: {
        'simple:restaurant': ['Restaurant'],
        'en:restaurant': ['Restaurant'],
        'en:economy': ['Economy'],
        'simple:economy': ['Economy'],
      },
      artigos: {
        'simple:Restaurant': ARTIGO,
        'en:Restaurant': ARTIGO,
        'en:Economy': ARTIGO,
        'simple:Economy': ARTIGO,
      },
    });

  function iaFalsa(resposta) {
    return {
      gerar: vi.fn(async ({ aoTexto }) => {
        aoTexto?.(resposta.slice(0, 5));
        return resposta;
      }),
    };
  }

  test('diálogo usa a Wikipédia como base e devolve a fonte', async () => {
    const { fetchFn } = wiki();
    const ia = iaFalsa(
      'Anna: Hi!\nBen: Hello!\nAnna: Are you hungry?\nBen: Yes, very.\nAnna: Let us eat.'
    );
    const etapas = [];
    const r = await criarTexto({
      modo: MODOS.DIALOGO,
      tema: 'restaurant',
      nivel: 'iniciante',
      ia,
      fetchFn,
      aoEtapa: (e) => etapas.push(e),
    });
    expect(r.texto.split('\n')).toHaveLength(5);
    expect(r.fonte).toMatchObject({
      nome: 'Wikipédia',
      titulo: 'Restaurant',
      licenca: 'CC BY-SA 4.0',
    });
    expect(r.titulo).toBe('Diálogo: restaurant');
    expect(r.analise.nivelEstimado).toBe('iniciante');
    expect(ia.gerar.mock.calls.at(-1)[0].mensagens[1].content).toContain('Economics is the study');
    expect(etapas[0]).toContain('Wikipédia');
  });

  test('se a IA responder em outro idioma, tenta de novo com instrução reforçada', async () => {
    const { fetchFn } = wiki();
    const respostas = [
      'restaurant', // tradução do tema
      'Anna: Pedir comida é fácil, não é?\nBen: Sim, eu posso escolher o prato.\nAnna: Você quer uma mesa?\nBen: Sim, para dois.',
      'Anna: Hi, do you have a table?\nBen: Yes, it is for two people.\nAnna: What is the special today?\nBen: It is the fish with rice.',
    ];
    const ia = { gerar: vi.fn(async () => respostas.shift()) };
    const etapas = [];
    const r = await criarTexto({
      modo: MODOS.DIALOGO,
      tema: 'restaurant',
      ia,
      fetchFn,
      aoEtapa: (e) => etapas.push(e),
    });
    expect(ia.gerar).toHaveBeenCalledTimes(3);
    expect(ia.gerar.mock.calls[2][0].mensagens[1].content).toContain(
      'previous answer was in the wrong language'
    );
    expect(r.texto).toContain('do you have a table');
    expect(etapas.some((e) => e.includes('outro idioma'))).toBe(true);
  });

  test('tema em português é traduzido antes de escrever', async () => {
    const { fetchFn } = wikipediaFalsa();
    const respostas = [
      'Ordering food at a restaurant',
      'Anna: Hi.\nBen: Hello.\nAnna: A table, please.\nBen: Sure, come in.',
    ];
    const ia = { gerar: vi.fn(async () => respostas.shift()) };
    await criarTexto({
      modo: MODOS.DIALOGO,
      tema: 'pedir comida num restaurante',
      ia,
      fetchFn,
      usarWikipedia: false,
    });
    expect(ia.gerar.mock.calls[0][0].mensagens[1].content).toContain(
      'pedir comida num restaurante'
    );
    const pedido = ia.gerar.mock.calls[1][0].mensagens[1].content;
    expect(pedido).toContain('"Ordering food at a restaurant"');
    expect(pedido).not.toContain('pedir comida');
  });

  test('tema em português é traduzido antes de escrever', async () => {
    const { fetchFn } = wikipediaFalsa();
    const respostas = [
      'Ordering food at a restaurant',
      'Anna: Hi.\nBen: Hello.\nAnna: A table, please.\nBen: Sure, come in.',
    ];
    const ia = { gerar: vi.fn(async () => respostas.shift()) };
    await criarTexto({
      modo: MODOS.DIALOGO,
      tema: 'pedir comida num restaurante',
      ia,
      fetchFn,
      usarWikipedia: false,
    });
    expect(ia.gerar.mock.calls[0][0].mensagens[1].content).toContain(
      'pedir comida num restaurante'
    );
    const pedido = ia.gerar.mock.calls[1][0].mensagens[1].content;
    expect(pedido).toContain('"Ordering food at a restaurant"');
    expect(pedido).not.toContain('pedir comida');
  });

  test('texto acima do nível pedido é reescrito de forma mais simples', async () => {
    const { fetchFn } = wiki();
    const dificil =
      'Notwithstanding considerable macroeconomic volatility, contemporary governmental institutions systematically implemented comprehensive regulatory frameworks, fundamentally transforming international financial intermediation and institutional accountability.';
    const simples =
      'Money helps people buy things. Banks keep money safe. People work to get money.';
    const respostas = ['economy', dificil, simples];
    const ia = { gerar: vi.fn(async () => respostas.shift()) };
    const etapas = [];
    const r = await criarTexto({
      modo: MODOS.NIVEL,
      tema: 'economy',
      nivel: 'iniciante',
      ia,
      fetchFn,
      aoEtapa: (e) => etapas.push(e),
    });
    expect(r.texto).toBe(simples);
    expect(ia.gerar.mock.calls[2][0].mensagens[1].content).toContain(
      'previous version was too difficult'
    );
    expect(etapas.some((e) => e.includes('Simplificando'))).toBe(true);
  });

  test('se continuar no idioma errado, mostra erro claro', async () => {
    const { fetchFn } = wiki();
    const portugues =
      'Eu não sei o que é isso. Você pode ver com a gente, é muito bom para todos nós.';
    const ia = { gerar: vi.fn(async () => portugues) };
    await expect(
      criarTexto({ modo: MODOS.NIVEL, tema: 'restaurant', ia, fetchFn })
    ).rejects.toThrow('não conseguiu escrever em Inglês');
  });

  test('diálogo inválido gera erro amigável', async () => {
    const { fetchFn } = wiki();
    await expect(
      criarTexto({
        modo: MODOS.DIALOGO,
        tema: 'restaurant',
        ia: iaFalsa('Just one line.'),
        fetchFn,
      })
    ).rejects.toThrow('diálogo válido');
  });

  test('mergulho sem IA entrega o artigo da Wikipédia', async () => {
    const { fetchFn } = wiki();
    const r = await criarTexto({
      modo: MODOS.MERGULHO,
      tema: 'economy',
      nivel: 'fluente',
      usarIA: false,
      fetchFn,
    });
    expect(r.geradoPorIA).toBe(false);
    expect(r.texto).toContain('Money was invented');
    expect(r.titulo).toBe('Economy');
  });

  test('mergulho com IA adapta o artigo ao nível', async () => {
    const { fetchFn } = wiki();
    const ia = iaFalsa('Economy is about money. People buy and sell things.');
    const r = await criarTexto({
      modo: MODOS.MERGULHO,
      tema: 'economy',
      nivel: 'iniciante',
      ia,
      fetchFn,
    });
    expect(r.texto).toBe('Economy is about money. People buy and sell things.');
    expect(r.geradoPorIA).toBe(true);
  });

  test('texto por nível sem IA usa a Wikipédia; diálogo sem IA pede para ativá-la', async () => {
    const { fetchFn } = wiki();
    const r = await criarTexto({
      modo: MODOS.NIVEL,
      tema: 'economy',
      nivel: 'iniciante',
      usarIA: false,
      fetchFn,
    });
    expect(r.fonte.titulo).toBe('Economy');
    await expect(
      criarTexto({ modo: MODOS.DIALOGO, tema: 'economy', usarIA: false, fetchFn })
    ).rejects.toThrow('precisa de IA');
  });

  test('sem internet, a IA escreve sozinha', async () => {
    const offline = async () => {
      throw new TypeError('offline');
    };
    const ia = iaFalsa('Paragraph one.\n\nParagraph two.');
    const r = await criarTexto({ modo: MODOS.NIVEL, tema: 'travel', ia, fetchFn: offline });
    expect(r.fonte).toBeNull();
    expect(r.texto).toBe('Paragraph one.\n\nParagraph two.');
  });

  test('valida tema, nível e modo', async () => {
    await expect(criarTexto({ modo: MODOS.NIVEL, tema: '' })).rejects.toThrow('tema');
    await expect(criarTexto({ modo: MODOS.NIVEL, tema: 'x', nivel: 'expert' })).rejects.toThrow(
      'Nível'
    );
    await expect(
      criarTexto({ modo: 'poema', tema: 'x', ia: iaFalsa('x'), usarWikipedia: false })
    ).rejects.toThrow('Modo');
  });
});

describe('IA local (WebLLM)', () => {
  test('detecta falta de WebGPU', async () => {
    expect((await verificarSuporte(undefined)).suportado).toBe(false);
    expect((await verificarSuporte({ requestAdapter: async () => null })).suportado).toBe(false);
  });

  test('usa precisão f16 quando a placa suporta', async () => {
    const gpu = { requestAdapter: async () => ({ features: new Set(['shader-f16']) }) };
    expect(await verificarSuporte(gpu)).toEqual({ suportado: true, f16: true });
    expect(idModelo('leve', true)).toBe('Llama-3.2-1B-Instruct-q4f16_1-MLC');
    expect(idModelo('qualidade', false)).toBe('Llama-3.2-3B-Instruct-q4f32_1-MLC');
    expect(idModelo('inexistente')).toBe('Qwen2.5-1.5B-Instruct-q4f16_1-MLC');
  });
});
