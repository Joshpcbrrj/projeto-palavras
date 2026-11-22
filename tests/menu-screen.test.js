import { beforeEach, describe, expect, test } from 'vitest';
import { MenuScreen } from '../js/screens/MenuScreen.js';

let raiz;

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  raiz = document.getElementById('app');
});

describe('entrada do aplicativo', () => {
  test('apresenta os três modos de estudo e a revisão de PDF, sem gerador de textos', () => {
    new MenuScreen().montar(raiz);
    expect(raiz.querySelector('h1').textContent).toBe('O que você quer estudar?');
    expect(raiz.querySelectorAll('.grade-modos .modo')).toHaveLength(3);
    expect(raiz.querySelector('a[href="#/texto"]').textContent).toContain('Textos');
    expect(raiz.querySelector('a[href="#/frases"]').textContent).toContain('Frases');
    expect(raiz.querySelector('a[href="#/palavras"]').textContent).toContain('Palavras');
    expect(raiz.querySelector('a[href="#/revisar"]').textContent).toContain(
      'Abrir PDF ou arquivo para estudar/revisar'
    );
    expect(raiz.querySelector('#criarTema')).toBeNull();
  });
});
