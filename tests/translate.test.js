/**
 * Tradução no fim do PDF: tradutores, estrutura preservada, formato do pacote e
 * reaproveitamento de traduções já feitas.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../js/pdf/exporter.js', async (original) => ({
  ...(await original()),
  exportarPdf: vi.fn(async () => 'gerado.pdf'),
}));

const { lerJson, obterTradutor, tradutorGemini, tradutorNavegador, traduzirItens, traduzirTexto } =
  await import('../js/create/translate.js');
const { criarPacote } = await import('../js/pdf/format.js');
const { AVISO_SEM_TRADUTOR, adicionarTraducao, exportarMaterialPdf, traducoesConhecidas } =
  await import('../js/services/export.js');
const { exportarPdf } = await import('../js/pdf/exporter.js');
const { settings } = await import('../js/services/settings.js');

beforeEach(() => {
  localStorage.clear();
  settings._resetar();
  exportarPdf.mockClear();
});

/** API Translator do navegador, falsa: traduz para "[texto]". */
function apiTranslator(disponibilidade = 'available') {
  return {
    availability: vi.fn(async () => disponibilidade),
    create: vi.fn(async () => ({ translate: vi.fn(async (t) => `[${t}]`) })),
  };
}

/** Gemini falso: devolve o lote recebido com "pt:" na frente. */
function geminiFalso() {
  return {
    gerar: vi.fn(async ({ mensagens }) => {
      const lote = JSON.parse(mensagens[1].content.slice(mensagens[1].content.indexOf('[')));
      return JSON.stringify(lote.map((p) => `pt:${p}`));
    }),
  };
}

describe('tradutores', () => {
  test('lerJson aceita blocos de código', () => {
    expect(lerJson('```json\n["a"]\n```')).toEqual(['a']);
  });

  test('material em português não precisa de tradutor; Gemini tem preferência', async () => {
    expect(await obterTradutor({ idioma: 'pt-BR', api: apiTranslator() })).toBeNull();
    expect((await obterTradutor({ idioma: 'en-US', ia: geminiFalso() })).nome).toBe('Gemini');
    expect((await obterTradutor({ idioma: 'en-US', api: apiTranslator() })).nome).toBe(
      'Tradutor do navegador'
    );
  });

  test('Gemini traduz em lotes, em JSON, mantendo a ordem', async () => {
    const ia = geminiFalso();
    const partes = Array.from({ length: 130 }, (_, i) => `item ${i}`);
    const traducoes = await tradutorGemini(ia, 'en-US').traduzirPartes(partes);
    expect(ia.gerar).toHaveBeenCalledTimes(3); // lotes de 60
    expect(ia.gerar.mock.calls[0][0].json).toBe(true);
    expect(traducoes[129]).toBe('pt:item 129');
  });

  test('tradutor do navegador: indisponível → null; demora demais → erro claro', async () => {
    expect(await tradutorNavegador('en-US', { api: apiTranslator('unavailable') })).toBeNull();
    expect(await tradutorNavegador('en-US', { api: undefined })).toBeNull();
    const lento = { availability: async () => 'downloadable', create: () => new Promise(() => {}) };
    await expect(tradutorNavegador('en-US', { api: lento, limiteMs: 10 })).rejects.toThrow(
      /baixando/
    );
  });

  test('texto: cada parágrafo e título vira uma linha traduzida, no mesmo lugar', async () => {
    const tradutor = await tradutorNavegador('en-US', { api: apiTranslator() });
    const texto = 'First paragraph.\n\nA title\n\nSecond paragraph.';
    expect(await traduzirTexto(texto, tradutor)).toBe(
      '[First paragraph.]\n\n[A title]\n\n[Second paragraph.]'
    );
  });

  test('listas: um item traduzido para cada item, na mesma ordem', async () => {
    const tradutor = await tradutorNavegador('en-US', { api: apiTranslator() });
    expect(await traduzirItens(['cat', 'dog'], tradutor)).toEqual(['[cat]', '[dog]']);
  });
});

describe('formato do pacote', () => {
  test('texto guarda a tradução completa', () => {
    const p = criarPacote({ tipo: 'texto', texto: 'Hello.', traducao: 'Olá.' });
    expect(p.traducao).toBe('Olá.');
  });

  test('listas guardam uma tradução por item, alinhada mesmo se houver itens vazios', () => {
    const p = criarPacote({
      tipo: 'palavras',
      itens: ['cat', ' ', 'dog'],
      traducao: ['gato', '', 'cão'],
    });
    expect(p.itens).toEqual(['cat', 'dog']);
    expect(p.traducao).toEqual(['gato', 'cão']);
  });

  test('tradução que não corresponde item a item é descartada', () => {
    const p = criarPacote({ tipo: 'palavras', itens: ['cat', 'dog'], traducao: ['gato'] });
    expect(p).not.toHaveProperty('traducao');
  });
});

describe('exportação com tradução', () => {
  const palavras = { tipo: 'palavras', titulo: 'Casa', idioma: 'en-US', itens: ['cat', 'dog'] };

  test('acrescenta a tradução de cada item ao PDF (ligada por padrão)', async () => {
    const etapas = [];
    const r = await exportarMaterialPdf(palavras, {
      ia: null,
      api: apiTranslator(),
      aoEtapa: (e) => etapas.push(e),
    });
    expect(r.pacote.traducao).toEqual(['[cat]', '[dog]']);
    expect(r.aviso).toBe('');
    expect(etapas).toEqual(['Traduzindo…', 'Gerando PDF…']);
  });

  test('texto: a tradução completa vai para o pacote', async () => {
    const r = await exportarMaterialPdf(
      { tipo: 'texto', idioma: 'en-US', texto: 'Hello.\n\nBye.' },
      { ia: geminiFalso() }
    );
    expect(r.pacote.traducao).toBe('pt:Hello.\n\npt:Bye.');
  });

  test('reaproveita traduções conhecidas e traduz só o que falta', async () => {
    const api = apiTranslator();
    const conhecidas = traducoesConhecidas(
      criarPacote({ tipo: 'palavras', itens: ['cat'], traducao: ['gato'] })
    );
    const { pacote } = await adicionarTraducao(criarPacote(palavras), { conhecidas, api });
    expect(pacote.traducao).toEqual(['gato', '[dog]']);
    const tradutor = await api.create.mock.results[0].value;
    expect(tradutor.translate).toHaveBeenCalledTimes(1);
  });

  test('tudo já traduzido: não chama nenhum tradutor', async () => {
    const api = apiTranslator();
    const conhecidas = new Map([
      ['cat', 'gato'],
      ['dog', 'cão'],
    ]);
    const { pacote } = await adicionarTraducao(criarPacote(palavras), { conhecidas, api });
    expect(pacote.traducao).toEqual(['gato', 'cão']);
    expect(api.create).not.toHaveBeenCalled();
  });

  test('português não é traduzido; sem tradutor ou com erro, o PDF sai e o app avisa', async () => {
    const pt = await exportarMaterialPdf({ ...palavras, idioma: 'pt-BR' }, { ia: null });
    expect(pt.aviso).toBe('');
    expect(pt.pacote).not.toHaveProperty('traducao');

    const semTradutor = await exportarMaterialPdf(palavras, { ia: null, api: undefined });
    expect(semTradutor.aviso).toBe(AVISO_SEM_TRADUTOR);

    const falha = { gerar: vi.fn(async () => Promise.reject(new Error('cota esgotada'))) };
    const comErro = await exportarMaterialPdf(palavras, { ia: falha });
    expect(comErro.aviso).toContain('cota esgotada');
    expect(exportarPdf).toHaveBeenCalledTimes(3);
  });

  test('com a opção desligada, o PDF sai sem tradução (mesmo de um PDF que já tinha)', async () => {
    settings.set('incluirTraducao', false);
    const api = apiTranslator();
    const r = await exportarMaterialPdf({ ...palavras, traducao: ['gato', 'cão'] }, { api });
    expect(r.pacote).not.toHaveProperty('traducao');
    expect(api.create).not.toHaveBeenCalled();
  });
});
