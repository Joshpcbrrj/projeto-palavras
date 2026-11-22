import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TextScreen } from '../js/screens/TextScreen.js';
import { criarRouter } from '../js/core/router.js';
import { definirNavegador } from '../js/core/nav.js';
import { settings } from '../js/services/settings.js';
import { criarPacote } from '../js/pdf/format.js';
import { toast } from '../js/ui/toast.js';
import { ESTADOS_LEITOR } from '../js/audio/reader.js';

let raiz;
beforeEach(() => {
  localStorage.clear();
  settings._resetar();
  document.body.innerHTML = '<main id="app"></main>';
  raiz = document.getElementById('app');
});
afterEach(() => vi.restoreAllMocks());

describe('Ler e ouvir um texto', () => {
  test('editor mostra estatísticas e não persiste o rascunho', () => {
    const tela = new TextScreen();
    tela.montar(raiz);
    const area = raiz.querySelector('#textoConteudo');
    area.value = 'Olá mundo. Tudo bem?';
    area.dispatchEvent(new Event('input'));
    expect(raiz.querySelector('#textoEstatisticas').textContent).toContain('4 palavras · 2 frases');
    expect(localStorage.getItem('ap_rascunho_texto')).toBeNull();

    const nova = new TextScreen();
    nova.montar(raiz);
    expect(raiz.querySelector('#textoConteudo').value).toBe('');
    tela.desmontar();
    nova.desmontar();
  });

  test('não abre o modo ouvir sem texto', () => {
    const tela = new TextScreen();
    tela.montar(raiz);
    raiz.querySelector('#abaEditar').click();
    raiz.querySelector('#abaOuvir').click();
    expect(raiz.querySelector('#leitorTexto')).toBeNull();
    tela.desmontar();
  });

  test('material de um PDF abre direto no modo ouvir, com uma marcação por frase', () => {
    const material = criarPacote({
      tipo: 'texto',
      titulo: 'Lisboa',
      idioma: 'en-US',
      texto: 'One. Two!\nThree?',
    });
    const tela = new TextScreen({ material });
    tela.montar(raiz);
    const trechos = raiz.querySelectorAll('[data-trecho]');
    expect([...trechos].map((t) => t.textContent)).toEqual(['One.', 'Two!', 'Three?']);
    expect(raiz.querySelector('#leitorTexto').textContent).toBe('One. Two!\nThree?');
    expect(raiz.querySelector('#leitorPosicao').textContent).toBe('Frase 1 de 3');

    raiz.querySelector('#btnFraseProxima').click();
    expect(raiz.querySelector('#leitorPosicao').textContent).toBe('Frase 2 de 3');
    raiz.querySelector('#abaOuvir').click();
    raiz.querySelector('#abaEditar').click();
    expect(raiz.querySelector('#textoConteudo').value).toBe('One. Two!\nThree?');
    raiz.querySelector('#abaEditar').click();
    raiz.querySelector('#abaOuvir').click();
    expect(raiz.querySelector('#leitorTexto')).not.toBeNull();
    tela.desmontar();
  });

  test('"Estudar as palavras" leva os itens do texto (sem as muito comuns) para os flashcards', () => {
    const navegar = vi.fn();
    definirNavegador(navegar);
    const tela = new TextScreen();
    tela.montar(raiz);
    const area = raiz.querySelector('#textoConteudo');
    area.value = 'The cat and the dog.';
    area.dispatchEvent(new Event('input'));
    raiz.querySelector('#btnEstudarPalavras').click();
    expect(navegar).toHaveBeenCalledWith(
      'palavras',
      expect.objectContaining({ itens: ['cat', 'dog'] })
    );
    area.value = 'Good morning. See you soon.';
    area.dispatchEvent(new Event('input'));
    raiz.querySelector('#btnEstudarFrases').click();
    expect(navegar).toHaveBeenLastCalledWith(
      'frases',
      expect.objectContaining({ itens: ['Good morning', 'See you soon'] })
    );
    tela.desmontar();
  });

  test('abre arquivo de texto, preenche título e limpa todo o conteúdo editável', async () => {
    const tela = new TextScreen();
    tela.montar(raiz);
    const arquivo = new File(['A short lesson.'], 'lesson.md', { type: 'text/markdown' });
    const entrada = raiz.querySelector('#textoArquivo');
    entrada.dispatchEvent(new Event('change'));
    expect(raiz.querySelector('#textoConteudo').value).toBe('');
    Object.defineProperty(entrada, 'files', { configurable: true, value: [arquivo] });
    entrada.dispatchEvent(new Event('change'));

    await vi.waitFor(() =>
      expect(raiz.querySelector('#textoConteudo').value).toBe('A short lesson.')
    );
    expect(raiz.querySelector('#textoTitulo').value).toBe('lesson');
    expect(raiz.querySelector('#textoEstatisticas').textContent).toContain('3 palavras');

    raiz.querySelector('#btnLimpar').click();
    expect(raiz.querySelector('#textoConteudo').value).toBe('');
    expect(raiz.querySelector('#textoTitulo').value).toBe('');
    expect(raiz.querySelector('#textoEstatisticas').textContent).toBe('');
    tela.desmontar();
  });

  test('conecta controles do leitor e ignora atalhos quando o foco está em um campo', () => {
    const material = criarPacote({
      tipo: 'texto',
      titulo: 'Keyboard',
      idioma: 'en-US',
      texto: 'First sentence. Second sentence.',
    });
    const tela = new TextScreen({ material });
    tela.montar(raiz);
    const acoes = ['alternar', 'reiniciar', 'anterior', 'proximo', 'parar', 'tocar'].map((nome) =>
      vi.spyOn(tela.leitor, nome).mockImplementation(() => {})
    );

    raiz.querySelector('#leitorTexto').click();
    raiz.querySelector('#btnTocar').click();
    raiz.querySelector('#btnInicio').click();
    raiz.querySelector('#btnFraseAnterior').click();
    raiz.querySelector('#btnFraseProxima').click();
    raiz.querySelector('#btnParar').click();
    raiz.querySelector('[data-trecho="1"]').click();
    expect(acoes.map((acao) => acao.mock.calls.length)).toEqual([1, 1, 1, 1, 1, 1]);

    const tecla = (key, target = document, opcoes = {}) =>
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opcoes }));
    tecla('ArrowRight');
    tecla('ArrowLeft');
    tecla(' ');
    tecla('Escape');
    tecla('ArrowRight', raiz.querySelector('#leitorIdioma'));
    tecla('ArrowRight', raiz.querySelector('#btnTocar'));
    tecla('ArrowRight', document, { altKey: true });

    expect(acoes.map((acao) => acao.mock.calls.length)).toEqual([2, 1, 2, 2, 2, 1]);
    tela.desmontar();
  });

  test('valida exportação vazia, material sem palavras/frases e conclusão do leitor', () => {
    const aviso = vi.spyOn(toast, 'aviso').mockImplementation(() => {});
    const sucesso = vi.spyOn(toast, 'sucesso').mockImplementation(() => {});
    const navegar = vi.fn();
    definirNavegador(navegar);
    const tela = new TextScreen();
    tela.montar(raiz);

    raiz.querySelector('#btnExportarTexto').click();
    raiz.querySelector('#btnExportarMp3').click();
    raiz.querySelector('#btnKit').click();
    expect(aviso).toHaveBeenCalledTimes(3);

    const area = raiz.querySelector('#textoConteudo');
    area.value = 'the and';
    area.dispatchEvent(new Event('input'));
    raiz.querySelector('#btnEstudarPalavras').click();
    area.value = '... !!!';
    area.dispatchEvent(new Event('input'));
    raiz.querySelector('#btnEstudarFrases').click();
    expect(aviso).toHaveBeenCalledWith('Nenhuma palavra encontrada no texto.');
    expect(aviso).toHaveBeenCalledWith('Nenhuma frase encontrada no texto.');

    tela.texto = 'A reading lesson.';
    tela.modo = 'ouvir';
    tela.material = criarPacote({
      tipo: 'texto',
      titulo: 'Review',
      idioma: 'en-US',
      texto: 'A reading lesson.',
      revisao: { etapa: 0, intervaloDias: 1, revisarEm: '2026-11-23' },
    });
    tela.aoConcluirLeitura();
    tela.aoConcluirLeitura();
    expect(sucesso).toHaveBeenCalledOnce();
    expect(tela.material.revisao.etapa).toBe(1);
    tela.desmontar();
  });

  test('captura apenas texto dentro de uma frase e não duplica expressões', () => {
    const material = criarPacote({
      tipo: 'texto',
      idioma: 'en-US',
      texto: 'Hello! Second sentence.',
    });
    const tela = new TextScreen({ material });
    tela.montar(raiz);
    const spans = raiz.querySelectorAll('.leitor__trecho');
    const selecao = window.getSelection();

    vi.spyOn(window, 'getSelection').mockReturnValue(null);
    tela.atualizarSelecaoVocabulario();
    tela.capturarPalavraSelecionada();
    expect(raiz.querySelector('#btnCapturarPalavra').disabled).toBe(true);
    window.getSelection.mockRestore();

    selecao.removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
    expect(raiz.querySelector('#btnCapturarPalavra').disabled).toBe(true);

    selecao.removeAllRanges();
    const textoForaDoLeitor = raiz.querySelector('.criar__titulo').firstChild;
    const rangeFora = document.createRange();
    rangeFora.setStart(textoForaDoLeitor, 0);
    rangeFora.setEnd(textoForaDoLeitor, textoForaDoLeitor.textContent.length);
    selecao.addRange(rangeFora);
    document.dispatchEvent(new Event('selectionchange'));
    expect(raiz.querySelector('#btnCapturarPalavra').disabled).toBe(true);

    selecao.removeAllRanges();
    const rangePontuacao = document.createRange();
    rangePontuacao.setStart(spans[0].firstChild, spans[0].textContent.length - 1);
    rangePontuacao.setEnd(spans[0].firstChild, spans[0].textContent.length);
    selecao.addRange(rangePontuacao);
    document.dispatchEvent(new Event('selectionchange'));
    expect(raiz.querySelector('#btnCapturarPalavra').disabled).toBe(true);

    selecao.removeAllRanges();
    const rangeEntreFrases = document.createRange();
    rangeEntreFrases.setStart(spans[0].firstChild, 0);
    rangeEntreFrases.setEnd(spans[1].firstChild, spans[1].textContent.length);
    selecao.addRange(rangeEntreFrases);
    document.dispatchEvent(new Event('selectionchange'));
    expect(raiz.querySelector('#btnCapturarPalavra').disabled).toBe(true);

    selecao.removeAllRanges();
    const rangeElemento = document.createRange();
    rangeElemento.setStart(spans[0], 0);
    rangeElemento.setEnd(spans[0], 1);
    selecao.addRange(rangeElemento);
    document.dispatchEvent(new Event('selectionchange'));
    expect(raiz.querySelector('#btnCapturarPalavra').disabled).toBe(false);
    raiz.querySelector('#btnCapturarPalavra').click();
    expect(tela.palavrasCapturadas).toEqual(['Hello!']);

    selecao.removeAllRanges();
    selecao.addRange(rangeElemento);
    document.dispatchEvent(new Event('selectionchange'));
    raiz.querySelector('#btnCapturarPalavra').click();
    expect(tela.palavrasCapturadas).toEqual(['Hello!']);
    expect(raiz.querySelector('#vocabCapturaStatus').textContent).toContain('já foi capturada');

    tela.trocarModo('editar');
    tela.trocarModo('ouvir');
    expect(raiz.querySelector('#btnEstudarCapturadas').hidden).toBe(false);
    tela.desmontar();
  });

  test('atualiza os estados, o progresso e os erros do leitor', () => {
    const erro = vi.spyOn(toast, 'erro').mockImplementation(() => {});
    const material = criarPacote({
      tipo: 'texto',
      idioma: 'en-US',
      texto: 'First sentence. Second sentence.',
    });
    const tela = new TextScreen({ material });
    tela.montar(raiz);
    raiz.querySelector('#leitorTexto').scrollTo = vi.fn();

    tela.aoMudarLeitor({ estado: ESTADOS_LEITOR.TOCANDO, indice: 1, total: 2 });
    expect(raiz.querySelector('#btnTocar').getAttribute('aria-label')).toBe('Pausar');
    expect(raiz.querySelector('#leitorBarra').style.width).toBe('50%');
    expect(raiz.querySelector('#leitorPosicao').textContent).toBe('Frase 2 de 2');

    tela.aoMudarLeitor({ estado: ESTADOS_LEITOR.PAUSADO, indice: 0, total: 2 });
    expect(raiz.querySelector('#leitorEstado').textContent).toBe('Pausado');
    tela.aoMudarLeitor({ estado: ESTADOS_LEITOR.CONCLUIDO, indice: 1, total: 2 });
    expect(raiz.querySelector('#leitorBarra').style.width).toBe('100%');
    tela.aoMudarLeitor({ estado: ESTADOS_LEITOR.ERRO, indice: 0, total: 0 });
    expect(raiz.querySelector('#leitorBarra').style.width).toBe('0px');
    expect(erro).toHaveBeenCalledOnce();
    tela.aoMudarLeitor({ estado: ESTADOS_LEITOR.PARADO, indice: 0, total: 0 });
    expect(
      raiz.querySelector('[data-trecho="0"]').classList.contains('leitor__trecho--atual')
    ).toBe(false);
    tela.desmontar();
  });

  test('mostra atribuição e guarda a tradução de um material reaberto', () => {
    const material = criarPacote({
      tipo: 'texto',
      titulo: 'Artigo',
      idioma: 'en-US',
      texto: 'A short article.',
      traducao: 'Um artigo curto.',
      fonte: {
        nome: 'Fonte',
        titulo: 'Artigo original',
        url: 'https://example.com/article',
        licenca: 'CC BY-SA',
      },
    });
    const tela = new TextScreen({ material });
    tela.montar(raiz);

    expect(raiz.querySelector('.cartao__nota a').href).toBe('https://example.com/article');
    expect(tela.traducaoSalva).toEqual({
      texto: 'A short article.',
      traducao: 'Um artigo curto.',
    });
    tela.desmontar();
  });

  test('abre as opções de MP3 e kit quando existe texto para exportar', () => {
    const tela = new TextScreen();
    tela.montar(raiz);
    const area = raiz.querySelector('#textoConteudo');
    area.value = 'A sentence to read.';
    area.dispatchEvent(new Event('input'));

    raiz.querySelector('#btnExportarMp3').click();
    expect(document.querySelector('dialog #mp3Gerar')).not.toBeNull();
    document.querySelector('dialog').remove();

    raiz.querySelector('#btnKit').click();
    expect(document.querySelector('dialog #mp3Gerar').textContent).toContain('Gerar kit');
    tela.desmontar();
  });
});

describe('roteador', () => {
  test('monta a rota e passa parâmetros sem solicitar confirmação para sair', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); // não implementado no jsdom
    location.hash = '';
    const montadas = [];
    const criarTela = (nome) => (parametros) => ({
      montar: (r) => {
        montadas.push([nome, parametros]);
        r.textContent = nome;
      },
    });
    const router = criarRouter({
      raiz,
      rotas: { '': criarTela('menu'), texto: criarTela('texto') },
    });
    await router.iniciar();
    expect(raiz.textContent).toBe('menu');

    router.navegar('texto', { x: 1 });
    await vi.waitFor(() => expect(raiz.textContent).toBe('texto'));
    expect(montadas.at(-1)).toEqual(['texto', { x: 1 }]);

    router.navegar('');
    await vi.waitFor(() => expect(raiz.textContent).toBe('menu'));
    expect(router.rotaAtual).toBe('');
  });

  test('usa a rota inicial para hashes desconhecidos e desmonta ao navegar para a mesma rota', async () => {
    location.hash = '#/unknown?param=1';
    const desmontar = vi.fn();
    const montadas = [];
    raiz.scrollIntoView = vi.fn();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const router = criarRouter({
      raiz,
      rotas: {
        '': () => ({
          montar: () => montadas.push('menu'),
          desmontar,
        }),
      },
    });

    await router.iniciar();
    expect(router.rotaAtual).toBe('');
    expect(montadas).toEqual(['menu']);
    expect(raiz.scrollIntoView).toHaveBeenCalledOnce();

    location.hash = '#/';
    router.navegar('');
    expect(desmontar).toHaveBeenCalledOnce();
    expect(montadas).toEqual(['menu', 'menu']);
  });
});
