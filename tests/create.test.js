import { describe, expect, test, vi } from 'vitest';
import {
  PALAVRAS_POR_NIVEL,
  analisarTexto,
  contarSilabas,
  paginasAproximadas,
  tamanhoDoNivel,
} from '../js/create/levels.js';
import {
  buscarArtigo,
  codigoWiki,
  obterArtigo,
  prepararArtigo,
  similaridade,
} from '../js/create/wikipedia.js';
import {
  ROTEIRO_DIALOGO,
  ROTEIRO_TEXTO,
  dividirRoteiro,
  limparResposta,
  promptAdaptarArtigo,
  promptDialogo,
  promptTextoNivel,
  pareceIdioma,
  resumirReferencia,
} from '../js/create/prompts.js';
import {
  MODOS,
  criarTexto,
  dividirEmTrechos,
  palavrasPorParte,
  quantasPartes,
} from '../js/create/generator.js';

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

  test('o nível define o tamanho: 700, 1200 e 2000 palavras (mínimo de 700)', () => {
    expect(PALAVRAS_POR_NIVEL).toEqual({ iniciante: 700, intermediario: 1200, fluente: 2000 });
    expect(Math.min(...Object.values(PALAVRAS_POR_NIVEL))).toBeGreaterThanOrEqual(700);
    expect(tamanhoDoNivel('iniciante')).toEqual({ palavras: 700, falas: 70 });
    expect(tamanhoDoNivel('fluente').falas).toBe(125);
    expect(paginasAproximadas(700)).toBe('2 páginas');
    expect(paginasAproximadas(2000)).toBe('6 páginas');
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

  test('remove as notas de navegação do topo do artigo', () => {
    const extrato =
      'For the American sport, see American football. For other sports known as football, see Football\nAssociation football is a sport played between two teams.';
    expect(prepararArtigo(extrato)).toBe(
      'Association football is a sport played between two teams.'
    );
  });

  test('pode pular a introdução (para completar outro texto)', () => {
    const texto = prepararArtigo(ARTIGO, { pularIntroducao: true });
    expect(texto).not.toContain('Economics is the study');
    expect(texto).toMatch(/^History/);
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
      referencia,
    });
    const pedido = mensagens.at(-1).content;
    expect(mensagens[0].content).toContain('British English');
    expect(pedido).toContain('A1-A2');
    expect(pedido).toContain('about 700 words');
    expect(pedido).toContain('about 70 lines');
    expect(pedido).toContain('Anna: ...');
    expect(pedido).toContain('A restaurant is a place');
    expect(maxTokens).toBeGreaterThan(1200);
  });

  test('texto por nível e adaptação de artigo', () => {
    expect(
      promptTextoNivel({ tema: 'climate', idioma: 'en-US', nivel: 'fluente' }).mensagens[1].content
    ).toMatch(/C1-C2[\s\S]*at least 2000 words/);
    expect(
      promptAdaptarArtigo({
        titulo: 'Economy',
        texto: 'x',
        idioma: 'en-US',
        nivel: 'intermediario',
      }).mensagens[1].content
    ).toContain('B1-B2');
  });

  test('partes: só a primeira apresenta o tema e só a última conclui', () => {
    const foco = 'its history and origin';
    const pedido = (indice) =>
      promptTextoNivel({
        tema: 'coffee',
        idioma: 'en-US',
        nivel: 'intermediario',
        palavras: 440,
        parte: { indice, total: 3, foco },
      }).mensagens[1].content;
    expect(pedido(1)).toContain('part 1 of 3');
    expect(pedido(1)).toContain('Start with a short introduction');
    expect(pedido(1)).toContain('Do not write a conclusion');
    expect(pedido(2)).toContain('Do not write an introduction');
    expect(pedido(2)).toContain(foco);
    expect(pedido(3)).toContain('End with a short conclusion');
    expect(pedido(2)).toContain('about 440 words');
  });

  test('diálogo em partes: não cumprimenta de novo nem se despede antes da hora', () => {
    const pedido = (indice) =>
      promptDialogo({
        tema: 'airport',
        idioma: 'en-US',
        nivel: 'fluente',
        palavras: 550,
        parte: { indice, total: 4, foco: 'x' },
      }).mensagens[1].content;
    expect(pedido(1)).toContain('starting with Anna');
    expect(pedido(2)).toContain('do not greet again');
    expect(pedido(2)).toContain('Do not end the conversation');
    expect(pedido(4)).toContain('End the conversation naturally');
  });

  test('o roteiro é dividido entre as partes, sem sobrar nem faltar item', () => {
    expect(dividirRoteiro(ROTEIRO_TEXTO, 3).map((g) => g.length)).toEqual([2, 2, 2]);
    expect(dividirRoteiro(ROTEIRO_TEXTO, 4).flat()).toEqual([...ROTEIRO_TEXTO]);
    expect(dividirRoteiro(ROTEIRO_DIALOGO, 2)).toHaveLength(2);
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

  /** IA falsa que responde conforme a parte pedida ("part 1 of 2"...). */
  function iaPorParte(respostas, { atraso = 0 } = {}) {
    let simultaneas = 0;
    const ia = {
      maxSimultaneas: 0,
      gerar: vi.fn(async ({ mensagens, aoTexto }) => {
        simultaneas++;
        ia.maxSimultaneas = Math.max(ia.maxSimultaneas, simultaneas);
        const pedido = mensagens[1].content;
        const parte = Number(pedido.match(/part (\d+) of \d+/)?.[1] || 0);
        const resposta =
          typeof respostas === 'function' ? respostas(parte, pedido) : respostas[parte];
        // Partes de número maior terminam antes, para testar a ordem final.
        await new Promise((r) => setTimeout(r, atraso * (5 - parte)));
        aoTexto?.(String(resposta ?? '').slice(0, 10));
        simultaneas--;
        return resposta ?? '';
      }),
    };
    return ia;
  }

  test('diálogo usa a Wikipédia como base, escreve em partes e devolve a fonte', async () => {
    const { fetchFn } = wiki();
    const ia = iaPorParte({
      1: 'Anna: Hi!\nBen: Hello!\nAnna: Are you hungry?',
      2: 'Ben: Yes, very.\nAnna: Let us eat.',
    });
    const etapas = [];
    const r = await criarTexto({
      modo: MODOS.DIALOGO,
      tema: 'restaurant',
      nivel: 'iniciante', // 700 palavras → 2 partes
      ia,
      fetchFn,
      aoEtapa: (e) => etapas.push(e),
    });
    expect(r.texto.split('\n')).toEqual([
      'Anna: Hi!',
      'Ben: Hello!',
      'Anna: Are you hungry?',
      'Ben: Yes, very.',
      'Anna: Let us eat.',
    ]);
    expect(ia.gerar.mock.calls[1][0].mensagens[1].content).toContain('part 2 of 2');
    // O artigo simples do teste é curto: foi completado com a Wikipédia em inglês.
    expect(r.fonte).toMatchObject({
      nome: 'Wikipédia',
      titulo: 'Restaurant (Simple English) e Restaurant (English)',
      licenca: 'CC BY-SA 4.0',
    });
    expect(r.titulo).toBe('Diálogo: restaurant');
    expect(r.analise.nivelEstimado).toBe('iniciante');
    expect(ia.gerar.mock.calls[0][0].mensagens[1].content).toContain('Economics is the study');
    expect(etapas[0]).toContain('Wikipédia');
    expect(etapas.some((e) => e.includes('2 partes ao mesmo tempo'))).toBe(true);
  });

  test('as partes são pedidas ao mesmo tempo e o texto sai na ordem certa', async () => {
    const paragrafo = (n) => `Section ${n}\n\n${'People learn new words every day. '.repeat(70)}`;
    const ia = iaPorParte((parte) => paragrafo(parte), { atraso: 20 });
    const parciais = [];
    const inicio = Date.now();
    const r = await criarTexto({
      modo: MODOS.NIVEL,
      tema: 'travel',
      nivel: 'intermediario', // 1200 palavras → 3 partes
      ia,
      usarWikipedia: false,
      aoTexto: (t) => parciais.push(t),
    });
    const tempo = Date.now() - inicio;
    expect(ia.gerar).toHaveBeenCalledTimes(3); // 3 × ~490 palavras: não precisa continuar
    expect(ia.maxSimultaneas).toBe(3); // as três ao mesmo tempo
    expect(tempo).toBeLessThan(80 + 60 + 40); // menos que a soma dos atrasos (em série)
    expect(r.texto.indexOf('Section 1')).toBeLessThan(r.texto.indexOf('Section 2'));
    expect(r.texto.indexOf('Section 2')).toBeLessThan(r.texto.indexOf('Section 3'));
    expect(parciais.length).toBeGreaterThan(3); // a tela é atualizada enquanto escreve
  });

  test('uma parte que falha (ex.: limite por minuto) é tentada de novo', async () => {
    let falhou = false;
    const ia = iaPorParte((parte) => {
      if (parte === 2 && !falhou) {
        falhou = true;
        throw new Error('O limite gratuito do Gemini foi atingido por agora.');
      }
      return `Part ${parte}. ${'We study a lot. '.repeat(100)}`;
    });
    const r = await criarTexto({
      modo: MODOS.NIVEL,
      tema: 'travel',
      ia,
      usarWikipedia: false,
    });
    expect(ia.gerar).toHaveBeenCalledTimes(3); // 2 partes + 1 nova tentativa
    expect(r.texto).toContain('Part 2.');
  });

  test('só a parte que ficou difícil é simplificada', async () => {
    const facil = 'I like my town. It has a big park. We play there. '.repeat(30);
    const dificil =
      'Notwithstanding considerable macroeconomic volatility, contemporary governmental institutions systematically implemented comprehensive regulatory frameworks. '.repeat(
        12
      );
    const simplificada = 'The town has many shops. People buy food there. It is fun. '.repeat(25);
    const ia = iaPorParte((parte, pedido) => {
      if (pedido.includes('too difficult')) return simplificada;
      if (pedido.includes('Continue the text')) return '';
      return parte === 1 ? facil : dificil;
    });
    const r = await criarTexto({
      modo: MODOS.NIVEL,
      tema: 'town',
      nivel: 'iniciante',
      ia,
      usarWikipedia: false,
    });
    const pedidosSimplificar = ia.gerar.mock.calls.filter((c) =>
      c[0].mensagens[1].content.includes('too difficult')
    );
    expect(pedidosSimplificar).toHaveLength(1); // só a parte 2
    expect(r.texto).toContain('I like my town');
    expect(r.texto).toContain('The town has many shops');
    expect(r.texto).not.toContain('Notwithstanding');
  });

  test('se a IA responder em outro idioma, tenta de novo com instrução reforçada', async () => {
    const { fetchFn } = wiki();
    const respostas = [
      'Anna: Pedir comida é fácil, não é?\nBen: Sim, eu posso escolher o prato.\nAnna: Você quer uma mesa?\nBen: Sim, para dois.',
      'Anna: Hi, do you have a table?\nBen: Yes, it is for two people.\nAnna: What is the special today?\nBen: It is the fish with rice.',
    ];
    const ia = { gerar: vi.fn(async () => respostas.shift()) };
    const etapas = [];
    const r = await criarTexto({
      modo: MODOS.DIALOGO,
      tema: 'restaurant',
      palavras: 300, // uma parte só
      ia,
      fetchFn,
      aoEtapa: (e) => etapas.push(e),
    });
    // 2 tentativas + 1 pedido para continuar (o texto é curto; a resposta vazia encerra).
    expect(ia.gerar).toHaveBeenCalledTimes(3);
    expect(ia.gerar.mock.calls[1][0].mensagens[1].content).toContain(
      'previous answer was in the wrong language'
    );
    expect(r.texto).toContain('do you have a table');
    expect(etapas.some((e) => e.includes('outro idioma'))).toBe(true);
  });

  test('texto acima do nível pedido é reescrito de forma mais simples', async () => {
    const { fetchFn } = wiki();
    const dificil =
      'Notwithstanding considerable macroeconomic volatility, contemporary governmental institutions systematically implemented comprehensive regulatory frameworks, fundamentally transforming international financial intermediation and institutional accountability.';
    const simples =
      'Money helps people buy things. Banks keep money safe. People work to get money.';
    const respostas = [dificil, simples];
    const ia = { gerar: vi.fn(async () => respostas.shift()) };
    const etapas = [];
    const r = await criarTexto({
      modo: MODOS.NIVEL,
      tema: 'economy',
      nivel: 'iniciante',
      palavras: 300, // uma parte só
      ia,
      fetchFn,
      aoEtapa: (e) => etapas.push(e),
    });
    expect(r.texto).toBe(simples);
    expect(ia.gerar.mock.calls[1][0].mensagens[1].content).toContain(
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
      palavras: 300, // um trecho só
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
    expect(r.fonte.titulo).toBe('Economy (Simple English) e Economy (English)');
    expect(r.aviso).toMatch(/só tem \d+ palavras/); // a Wikipédia (falsa) é curta demais
    await expect(
      criarTexto({ modo: MODOS.DIALOGO, tema: 'economy', usarIA: false, fetchFn })
    ).rejects.toThrow('precisa de IA');
  });

  test('sem internet, a IA escreve sozinha', async () => {
    const offline = async () => {
      throw new TypeError('offline');
    };
    const ia = iaFalsa('Paragraph one.\n\nParagraph two.');
    const r = await criarTexto({
      modo: MODOS.NIVEL,
      tema: 'travel',
      palavras: 300,
      ia,
      fetchFn: offline,
    });
    expect(r.fonte).toBeNull();
    expect(r.texto).toBe('Paragraph one.\n\nParagraph two.');
  });

  test('texto curto: a IA continua até chegar perto do tamanho do nível', async () => {
    const paragrafo = (n) => `Part ${n}. ${'We learn new words every day. '.repeat(33).trim()}`;
    let n = 0;
    const ia = { gerar: vi.fn(async () => paragrafo(++n)) }; // ≈ 200 palavras por resposta
    const etapas = [];
    const r = await criarTexto({
      modo: MODOS.NIVEL,
      tema: 'travel',
      nivel: 'iniciante',
      ia,
      usarWikipedia: false,
      aoEtapa: (e) => etapas.push(e),
    });
    expect(ia.gerar).toHaveBeenCalledTimes(4); // 2 partes + 2 continuações
    expect(ia.gerar.mock.calls[2][0].mensagens[1].content).toContain('Continue the text');
    expect(r.texto.split(/\s+/).length).toBeGreaterThan(700);
    expect(etapas.some((e) => /Continuando/.test(e))).toBe(true);
  });

  test('não continua se o texto já tem o tamanho, e para se a IA repetir', async () => {
    const longo = 'people learn new words every day. '.repeat(130);
    const ia = { gerar: vi.fn(async () => longo) };
    await criarTexto({ modo: MODOS.NIVEL, tema: 'travel', ia, usarWikipedia: false });
    expect(ia.gerar).toHaveBeenCalledTimes(2); // 2 partes já passam de 700 palavras

    const curto = { gerar: vi.fn(async () => 'I like to go by train. It is fun.') };
    await criarTexto({
      modo: MODOS.NIVEL,
      tema: 'travel',
      palavras: 300,
      ia: curto,
      usarWikipedia: false,
    });
    expect(curto.gerar).toHaveBeenCalledTimes(2); // a continuação repetiu o texto: encerra
  });

  test('mergulho com IA: o artigo é dividido em trechos seguidos, adaptados ao mesmo tempo', async () => {
    const paragrafos = Array.from(
      { length: 6 },
      (_, i) => `Paragraph ${i + 1} ${'word '.repeat(80).trim()}.`
    );
    const artigo = [paragrafos[0], 'History', ...paragrafos.slice(1)].join('\n\n');
    const trechos = dividirEmTrechos(artigo, 3);
    expect(trechos).toHaveLength(3);
    expect(trechos.join('\n\n')).toBe(artigo); // nada se perde nem muda de ordem
    expect(trechos.some((t) => t.endsWith('History'))).toBe(false); // título fica com o parágrafo
    expect(dividirEmTrechos('Only one paragraph.', 4)).toEqual(['Only one paragraph.']);
  });

  test('em quantas partes o texto é escrito (e quanto cada uma pede)', () => {
    expect([700, 1200, 2000, 300].map(quantasPartes)).toEqual([2, 3, 4, 1]);
    expect(palavrasPorParte(1200, 3)).toBe(440);
    expect(palavrasPorParte(2000, 4)).toBe(550);
  });

  test('Simple English curta é completada com as seções da Wikipédia em inglês', async () => {
    const { fetchFn, chamadas } = wikipediaFalsa({
      buscas: { 'simple:coffee': ['Coffee'] },
      artigos: {
        'simple:Coffee': 'Coffee is a drink.',
        'en:Coffee': `Coffee is a beverage brewed from roasted beans.\n== History ==\n${'Coffee spread around the world. '.repeat(30)}`,
      },
    });
    const r = await criarTexto({
      modo: MODOS.MERGULHO,
      tema: 'coffee',
      nivel: 'iniciante',
      usarIA: false,
      fetchFn,
    });
    expect(r.texto).toMatch(/^Coffee is a drink\.\n\nHistory\n\nCoffee spread/);
    expect(r.texto).not.toContain('brewed from roasted beans'); // a introdução não se repete
    expect(chamadas.some((c) => c.wiki === 'en' && c.titles === 'Coffee')).toBe(true);
    expect(r.aviso).toBeTruthy();
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
