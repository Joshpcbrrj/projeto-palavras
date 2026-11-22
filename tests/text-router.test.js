import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TextScreen } from '../js/screens/TextScreen.js';
import { criarRouter } from '../js/core/router.js';
import { definirNavegador } from '../js/core/nav.js';
import { settings } from '../js/services/settings.js';
import { criarPacote } from '../js/pdf/format.js';

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
});
