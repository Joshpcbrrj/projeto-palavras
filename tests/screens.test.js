/**
 * Testes de interface: monta as telas reais no DOM (jsdom) e simula o uso.
 * Sem síntese de voz no jsdom, o áudio é ignorado e o fluxo continua.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MenuScreen } from '../js/screens/MenuScreen.js';
import { StudyScreen } from '../js/screens/StudyScreen.js';
import { ReviewScreen, _limparMateriaisAbertos } from '../js/screens/ReviewScreen.js';
import { ProgressScreen } from '../js/screens/ProgressScreen.js';
import { _resetarProgresso, progresso } from '../js/services/progress.js';
import { settings } from '../js/services/settings.js';
import { criarPacote, criarRevisao } from '../js/pdf/format.js';

let raiz;
let tela;

beforeEach(() => {
  localStorage.clear();
  settings._resetar();
  _resetarProgresso();
  _limparMateriaisAbertos();
  document.body.innerHTML = '<main id="app"></main>';
  raiz = document.getElementById('app');
});

afterEach(() => {
  tela?.desmontar?.();
  tela = null;
  vi.useRealTimers();
});

const clicar = (seletor) => raiz.querySelector(seletor).click();

describe('Menu', () => {
  test('mostra os cinco modos (com Criar textos em destaque) e o resumo', () => {
    tela = new MenuScreen();
    tela.montar(raiz);
    expect(raiz.querySelectorAll('.modo')).toHaveLength(5);
    expect(raiz.querySelector('.modo--destaque').getAttribute('href')).toBe('#/criar');
    expect(raiz.querySelector('.resumo').textContent).toContain('sessões');
    expect(raiz.querySelector('.cartao--destaque')).toBeNull();
  });

  test('destaca revisões pendentes', () => {
    progresso().salvarMaterial(
      criarPacote({
        tipo: 'palavras',
        titulo: 'Lição atrasada',
        itens: ['a'],
        revisao: criarRevisao({ revisarEm: '2020-01-01' }),
      })
    );
    tela = new MenuScreen();
    tela.montar(raiz);
    const painel = raiz.querySelector('.cartao--destaque');
    expect(painel.textContent).toContain('Lição atrasada');
    expect(painel.textContent).toMatch(/atrasada há \d+ dias/);
  });
});

describe('Estudo de palavras (fluxo completo)', () => {
  test('texto → configuração → estudo → resultado, registrando o progresso', async () => {
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
    expect(progresso().estatisticas()).toMatchObject({
      sessoes: 1,
      palavras: 3,
      palavrasUnicas: 3,
    });
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
});

describe('Revisar e Progresso', () => {
  test('a tela de revisão começa vazia', () => {
    tela = new ReviewScreen();
    tela.montar(raiz);
    expect(raiz.textContent).toContain('Nenhum arquivo aberto');
  });

  test('a tela de progresso lista sessões e agenda', () => {
    progresso().registrarSessao({ tipo: 'frases', itens: ['Olá'], segundos: 30, titulo: 'Aula 1' });
    progresso().salvarMaterial(
      criarPacote({ tipo: 'texto', titulo: 'Texto agendado', texto: 'Oi', revisao: criarRevisao() })
    );
    tela = new ProgressScreen();
    tela.montar(raiz);
    expect(raiz.querySelector('.tabela').textContent).toContain('Aula 1');
    expect(raiz.textContent).toContain('Texto agendado');
  });
});
