/** Tela inicial: escolha entre estudar textos, frases, palavras ou revisar um PDF. */

import { html, render } from '../core/dom.js';
import { ROTAS } from '../core/nav.js';

export class MenuScreen {
  montar(raiz) {
    render(
      raiz,
      html`
        <section class="tela tela--menu">
          <div class="menu__cabecalho">
            <p class="menu__saudacao">Estudo simples, com o seu material</p>
            <h1 class="menu__titulo">O que você quer estudar?</h1>
            <p class="texto-suave">
              Escolha um tipo de material. Você poderá ouvir, praticar e baixar um PDF para revisar.
            </p>
          </div>
          <div class="grade-modos">
            <a class="modo modo--azul" href="#/${ROTAS.TEXTO}">
              <span class="modo__icone" aria-hidden="true">🎧</span>
              <span class="modo__titulo">Textos</span>
              <span class="modo__descricao">Cole um texto para ouvir frase a frase</span>
            </a>
            <a class="modo modo--rosa" href="#/${ROTAS.FRASES}">
              <span class="modo__icone" aria-hidden="true">💬</span>
              <span class="modo__titulo">Frases</span>
              <span class="modo__descricao">Cole um texto com frases para praticar</span>
            </a>
            <a class="modo modo--violeta" href="#/${ROTAS.PALAVRAS}">
              <span class="modo__icone" aria-hidden="true">📖</span>
              <span class="modo__titulo">Palavras</span>
              <span class="modo__descricao">Cole palavras soltas, uma por linha</span>
            </a>
          </div>
          <a class="menu__revisar" href="#/${ROTAS.REVISAR}">
            📂 Revisar um PDF exportado <span aria-hidden="true">→</span>
          </a>
        </section>
      `
    );
  }
}
