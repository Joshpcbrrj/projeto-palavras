import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ lerArquivo: vi.fn() }));

vi.mock('../js/pdf/importer.js', async (importOriginal) => ({
  ...(await importOriginal()),
  lerArquivo: mocks.lerArquivo,
}));

const { ReviewScreen, _limparMateriaisAbertos } = await import('../js/screens/ReviewScreen.js');
const { definirNavegador } = await import('../js/core/nav.js');
const { criarPacote, criarRevisao } = await import('../js/pdf/format.js');

let raiz;
let navegar;
let tela;

beforeEach(() => {
  localStorage.clear();
  _limparMateriaisAbertos();
  mocks.lerArquivo.mockReset();
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
});
