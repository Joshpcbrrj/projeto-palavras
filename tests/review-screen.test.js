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
    const pacote = (id, itens, traducao) => ({
      ...criarPacote({
        tipo: 'palavras',
        titulo: id,
        idioma: 'en-US',
        id,
        itens,
        traducao,
      }),
      nomeArquivo: `${id}.pdf`,
    });
    const primeira = pacote('one', ['apple', 'banana'], ['maçã', 'banana']);
    const segunda = pacote('two', ['banana', 'orange'], ['banana', 'laranja']);
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
      .mockRejectedValueOnce(new Error('Arquivo inválido.'));

    tela = new ReviewScreen();
    tela.montar(raiz);
    await tela.abrir([
      { name: 'notes.mp3', type: 'audio/mpeg' },
      { name: 'notes.pdf', type: 'application/pdf' },
      { name: 'broken.txt', type: 'text/plain' },
    ]);

    expect(mocks.lerArquivo).toHaveBeenCalledTimes(2);
    expect(toast.info).toHaveBeenCalledWith(
      'O MP3 foi ignorado: o PDF do kit já guarda o conteúdo e a revisão.'
    );
    expect(toast.sucesso).toHaveBeenCalledWith('Arquivo aberto.');
    expect(toast.erro).toHaveBeenCalledWith('Arquivo inválido.');
    expect(erro).toHaveBeenCalledOnce();
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
});
