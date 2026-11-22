/**
 * Tradução no fim do PDF: tradutores, estrutura preservada, formato do pacote e
 * reaproveitamento de traduções já feitas.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../js/pdf/exporter.js', async (original) => ({
  ...(await original()),
  exportarPdf: vi.fn(async () => 'gerado.pdf'),
}));

const { obterTradutor, tradutorNavegador, traduzirItens, traduzirTexto } =
  await import('../js/pdf/translate.js');
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

describe('tradutores', () => {
  test('material em português não precisa de tradutor; os demais usam o nativo quando disponível', async () => {
    expect(await obterTradutor({ idioma: 'pt-BR', api: apiTranslator() })).toBeNull();
    expect((await obterTradutor({ idioma: 'en-US', api: apiTranslator() })).nome).toBe(
      'Tradutor do navegador'
    );
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
      { api: apiTranslator() }
    );
    expect(r.pacote.traducao).toBe('[Hello.]\n\n[Bye.]');
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

  test('não tenta traduzir um pacote que já tem todas as traduções', async () => {
    const pacote = criarPacote({
      tipo: 'palavras',
      idioma: 'en-US',
      itens: ['cat', 'dog'],
      traducao: ['gato', 'cão'],
    });
    const api = apiTranslator();
    await expect(adicionarTraducao(pacote, { api })).resolves.toEqual({ pacote, aviso: '' });
    expect(api.create).not.toHaveBeenCalled();
  });

  test('propaga cancelamento e usa mensagem genérica quando uma falha não tem mensagem', async () => {
    const pacote = criarPacote(palavras);
    const cancelamento = new DOMException('cancelado', 'AbortError');
    const apiCancelada = {
      availability: async () => 'available',
      create: async () => {
        throw cancelamento;
      },
    };
    await expect(adicionarTraducao(pacote, { api: apiCancelada })).rejects.toBe(cancelamento);

    const logErro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const apiSemMensagem = {
      availability: async () => 'available',
      create: async () => {
        throw {};
      },
    };
    const resultado = await adicionarTraducao(pacote, { api: apiSemMensagem });
    expect(resultado.aviso).toContain('erro desconhecido');
    expect(logErro).toHaveBeenCalledOnce();
    logErro.mockRestore();
  });

  test('reaproveita apenas traduções conhecidas não vazias', () => {
    expect(
      traducoesConhecidas(
        null,
        { itens: ['cat'], traducao: 'não é uma lista' },
        { itens: ['cat', 'dog'], traducao: ['', 'cão'] }
      )
    ).toEqual(new Map([['dog', 'cão']]));
  });

  test('mantém itens sem tradução e o pacote original se os dados não puderem ser normalizados', async () => {
    const pacote = criarPacote(palavras);
    const apiComItemVazio = {
      availability: async () => 'available',
      create: async () => ({
        translate: async (texto) => (texto === 'cat' ? '' : '[dog]'),
      }),
    };
    const resultado = await adicionarTraducao(pacote, { api: apiComItemVazio });
    expect(resultado.pacote.traducao).toEqual(['', '[dog]']);

    const invalido = { tipo: 'desconhecido', idioma: '', itens: ['cat'] };
    const api = apiTranslator();
    await expect(adicionarTraducao(invalido, { api })).resolves.toMatchObject({
      pacote: invalido,
      aviso: '',
    });
  });

  test('português não é traduzido; sem tradutor ou com erro, o PDF sai e o app avisa', async () => {
    const pt = await exportarMaterialPdf({ ...palavras, idioma: 'pt-BR' });
    expect(pt.aviso).toBe('');
    expect(pt.pacote).not.toHaveProperty('traducao');

    const semTradutor = await exportarMaterialPdf(palavras);
    expect(semTradutor.aviso).toBe(AVISO_SEM_TRADUTOR);

    const falha = { create: vi.fn(async () => Promise.reject(new Error('falha local'))) };
    const comErro = await exportarMaterialPdf(palavras, { api: falha });
    expect(comErro.aviso).toContain('falha local');
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
