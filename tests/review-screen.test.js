import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  lerArquivo: vi.fn(),
  confirmar: vi.fn(),
  exportarPdfComBotao: vi.fn(),
}));

vi.mock('../js/pdf/importer.js', async (importOriginal) => ({
  ...(await importOriginal()),
  lerArquivo: mocks.lerArquivo,
}));
vi.mock('../js/ui/dialog.js', () => ({ confirmar: mocks.confirmar }));
vi.mock('../js/ui/exportActions.js', async (importOriginal) => ({
  ...(await importOriginal()),
  exportarPdfComBotao: mocks.exportarPdfComBotao,
}));

const { ReviewScreen, _limparMateriaisAbertos } = await import('../js/screens/ReviewScreen.js');
const { definirNavegador } = await import('../js/core/nav.js');
const { criarPacote, criarRevisao } = await import('../js/pdf/format.js');
const { toast } = await import('../js/ui/toast.js');

let raiz;
let navegar;
let tela;

beforeEach(() => {
  localStorage.clear();
  _limparMateriaisAbertos();
  mocks.lerArquivo.mockReset();
  mocks.confirmar.mockReset().mockResolvedValue(true);
  mocks.exportarPdfComBotao.mockReset().mockResolvedValue(undefined);
  vi.spyOn(toast, 'info').mockImplementation(() => {});
  vi.spyOn(toast, 'sucesso').mockImplementation(() => {});
  vi.spyOn(toast, 'erro').mockImplementation(() => {});
  navegar = vi.fn();
  definirNavegador(navegar);
  document.body.innerHTML = '<main id="app"></main>';
  raiz = document.getElementById('app');
});

afterEach(() => {
  tela = null;
});

describe('Reabrir material para revisão', () => {
  test('lista texto importado e abre a leitura preservando material e revisão', async () => {
    const material = {
      ...criarPacote({
        tipo: 'texto',
        titulo: 'Artigo pessoal',
        idioma: 'en-US',
        texto: 'The first paragraph. The second paragraph.',
        revisao: criarRevisao({ revisarEm: '2026-11-22', intervaloDias: 1 }),
      }),
      nomeArquivo: 'artigo.pdf',
    };
    mocks.lerArquivo.mockResolvedValue([material]);

    tela = new ReviewScreen();
    tela.montar(raiz);
    await tela.abrir([{ name: 'artigo.pdf' }]);

    expect(raiz.querySelector('.material__titulo').textContent).toBe('Artigo pessoal');
    expect(raiz.querySelector('.material__meta').textContent).toContain('6 palavras');

    raiz.querySelector('[data-acao="ouvir"]').click();
    expect(navegar).toHaveBeenCalledWith(
      'texto',
      expect.objectContaining({
        material: expect.objectContaining({
          texto: 'The first paragraph. The second paragraph.',
          revisao: expect.objectContaining({ revisarEm: '2026-11-22' }),
        }),
      })
    );
  });

  test('mostra prévia e encaminha texto importado para palavras ou frases', async () => {
    const material = {
      ...criarPacote({
        tipo: 'texto',
        titulo: 'Garden',
        idioma: 'en-US',
        texto: 'Lanterns glow softly. Flowers bloom brightly.',
      }),
      nomeArquivo: 'garden.pdf',
    };
    mocks.lerArquivo.mockResolvedValue([material]);

    tela = new ReviewScreen();
    tela.montar(raiz);
    await tela.abrir([{ name: 'garden.pdf' }]);

    const previa = raiz.querySelector('#previa0');
    const botaoVer = raiz.querySelector('[data-acao="ver"]');
    botaoVer.click();
    expect(previa.hidden).toBe(false);
    expect(botaoVer.getAttribute('aria-expanded')).toBe('true');
    botaoVer.click();
    expect(previa.hidden).toBe(true);

    raiz.querySelector('[data-acao="palavras"]').click();
    expect(navegar).toHaveBeenLastCalledWith(
      'palavras',
      expect.objectContaining({ idioma: 'en-US', itens: expect.arrayContaining(['Lanterns']) })
    );

    raiz.querySelector('[data-acao="frases"]').click();
    expect(navegar).toHaveBeenLastCalledWith(
      'frases',
      expect.objectContaining({
        idioma: 'en-US',
        itens: ['Lanterns glow softly', 'Flowers bloom brightly'],
      })
    );
  });

  test('combina listas do mesmo tipo e idioma, remove duplicatas e exporta sob confirmação', async () => {
    const pacote = (id, itens, traducao, contextos) => ({
      ...criarPacote({
        tipo: 'palavras',
        titulo: id,
        idioma: 'en-US',
        id,
        itens,
        traducao,
        contextos,
      }),
      nomeArquivo: `${id}.pdf`,
    });
    const primeira = pacote(
      'one',
      ['apple', 'banana'],
      ['maçã', 'banana'],
      ['An apple fell.', 'A yellow banana.']
    );
    const segunda = pacote(
      'two',
      ['banana', 'orange'],
      ['banana', 'laranja'],
      ['Bananas are tasty.', 'An orange is sweet.']
    );
    const outroIdioma = {
      ...criarPacote({
        tipo: 'palavras',
        titulo: 'fr',
        idioma: 'fr-FR',
        id: 'fr',
        itens: ['pomme'],
      }),
      nomeArquivo: 'fr.pdf',
    };
    mocks.lerArquivo
      .mockResolvedValueOnce([primeira])
      .mockResolvedValueOnce([segunda])
      .mockResolvedValueOnce([outroIdioma]);

    tela = new ReviewScreen();
    tela.montar(raiz);
    await tela.abrir([{ name: 'one.pdf' }, { name: 'two.pdf' }, { name: 'fr.pdf' }]);

    const estudar = raiz.querySelector('[data-combinar="palavras"][data-idioma="en-US"]');
    expect(estudar.textContent).toContain('Estudar todas');
    estudar.click();
    expect(navegar).toHaveBeenLastCalledWith(
      'palavras',
      expect.objectContaining({
        itens: ['apple', 'banana', 'orange'],
        contextos: ['An apple fell.', 'A yellow banana.', 'An orange is sweet.'],
        idioma: 'en-US',
        conhecidas: expect.any(Map),
      })
    );

    const exportar = raiz.querySelector('[data-combinar-pdf="palavras"][data-idioma="en-US"]');
    exportar.click();
    await vi.waitFor(() => expect(mocks.exportarPdfComBotao).toHaveBeenCalledOnce());
    expect(mocks.confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Exportar PDF combinado', confirmar: 'Gerar PDF' })
    );
    expect(mocks.exportarPdfComBotao.mock.calls[0][1]).toMatchObject({
      tipo: 'palavras',
      idioma: 'en-US',
      itens: ['apple', 'banana', 'orange'],
      contextos: ['An apple fell.', 'A yellow banana.', 'An orange is sweet.'],
    });
  });

  test('ignora MP3, informa erros de leitura e limpa a lista', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const material = {
      ...criarPacote({
        tipo: 'texto',
        titulo: 'Notas',
        idioma: 'en-US',
        texto: 'A readable text.',
        id: 'notes',
      }),
      nomeArquivo: 'notes.pdf',
    };
    mocks.lerArquivo
      .mockResolvedValueOnce([material])
      .mockRejectedValueOnce(new Error('Arquivo inválido.'))
      .mockRejectedValueOnce({});

    tela = new ReviewScreen();
    tela.montar(raiz);
    await tela.abrir([
      { name: 'notes.mp3', type: 'audio/mpeg' },
      { name: 'notes.pdf', type: 'application/pdf' },
      { name: 'broken.txt', type: 'text/plain' },
      { name: 'unknown.txt', type: 'text/plain' },
    ]);

    expect(mocks.lerArquivo).toHaveBeenCalledTimes(3);
    expect(toast.info).toHaveBeenCalledWith(
      'O MP3 foi ignorado: o PDF do kit já guarda o conteúdo e a revisão.'
    );
    expect(toast.sucesso).toHaveBeenCalledWith('Arquivo aberto.');
    expect(toast.erro).toHaveBeenCalledWith('Arquivo inválido.');
    expect(toast.erro).toHaveBeenCalledWith('Falha ao ler unknown.txt.');
    expect(erro).toHaveBeenCalledTimes(2);
    expect(raiz.querySelector('.material__titulo').textContent).toBe('Notas');

    raiz.querySelector('#btnLimparLista').click();
    expect(raiz.textContent).toContain('Nenhum arquivo aberto');
  });

  test('não exporta uma lista combinada se a pessoa cancelar a confirmação', async () => {
    const material = {
      ...criarPacote({
        tipo: 'frases',
        titulo: 'A',
        idioma: 'en-US',
        id: 'a',
        itens: ['Good morning.'],
      }),
      nomeArquivo: 'a.pdf',
    };
    const outro = {
      ...criarPacote({
        tipo: 'frases',
        titulo: 'B',
        idioma: 'en-US',
        id: 'b',
        itens: ['Good evening.'],
      }),
      nomeArquivo: 'b.pdf',
    };
    mocks.lerArquivo.mockResolvedValueOnce([material]).mockResolvedValueOnce([outro]);
    mocks.confirmar.mockResolvedValue(false);

    tela = new ReviewScreen();
    tela.montar(raiz);
    await tela.abrir([{ name: 'a.pdf' }, { name: 'b.pdf' }]);
    raiz.querySelector('[data-combinar-pdf="frases"]').click();

    await vi.waitFor(() => expect(mocks.confirmar).toHaveBeenCalledOnce());
    expect(mocks.exportarPdfComBotao).not.toHaveBeenCalled();
  });

  test('ignora vários arquivos de áudio sem tentar importar arquivos', async () => {
    tela = new ReviewScreen();
    tela.montar(raiz);
    await tela.abrir([
      { name: 'one.mp3', type: 'audio/mpeg' },
      { name: 'two.wav', type: 'audio/wav' },
    ]);

    expect(toast.info).toHaveBeenCalledWith(
      '2 arquivos de áudio ignorados: os PDFs do kit já guardam o conteúdo e a revisão.'
    );
    expect(mocks.lerArquivo).not.toHaveBeenCalled();
    expect(raiz.textContent).toContain('Nenhum arquivo aberto');
  });

  test('abre listas de frases, ignora controles obsoletos e permite remover materiais', async () => {
    const material = {
      ...criarPacote({
        tipo: 'frases',
        titulo: 'Frases',
        idioma: 'en-US',
        id: 'frases',
        itens: ['Good morning.'],
      }),
      nomeArquivo: 'frases.pdf',
    };
    mocks.lerArquivo.mockResolvedValue([material]);
    tela = new ReviewScreen();
    tela.montar(raiz);
    await tela.abrir([{ name: 'frases.pdf' }]);

    raiz.querySelector('#areaMateriais').click();
    const obsoleto = document.createElement('button');
    obsoleto.dataset.acao = 'estudar';
    obsoleto.dataset.i = '99';
    raiz.querySelector('#areaMateriais').append(obsoleto);
    obsoleto.click();
    expect(navegar).not.toHaveBeenCalled();

    raiz.querySelector('[data-acao="estudar"]').click();
    expect(navegar).toHaveBeenCalledWith(
      'frases',
      expect.objectContaining({ itens: ['Good morning.'], material: expect.any(Object) })
    );

    raiz.querySelector('[data-acao="remover"]').click();
    expect(raiz.textContent).toContain('Nenhum arquivo aberto');
  });

  test('avisa quando um texto importado não tem palavras nem frases e combina frases sem contexto', async () => {
    const aviso = vi.spyOn(toast, 'aviso').mockImplementation(() => {});
    const textoVazio = {
      ...criarPacote({
        tipo: 'texto',
        titulo: 'Sinais',
        idioma: 'en-US',
        texto: '... !!!',
      }),
      nomeArquivo: 'sinais.pdf',
    };
    const primeira = {
      ...criarPacote({
        tipo: 'frases',
        titulo: 'A',
        idioma: 'en-US',
        id: 'a',
        itens: ['Good morning.'],
      }),
      nomeArquivo: 'a.pdf',
    };
    const segunda = {
      ...criarPacote({
        tipo: 'frases',
        titulo: 'B',
        idioma: 'en-US',
        id: 'b',
        itens: ['Good evening.'],
      }),
      nomeArquivo: 'b.pdf',
    };
    mocks.lerArquivo
      .mockResolvedValueOnce([textoVazio])
      .mockResolvedValueOnce([primeira])
      .mockResolvedValueOnce([segunda]);

    tela = new ReviewScreen();
    tela.montar(raiz);
    await tela.abrir([{ name: 'sinais.pdf' }]);
    raiz.querySelector('[data-acao="palavras"]').click();
    raiz.querySelector('[data-acao="frases"]').click();
    expect(aviso).toHaveBeenCalledTimes(2);

    await tela.abrir([{ name: 'a.pdf' }, { name: 'b.pdf' }]);
    raiz.querySelector('[data-combinar="frases"]').click();
    expect(navegar).toHaveBeenLastCalledWith(
      'frases',
      expect.objectContaining({
        itens: ['Good morning.', 'Good evening.'],
        contextos: undefined,
      })
    );
  });

  test('atualiza um material já aberto com a versão mais recente do mesmo ID', async () => {
    const pacote = (titulo) => ({
      ...criarPacote({
        tipo: 'palavras',
        titulo,
        idioma: 'en-US',
        id: 'same-id',
        itens: ['apple'],
      }),
      nomeArquivo: `${titulo}.pdf`,
    });
    mocks.lerArquivo
      .mockResolvedValueOnce([pacote('Original')])
      .mockResolvedValueOnce([pacote('Atualizado')]);

    tela = new ReviewScreen();
    tela.montar(raiz);
    await tela.abrir([{ name: 'original.pdf' }]);
    await tela.abrir([{ name: 'atualizado.pdf' }]);

    expect(raiz.querySelectorAll('.material')).toHaveLength(1);
    expect(raiz.querySelector('.material__titulo').textContent).toBe('Atualizado');
  });

  test('combina palavras sem contexto e encaminha uma lista individual para estudar', async () => {
    const pacote = (id, itens) => ({
      ...criarPacote({
        tipo: 'palavras',
        titulo: id,
        idioma: 'en-US',
        id,
        itens,
      }),
      nomeArquivo: `${id}.pdf`,
    });
    const primeiro = pacote('one', ['apple']);
    const segundo = pacote('two', ['pear']);
    mocks.lerArquivo.mockResolvedValueOnce([primeiro]).mockResolvedValueOnce([segundo]);

    tela = new ReviewScreen();
    tela.montar(raiz);
    await tela.abrir([{ name: 'one.pdf' }]);
    raiz.querySelector('[data-acao="estudar"]').click();
    expect(navegar).toHaveBeenLastCalledWith(
      'palavras',
      expect.objectContaining({ itens: ['apple'], material: expect.any(Object) })
    );

    await tela.abrir([{ name: 'two.pdf' }]);
    raiz.querySelector('[data-combinar="palavras"]').click();
    expect(navegar).toHaveBeenLastCalledWith(
      'palavras',
      expect.objectContaining({ itens: ['apple', 'pear'], contextos: ['', ''] })
    );
  });
});
