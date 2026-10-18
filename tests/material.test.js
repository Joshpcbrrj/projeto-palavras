/**
 * Material de estudo: filtro de palavras comuns, glossário com tradução e
 * exportação unificada (PDF e kit PDF + MP3).
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../js/pdf/exporter.js', async (original) => ({
  ...(await original()),
  exportarPdf: vi.fn(async (pacote, { nomeArquivo } = {}) => nomeArquivo || 'gerado.pdf'),
}));

const { ehPalavraComum, semPalavrasComuns, temListaDeComuns } =
  await import('../js/text/comuns.js');
const { extrairPalavras } = await import('../js/text/extract.js');
const { escolherPalavrasChave, montarGlossario, obterTradutor, tradutorNavegador, lerJson } =
  await import('../js/create/glossary.js');
const { AVISO_SEM_TRADUTOR, exportarMaterialPdf, nomeBaseKit } =
  await import('../js/services/export.js');
const { exportarPdf } = await import('../js/pdf/exporter.js');
const { progresso } = await import('../js/services/progress.js');
const { settings } = await import('../js/services/settings.js');

beforeEach(() => {
  localStorage.clear();
  settings._resetar();
  exportarPdf.mockClear();
});

/** Tradutor falso: traduz acrescentando "pt:". */
function tradutorFalso() {
  return {
    nome: 'falso',
    traduzirLista: vi.fn(async (itens) => itens.map((i) => `pt:${i}`)),
    criarGlossario: vi.fn(async () => [{ termo: 'harvest', traducao: 'colheita' }]),
  };
}

/** API Translator do navegador, falsa. */
function apiTranslator(disponibilidade = 'available') {
  return {
    availability: vi.fn(async () => disponibilidade),
    create: vi.fn(async () => ({ translate: async (t) => `[${t}]` })),
  };
}

describe('palavras muito comuns', () => {
  test('reconhece palavras comuns do inglês, sem diferenciar maiúsculas e apóstrofos', () => {
    expect(ehPalavraComum('The')).toBe(true);
    expect(ehPalavraComum('don’t')).toBe(true);
    expect(ehPalavraComum('kitchen')).toBe(false);
  });

  test('só filtra idiomas com lista (inglês)', () => {
    expect(temListaDeComuns('en-US')).toBe(true);
    expect(temListaDeComuns('pt-BR')).toBe(false);
    expect(semPalavrasComuns(['de', 'casa'], 'pt-BR')).toEqual(['de', 'casa']);
  });

  test('extrairPalavras com ignorarComuns deixa só o que vale estudar', () => {
    const texto = 'The cat is on the table and it is sleeping.';
    expect(extrairPalavras(texto, { idioma: 'en-US', ignorarComuns: true })).toEqual([
      'cat',
      'table',
      'sleeping',
    ]);
    expect(extrairPalavras(texto, { idioma: 'en-US' })).toContain('The');
  });
});

describe('glossário', () => {
  test('lerJson aceita blocos de código', () => {
    expect(lerJson('```json\n["a"]\n```')).toEqual(['a']);
  });

  test('escolhe palavras-chave longas, sem nomes próprios, na ordem do texto', () => {
    const texto = 'Yesterday Maria saw the beautiful museum and admired old sculptures.';
    const chaves = escolherPalavrasChave(texto, 'en-US', 3);
    expect(chaves).toEqual(['beautiful', 'admired', 'sculptures']);
    expect(chaves).not.toContain('maria');
  });

  test('material em português não precisa de tradutor', async () => {
    expect(await obterTradutor({ idioma: 'pt-BR', api: apiTranslator() })).toBeNull();
  });

  test('usa o Gemini quando há chave e o tradutor do navegador quando não há', async () => {
    const ia = { gerar: vi.fn(async () => '["gato"]') };
    const gemini = await obterTradutor({ idioma: 'en-US', ia });
    expect(gemini.nome).toBe('Gemini');
    expect(await gemini.traduzirLista(['cat'])).toEqual(['gato']);
    expect(ia.gerar).toHaveBeenCalledWith(expect.objectContaining({ json: true }));

    const navegador = await obterTradutor({ idioma: 'en-US', api: apiTranslator() });
    expect(navegador.nome).toBe('Tradutor do navegador');
    expect(await navegador.traduzirLista(['cat'])).toEqual(['[cat]']);
  });

  test('tradutor do navegador que demora a ficar pronto gera erro (o PDF sai sem tradução)', async () => {
    const api = { availability: async () => 'downloadable', create: () => new Promise(() => {}) };
    await expect(tradutorNavegador('en-US', { api, limiteMs: 10 })).rejects.toThrow(/baixando/);
  });

  test('tradutor do navegador indisponível ou inexistente → null', async () => {
    expect(await tradutorNavegador('en-US', { api: apiTranslator('unavailable') })).toBeNull();
    expect(await tradutorNavegador('en-US', { api: undefined })).toBeNull();
  });

  test('glossário de itens traz a tradução de cada um; de texto, as palavras-chave', async () => {
    const tradutor = tradutorFalso();
    expect(await montarGlossario({ tipo: 'palavras', itens: ['cat'] }, tradutor)).toEqual([
      { termo: 'cat', traducao: 'pt:cat' },
    ]);
    expect(await montarGlossario({ tipo: 'texto', texto: 'The harvest.' }, tradutor)).toEqual([
      { termo: 'harvest', traducao: 'colheita' },
    ]);
  });
});

describe('exportação unificada', () => {
  const palavras = { tipo: 'palavras', titulo: 'Cozinha', idioma: 'en-US', itens: ['cat', 'dog'] };

  test('gera o PDF com glossário, registra no histórico e agenda a revisão', async () => {
    const resultado = await exportarMaterialPdf(palavras, { ia: null, api: apiTranslator() });
    expect(resultado.aviso).toBe('');
    expect(resultado.pacote.glossario).toEqual([
      { termo: 'cat', traducao: '[cat]' },
      { termo: 'dog', traducao: '[dog]' },
    ]);
    expect(exportarPdf).toHaveBeenCalledWith(resultado.pacote, { nomeArquivo: undefined });
    const dados = progresso().dados;
    expect(dados.arquivos.exportados.at(-1)).toMatchObject({ nome: 'gerado.pdf', quantidade: 2 });
    expect(dados.materiais[resultado.pacote.id]).toBeTruthy();
  });

  test('sem tradutor, gera o PDF mesmo assim e avisa', async () => {
    const resultado = await exportarMaterialPdf(palavras, { ia: null, api: undefined });
    expect(resultado.aviso).toBe(AVISO_SEM_TRADUTOR);
    expect(resultado.pacote.glossario).toBeUndefined();
    expect(exportarPdf).toHaveBeenCalled();
  });

  test('erro na tradução não impede o PDF', async () => {
    const ia = { gerar: vi.fn(async () => Promise.reject(new Error('cota esgotada'))) };
    const resultado = await exportarMaterialPdf(palavras, { ia });
    expect(resultado.aviso).toContain('cota esgotada');
    expect(exportarPdf).toHaveBeenCalled();
  });

  test('respeita a preferência de não traduzir', async () => {
    settings.set('incluirTraducao', false);
    const api = apiTranslator();
    const resultado = await exportarMaterialPdf(palavras, { ia: null, api });
    expect(api.create).not.toHaveBeenCalled();
    expect(resultado.pacote.glossario).toBeUndefined();
  });

  test('mantém traduções já existentes e traduz só o que falta', async () => {
    const api = apiTranslator();
    const resultado = await exportarMaterialPdf(
      { ...palavras, glossario: [{ termo: 'cat', traducao: 'gato' }] },
      { ia: null, api }
    );
    expect(resultado.pacote.glossario).toEqual([
      { termo: 'cat', traducao: 'gato' },
      { termo: 'dog', traducao: '[dog]' },
    ]);
  });

  test('kit: PDF e MP3 compartilham o mesmo nome-base', async () => {
    const base = nomeBaseKit(palavras, new Date(2026, 9, 18, 9, 5));
    expect(base).toBe('palavras_cozinha_2026-10-18_09h05');
    const { nome } = await exportarMaterialPdf(palavras, {
      traduzir: false,
      nomeArquivo: `${base}.pdf`,
    });
    expect(nome).toBe(`${base}.pdf`);
  });
});
