import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../js/pdf/exporter.js', async (importOriginal) => ({
  ...(await importOriginal()),
  exportarPdf: vi.fn(async (_pacote, { nomeArquivo } = {}) => nomeArquivo || 'texto-gerado.pdf'),
}));

const { TextScreen } = await import('../js/screens/TextScreen.js');
const { settings } = await import('../js/services/settings.js');
const { exportarPdf } = await import('../js/pdf/exporter.js');
const { criarPacote } = await import('../js/pdf/format.js');

let raiz;
let tela;

beforeEach(() => {
  localStorage.clear();
  settings._resetar();
  exportarPdf.mockClear();
  document.body.innerHTML = '<main id="app"></main>';
  raiz = document.getElementById('app');
});

afterEach(() => {
  tela?.desmontar();
  tela = null;
});

describe('fluxo do texto próprio até o PDF revisável', () => {
  test('exporta o texto colado e não grava conteúdo no navegador', async () => {
    tela = new TextScreen();
    tela.montar(raiz);

    const botoesExportacao = [...raiz.querySelectorAll('.acoes--exportacao button')];
    expect(botoesExportacao.map((botao) => botao.id)).toEqual([
      'btnKit',
      'btnExportarTexto',
      'btnExportarMp3',
    ]);
    expect(botoesExportacao.map((botao) => botao.textContent.trim())).toEqual([
      '📦 Exportar kit (PDF + MP3)',
      '📄 Exportar apenas PDF',
      '🎵 Exportar apenas áudio MP3',
    ]);

    const titulo = raiz.querySelector('#textoTitulo');
    titulo.value = 'Minha leitura';
    titulo.dispatchEvent(new Event('input'));

    const idioma = raiz.querySelector('#textoIdioma');
    idioma.value = 'pt-BR';
    idioma.dispatchEvent(new Event('change'));

    const conteudo = raiz.querySelector('#textoConteudo');
    conteudo.value = 'Primeiro parágrafo.\n\nSegundo parágrafo.';
    conteudo.dispatchEvent(new Event('input'));

    raiz.querySelector('#textoRevisao').value = '7';
    raiz.querySelector('#btnExportarTexto').click();

    await vi.waitFor(() => expect(exportarPdf).toHaveBeenCalledOnce());

    const [pacote] = exportarPdf.mock.calls[0];
    expect(pacote).toMatchObject({
      tipo: 'texto',
      titulo: 'Minha leitura',
      idioma: 'pt-BR',
      texto: 'Primeiro parágrafo.\n\nSegundo parágrafo.',
      revisao: { intervaloDias: 7 },
    });
    expect(localStorage.getItem('progresso_estudo')).toBeNull();
    expect(localStorage.getItem('ap_rascunho_texto')).toBeNull();
  });

  test('reaproveita a tradução do PDF reaberto e invalida quando o texto muda', async () => {
    const material = criarPacote({
      tipo: 'texto',
      titulo: 'Artigo',
      idioma: 'en-US',
      texto: 'A short article.',
      traducao: 'Um artigo curto.',
    });
    tela = new TextScreen({ material });
    tela.montar(raiz);
    raiz.querySelector('#btnExportarTexto').click();
    await vi.waitFor(() => expect(exportarPdf).toHaveBeenCalledOnce());
    expect(exportarPdf.mock.calls[0][0].traducao).toBe('Um artigo curto.');

    raiz.querySelector('#abaEditar').click();
    raiz.querySelector('#textoTitulo').value = '';
    raiz.querySelector('#textoTitulo').dispatchEvent(new Event('input'));
    const conteudo = raiz.querySelector('#textoConteudo');
    conteudo.value = 'A changed article.';
    conteudo.dispatchEvent(new Event('input'));
    raiz.querySelector('#textoRevisao').value = '0';
    raiz.querySelector('#btnExportarTexto').click();
    await vi.waitFor(() => expect(exportarPdf).toHaveBeenCalledTimes(2));

    expect(exportarPdf.mock.calls[1][0]).toMatchObject({
      titulo: 'Texto de estudo',
      texto: 'A changed article.',
      revisao: null,
    });
    expect(exportarPdf.mock.calls[1][0]).not.toHaveProperty('traducao');
  });
});
