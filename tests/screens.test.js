/**
 * Testes de interface: monta as telas reais no DOM (jsdom) e simula o uso.
 * Sem síntese de voz no jsdom, o áudio é ignorado e o fluxo continua.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ exportarPdfComBotao: vi.fn() }));
vi.mock('../js/ui/exportActions.js', async (importOriginal) => ({
  ...(await importOriginal()),
  exportarPdfComBotao: mocks.exportarPdfComBotao,
}));

import { MenuScreen } from '../js/screens/MenuScreen.js';
import { StudyScreen } from '../js/screens/StudyScreen.js';
import { TextScreen } from '../js/screens/TextScreen.js';
import { ReviewScreen, _limparMateriaisAbertos } from '../js/screens/ReviewScreen.js';
import { settings } from '../js/services/settings.js';
import { criarPacote } from '../js/pdf/format.js';
import { speaker } from '../js/audio/index.js';
import { definirNavegador } from '../js/core/nav.js';

let raiz;
let tela;
let navegar;

beforeEach(() => {
  localStorage.clear();
  settings._resetar();
  _limparMateriaisAbertos();
  mocks.exportarPdfComBotao.mockReset();
  navegar = vi.fn();
  definirNavegador(navegar);
  document.body.innerHTML = '<main id="app"></main>';
  raiz = document.getElementById('app');
});

afterEach(() => {
  tela?.desmontar?.();
  tela = null;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const clicar = (seletor) => raiz.querySelector(seletor).click();

describe('Menu', () => {
  test('oferece os três tipos de estudo e revisão sem criação por IA ou painel de progresso', () => {
    tela = new MenuScreen();
    tela.montar(raiz);
    expect(raiz.querySelectorAll('.modo')).toHaveLength(3);
    expect(raiz.querySelector('a[href="#/texto"]')).not.toBeNull();
    expect(raiz.querySelector('a[href="#/frases"]')).not.toBeNull();
    expect(raiz.querySelector('a[href="#/palavras"]')).not.toBeNull();
    expect(raiz.textContent).toContain('Abrir PDF ou arquivo para estudar/revisar');
    expect(raiz.textContent).not.toMatch(/sessões|progresso|Gemini|criar textos/i);
  });
});

describe('Estudo de palavras (fluxo completo)', () => {
  test('o modo palavras inclui termos comuns quando a pessoa os fornece explicitamente', () => {
    tela = new StudyScreen('palavras', { idioma: 'en-US' });
    tela.montar(raiz);

    expect(raiz.querySelector('label[for="textoEntrada"]').textContent).toContain(
      'palavras soltas'
    );
    expect(tela.extrair('the\nto\napple')).toEqual(['the', 'to', 'apple']);
  });

  test('texto → configuração → estudo → resultado sem persistir progresso', async () => {
    vi.useFakeTimers();
    tela = new StudyScreen('palavras');
    tela.montar(raiz);

    const area = raiz.querySelector('#textoEntrada');
    area.value = 'casa carro casa sol';
    area.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(200);
    expect(raiz.querySelector('#contagemItens').textContent).toContain('3');
    clicar('#btnContinuar');

    expect(raiz.querySelector('#cfgQuantidade').max).toBe('3');
    raiz.querySelector('#cfgAudio').click(); // desliga o áudio
    const tempo = raiz.querySelector('#cfgTempo');
    tempo.value = '1';
    tempo.dispatchEvent(new Event('change'));
    clicar('#btnIniciar');

    await vi.advanceTimersByTimeAsync(0);
    const primeiro = raiz.querySelector('#flashcardTexto').textContent;
    expect(['CASA', 'CARRO', 'SOL']).toContain(primeiro);
    expect(raiz.querySelector('#estudoContador').textContent).toBe('Palavra 1 de 3');

    await vi.advanceTimersByTimeAsync(3000);
    expect(raiz.querySelector('.resultado__titulo').textContent).toBe('Estudo concluído!');
    const botoesExportacao = [...raiz.querySelectorAll('.acoes--exportacao button')];
    expect(botoesExportacao.map((botao) => botao.id)).toEqual([
      'btnKit',
      'btnExportar',
      'btnExportarMp3',
    ]);
    expect(botoesExportacao.map((botao) => botao.textContent.trim())).toEqual([
      '📦 Exportar kit (PDF + MP3)',
      '📄 Exportar apenas PDF',
      '🎵 Exportar apenas áudio MP3',
    ]);
    expect(localStorage.getItem('progresso_estudo')).toBeNull();
  });

  test('itens vindos de um PDF pulam direto para a configuração', () => {
    const material = criarPacote({
      tipo: 'frases',
      titulo: 'Do PDF',
      itens: ['Bom dia', 'Boa noite'],
    });
    tela = new StudyScreen('frases', { itens: material.itens, material });
    tela.montar(raiz);
    expect(raiz.querySelector('#btnIniciar')).not.toBeNull();
    expect(raiz.textContent).toContain('Do PDF');
  });

  test('palavras capturadas no leitor levam a frase de origem para o estudo', () => {
    const material = criarPacote({
      tipo: 'texto',
      titulo: 'Texto de teste',
      idioma: 'en-US',
      texto: 'An apple fell to the ground.',
    });
    tela = new TextScreen({ material });
    tela.montar(raiz);

    const trecho = raiz.querySelector('.leitor__trecho').firstChild;
    const range = document.createRange();
    range.setStart(trecho, 3);
    range.setEnd(trecho, 8);
    const selecao = window.getSelection();
    selecao.removeAllRanges();
    selecao.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));

    expect(raiz.querySelector('#btnCapturarPalavra').disabled).toBe(false);
    clicar('#btnCapturarPalavra');
    expect(tela.palavrasCapturadas).toEqual(['apple']);
    expect(tela.contextosCapturados).toEqual(['An apple fell to the ground.']);

    clicar('#btnEstudarCapturadas');
    expect(navegar).toHaveBeenCalledWith(
      'palavras',
      expect.objectContaining({
        itens: ['apple'],
        contextos: ['An apple fell to the ground.'],
        idioma: 'en-US',
      })
    );
  });

  test('expressões selecionadas também são capturadas como um único item', () => {
    const material = criarPacote({
      tipo: 'texto',
      idioma: 'en-US',
      texto: 'An apple fell to the ground.',
    });
    tela = new TextScreen({ material });
    tela.montar(raiz);

    const trecho = raiz.querySelector('.leitor__trecho').firstChild;
    const range = document.createRange();
    range.setStart(trecho, 3);
    range.setEnd(trecho, 13);
    const selecao = window.getSelection();
    selecao.removeAllRanges();
    selecao.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));

    expect(raiz.querySelector('#btnCapturarPalavra').disabled).toBe(false);
    clicar('#btnCapturarPalavra');
    expect(tela.palavrasCapturadas).toEqual(['apple fell']);
    expect(tela.contextosCapturados).toEqual(['An apple fell to the ground.']);
  });

  test('palavra capturada exibe o contexto durante o estudo', async () => {
    vi.useFakeTimers();
    settings.set('audioAutomatico', false);
    tela = new StudyScreen('palavras', {
      itens: ['apple'],
      contextos: ['An apple fell to the ground.'],
    });
    tela.montar(raiz);
    clicar('#btnIniciar');
    await vi.advanceTimersByTimeAsync(0);

    expect(raiz.querySelector('#flashcardContexto').textContent).toBe(
      'An apple fell to the ground.'
    );
    expect(raiz.querySelector('#flashcardContexto').hidden).toBe(false);
  });

  test('textos com HTML são exibidos como texto, nunca executados', async () => {
    vi.useFakeTimers();
    const malicioso = '<img src=x onerror="window.invadido=true">';
    tela = new StudyScreen('frases', { itens: [malicioso] });
    tela.montar(raiz);
    raiz.querySelector('#cfgAudio').click();
    clicar('#btnIniciar');
    await vi.advanceTimersByTimeAsync(0);
    expect(raiz.querySelector('#flashcardTexto').textContent).toBe(malicioso);
    expect(raiz.querySelector('img')).toBeNull();
    clicar('#btnEncerrar');
    clicar('#btnLista');
    expect(raiz.querySelector('#listaItens').textContent).toContain(malicioso);
    expect(raiz.querySelector('#listaItens img')).toBeNull();
    expect(window.invadido).toBeUndefined();
  });

  test('atalhos de teclado controlam o estudo', async () => {
    vi.useFakeTimers();
    tela = new StudyScreen('palavras', { itens: ['um', 'dois', 'três'] });
    tela.montar(raiz);
    raiz.querySelector('#cfgAudio').click();
    raiz.querySelector('#cfgEmbaralhar').click();
    clicar('#btnIniciar');
    await vi.advanceTimersByTimeAsync(0);

    const tecla = (key) =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    tecla(' ');
    expect(raiz.querySelector('#estudoEstado').textContent).toBe('Pausado');
    tecla('ArrowRight');
    expect(raiz.querySelector('#flashcardTexto').textContent).toBe('DOIS');
    tecla('ArrowLeft');
    expect(raiz.querySelector('#flashcardTexto').textContent).toBe('UM');
    tecla('Escape');
    expect(raiz.querySelector('.resultado__titulo').textContent).toBe('Sessão encerrada');
  });

  test('escuta ativa exige ouvir, revelar e classificar antes de avançar e exporta as classificações', async () => {
    vi.useFakeTimers();
    vi.spyOn(speaker, 'falar').mockResolvedValue(true);
    tela = new StudyScreen('frases', {
      itens: ['A primeira frase.', 'A segunda frase.'],
      escutaAtiva: true,
    });
    tela.montar(raiz);
    tela.config.embaralhar = false;
    clicar('#btnIniciar');
    await vi.advanceTimersByTimeAsync(0);

    expect(tela.sessao.indice).toBe(0);
    expect(raiz.querySelector('#flashcardTexto').textContent).toContain('Ouça a frase');
    expect(raiz.querySelector('#btnProximo').disabled).toBe(true);
    clicar('#btnOuvir');
    await vi.advanceTimersByTimeAsync(0);
    expect(tela.sessao.indice).toBe(0);
    expect(raiz.querySelector('#btnRevelar').disabled).toBe(false);
    expect(raiz.querySelector('#flashcardTexto').textContent).not.toContain('A primeira frase');

    clicar('#btnRevelar');
    expect(raiz.querySelector('#flashcardTexto').textContent).toBe('A primeira frase.');
    clicar('[data-escuta="revisar"]');
    await vi.advanceTimersByTimeAsync(0);
    expect(raiz.querySelector('#flashcardTexto').textContent).toContain('Ouça a frase');

    clicar('#btnOuvir');
    await vi.advanceTimersByTimeAsync(0);
    clicar('#btnRevelar');
    clicar('[data-escuta="entendi"]');
    await vi.advanceTimersByTimeAsync(0);

    expect(raiz.querySelector('.resultado__titulo').textContent).toBe('Estudo concluído!');
    expect(raiz.textContent).toMatch(/Para revisar:\s*1/);
    expect(raiz.querySelector('input[name="pdfItens"][value="revisar"]').checked).toBe(true);
    expect(tela.itensMarcadosEscuta('revisar')).toEqual(['A primeira frase.']);
    expect(tela.itensMarcadosEscuta('entendi')).toEqual(['A segunda frase.']);
    clicar('#btnExportar');
    await vi.waitFor(() => expect(mocks.exportarPdfComBotao).toHaveBeenCalledOnce());
    expect(mocks.exportarPdfComBotao.mock.calls[0][1]).toMatchObject({
      itens: ['A primeira frase.'],
    });
  });
});

describe('Revisar arquivo', () => {
  test('a tela de revisão começa vazia', () => {
    tela = new ReviewScreen();
    tela.montar(raiz);
    expect(raiz.textContent).toContain('PDFs com texto selecionável');
    expect(raiz.textContent).toContain(
      'PDFs digitalizados sem texto selecionável não são suportados'
    );
    expect(raiz.textContent).toContain('para estudar o conteúdo');
    expect(raiz.textContent).toContain('Nenhum arquivo aberto');
  });
});
