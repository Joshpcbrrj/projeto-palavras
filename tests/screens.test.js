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
import { toast } from '../js/ui/toast.js';

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
  test('a entrada de frases atualiza os estados vazio, inválido, singular e plural', async () => {
    vi.useFakeTimers();
    tela = new StudyScreen('frases');
    tela.montar(raiz);

    const area = raiz.querySelector('#textoEntrada');
    const continuar = raiz.querySelector('#btnContinuar');
    expect(raiz.querySelector('label[for="textoEntrada"]').textContent).toContain('frases');
    expect(continuar.disabled).toBe(true);
    expect(raiz.querySelector('#contagemItens').textContent).toBe('');

    area.value = '!!!';
    area.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(200);
    expect(raiz.querySelector('#contagemItens').textContent).toContain('Nenhuma frase encontrada');
    expect(continuar.disabled).toBe(true);
    continuar.dispatchEvent(new Event('click'));
    expect(raiz.querySelector('#cfgQuantidade')).toBeNull();

    area.value = 'Hello.';
    area.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(200);
    expect(raiz.querySelector('#contagemItens').textContent).toContain('1 frase encontrada(s)');

    area.value = 'Hello. Goodbye!';
    area.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(200);
    expect(raiz.querySelector('#contagemItens').textContent).toContain('2 frases encontrada(s)');
    clicar('#btnContinuar');
    expect(raiz.querySelector('#cfgQuantidade').max).toBe('2');
  });

  test('o exemplo preenche inglês e a seleção de arquivo vazia não altera o texto', () => {
    tela = new StudyScreen('palavras');
    tela.montar(raiz);
    const area = raiz.querySelector('#textoEntrada');

    raiz.querySelector('#arquivoTexto').dispatchEvent(new Event('change'));
    expect(area.value).toBe('');

    clicar('#btnExemplo');
    expect(area.value).toContain('apple');
    expect(tela.config.idioma).toBe('en-US');
    expect(raiz.querySelector('#btnContinuar').disabled).toBe(false);
  });

  test('a configuração mantém quantidade válida e limita valores de pausa', () => {
    tela = new StudyScreen('palavras', { itens: ['one', 'two'] });
    tela.config.quantidade = 1;
    tela.montar(raiz);

    const quantidade = raiz.querySelector('#cfgQuantidade');
    expect(quantidade.value).toBe('1');
    quantidade.value = '2';
    quantidade.dispatchEvent(new Event('input'));
    expect(tela.config.quantidade).toBe(2);
    expect(raiz.querySelector('#cfgQuantidadeValor').textContent).toBe('2');

    const tempo = raiz.querySelector('#cfgTempo');
    const tempoPadrao = tela.config.tempo;
    tempo.value = '';
    tempo.dispatchEvent(new Event('change'));
    expect(tela.config.tempo).toBe(tempoPadrao);
    tempo.value = 'inválido';
    tempo.dispatchEvent(new Event('change'));
    expect(tela.config.tempo).toBe(tempoPadrao);
    Object.defineProperty(tempo, 'value', {
      configurable: true,
      get: () => 'inválido',
    });
    tempo.dispatchEvent(new Event('change'));
    expect(tela.config.tempo).toBe(tempoPadrao);
    delete tempo.value;
    tempo.value = '0';
    tempo.dispatchEvent(new Event('change'));
    expect(tela.config.tempo).toBe(Number(tempo.min));
    expect(tempo.value).toBe(tempo.min);
  });

  test('pronunciar respeita cancelamento, avisa uma vez e repete áudio com sucesso', async () => {
    vi.useFakeTimers();
    tela = new StudyScreen('palavras');
    const avisar = vi.spyOn(toast, 'aviso').mockImplementation(() => {});
    const falar = vi.spyOn(speaker, 'falar').mockResolvedValue(false);
    const controle = new AbortController();
    controle.abort();

    await expect(tela.pronunciar('hello', controle.signal)).resolves.toBe(false);
    expect(falar).not.toHaveBeenCalled();
    await expect(tela.pronunciar('hello')).resolves.toBe(false);
    await expect(tela.pronunciar('again')).resolves.toBe(false);
    expect(avisar).toHaveBeenCalledOnce();

    falar.mockResolvedValue(true);
    tela.config.repeticoes = 2;
    const repeticao = tela.pronunciar('hello');
    await vi.advanceTimersByTimeAsync(450);
    await expect(repeticao).resolves.toBe(true);
    expect(falar).toHaveBeenCalledTimes(4);
  });

  test('a sessão automática encaminha o item à voz configurada', async () => {
    vi.useFakeTimers();
    const falar = vi.spyOn(speaker, 'falar').mockResolvedValue(true);
    tela = new StudyScreen('palavras', { itens: ['apple'], idioma: 'en-US' });
    tela.config.embaralhar = false;
    tela.montar(raiz);
    clicar('#btnIniciar');
    await vi.advanceTimersByTimeAsync(0);

    expect(falar).toHaveBeenCalledWith(
      'apple',
      expect.objectContaining({ idioma: 'en-US', velocidade: tela.config.velocidade })
    );
    clicar('#btnEncerrar');
  });

  test('dimensiona flashcards em todas as faixas e tolera renderizações obsoletas', async () => {
    vi.useFakeTimers();
    settings.set('audioAutomatico', false);
    tela = new StudyScreen('palavras', { itens: ['short'] });
    tela.config.embaralhar = false;
    tela.montar(raiz);
    clicar('#btnIniciar');
    await vi.advanceTimersByTimeAsync(0);

    const texto = raiz.querySelector('#flashcardTexto');
    expect(texto.dataset.tamanho).toBe('g');
    tela.mostrarItem('x'.repeat(15), 0, 1);
    expect(texto.dataset.tamanho).toBe('m');
    tela.mostrarItem('x'.repeat(61), 0, 1);
    expect(texto.dataset.tamanho).toBe('p');
    tela.mostrarItem('x'.repeat(121), 0, 1);
    expect(texto.dataset.tamanho).toBe('pp');

    tela.irPara(2);
    expect(raiz.querySelector('#flashcardTexto').textContent).toBe('SHORT');
    tela.encerrarSessao();
    raiz.replaceChildren();
    expect(() => tela.mostrarItem('stale', 0, 1)).not.toThrow();
    expect(() => tela.atualizarEstado('rodando')).not.toThrow();
  });

  test('escuta ativa pode terminar sem classificação e distingue itens vistos de todos', async () => {
    vi.useFakeTimers();
    tela = new StudyScreen('frases', {
      itens: ['A primeira frase.', 'A segunda frase.'],
      escutaAtiva: true,
    });
    tela.config.embaralhar = false;
    expect(tela.itensMarcadosEscuta('revisar')).toEqual([]);
    tela.marcarEscuta('revisar');
    tela.encerrarSessao();
    tela.atualizarRevisao();

    tela.montar(raiz);
    clicar('#btnIniciar');
    await vi.advanceTimersByTimeAsync(0);
    const indiceInicial = tela.sessao.indice;
    tela.avancarEstudo();
    raiz.querySelector('#btnRevelar').dispatchEvent(new Event('click'));
    expect(tela.sessao.indice).toBe(indiceInicial);
    expect(raiz.querySelector('#flashcardTexto').textContent).toContain('Ouça a frase');

    clicar('#btnEncerrar');
    expect(raiz.querySelector('.resultado__titulo').textContent).toBe('Sessão encerrada');
    expect(raiz.querySelector('input[name="pdfItens"][value="revisar"]').disabled).toBe(true);
    expect(raiz.querySelector('input[name="pdfItens"][value="entendi"]').disabled).toBe(true);
    expect(raiz.querySelector('input[name="pdfItens"][value="todos"]').checked).toBe(true);

    clicar('#btnLista');
    expect(raiz.querySelector('#btnLista').getAttribute('aria-expanded')).toBe('true');
    clicar('#btnLista');
    expect(raiz.querySelector('#btnLista').getAttribute('aria-expanded')).toBe('false');

    raiz.querySelector('input[name="pdfItens"][value="vistos"]').click();
    clicar('#btnExportar');
    await vi.waitFor(() => expect(mocks.exportarPdfComBotao).toHaveBeenCalledOnce());
    expect(mocks.exportarPdfComBotao.mock.calls[0][1].itens).toEqual(['A primeira frase.']);
  });

  test('escuta ativa informa falha de áudio e erro do navegador sem travar o botão', async () => {
    const erro = vi.spyOn(toast, 'erro').mockImplementation(() => {});
    tela = new StudyScreen('frases', { itens: ['Hello.'], escutaAtiva: true });
    tela.montar(raiz);
    await tela.ouvirFraseAtiva();

    tela.sessao = { itemAtual: 'Hello.' };
    const ouvir = document.createElement('button');
    ouvir.id = 'btnOuvir';
    raiz.append(ouvir);
    const revelar = document.createElement('button');
    revelar.id = 'btnRevelar';
    raiz.append(revelar);
    const status = document.createElement('p');
    status.id = 'escutaAtivaStatus';
    raiz.append(status);

    const falar = vi.spyOn(speaker, 'falar').mockResolvedValue(false);
    await tela.ouvirFraseAtiva();
    expect(status.textContent).toContain('Não foi possível reproduzir o áudio');
    expect(ouvir.disabled).toBe(false);

    falar.mockRejectedValue(new Error('falha de teste'));
    await tela.ouvirFraseAtiva();
    expect(erro).toHaveBeenCalledWith('Não foi possível reproduzir a frase: falha de teste');
    expect(ouvir.disabled).toBe(false);
    tela.sessao = null;
  });

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

  test('material sem revisão não mostra o selo de agenda', () => {
    const material = criarPacote({
      tipo: 'frases',
      titulo: 'Sem agenda',
      itens: ['Good morning.'],
      revisao: null,
    });
    tela = new StudyScreen('frases', { itens: material.itens, material });
    tela.montar(raiz);
    expect(raiz.querySelector('.cartao--info .selo')).toBeNull();
  });

  test('concluir revisão avança a agenda uma vez e gera o PDF com o novo prazo', async () => {
    vi.useFakeTimers();
    settings.set('audioAutomatico', false);
    const material = criarPacote({
      tipo: 'palavras',
      titulo: 'Revisão',
      itens: ['apple'],
      revisao: {
        etapa: 0,
        intervaloDias: 1,
        revisarEm: '2026-11-23',
        historico: [],
      },
    });
    tela = new StudyScreen('palavras', { itens: material.itens, material });
    tela.config.embaralhar = false;
    tela.montar(raiz);
    clicar('#btnIniciar');
    await vi.advanceTimersByTimeAsync(2000);

    expect(tela.material.revisao.etapa).toBe(1);
    expect(raiz.textContent).toContain('Baixe um novo PDF para guardar a próxima revisão');
    tela.atualizarRevisao();
    expect(tela.material.revisao.etapa).toBe(1);

    mocks.exportarPdfComBotao.mockResolvedValueOnce({
      pacote: { ...material, titulo: 'PDF atualizado' },
    });
    clicar('#btnExportar');
    await vi.waitFor(() => expect(mocks.exportarPdfComBotao).toHaveBeenCalledOnce());
    expect(mocks.exportarPdfComBotao.mock.calls[0][1]).toMatchObject({
      id: material.id,
      revisao: { etapa: 1, intervaloDias: 3, historico: [expect.any(String)] },
    });
    await vi.waitFor(() => expect(tela.material.titulo).toBe('PDF atualizado'));
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

    const input = document.createElement('input');
    raiz.append(input);
    const itemInicial = raiz.querySelector('#flashcardTexto').textContent;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', metaKey: true }));
    raiz
      .querySelector('#btnOuvir')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(raiz.querySelector('#flashcardTexto').textContent).toBe(itemInicial);

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
      contextos: ['Um contexto para a primeira.', ''],
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
    raiz.querySelector('#pdfTitulo').value = '';
    clicar('#btnExportar');
    await vi.waitFor(() => expect(mocks.exportarPdfComBotao).toHaveBeenCalledOnce());
    expect(mocks.exportarPdfComBotao.mock.calls[0][1]).toMatchObject({
      titulo: 'Frases estudadas',
      itens: ['A primeira frase.'],
      contextos: ['Um contexto para a primeira.'],
    });

    raiz.querySelector('input[name="pdfItens"][value="entendi"]').click();
    clicar('#btnExportar');
    await vi.waitFor(() => expect(mocks.exportarPdfComBotao).toHaveBeenCalledTimes(2));
    expect(mocks.exportarPdfComBotao.mock.calls[1][1].itens).toEqual(['A segunda frase.']);

    raiz.querySelector('input[name="pdfItens"][value="todos"]').click();
    clicar('#btnExportar');
    await vi.waitFor(() => expect(mocks.exportarPdfComBotao).toHaveBeenCalledTimes(3));
    expect(mocks.exportarPdfComBotao.mock.calls[2][1].itens).toEqual([
      'A primeira frase.',
      'A segunda frase.',
    ]);
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
