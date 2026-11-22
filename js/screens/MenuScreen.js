/**
 * Tela inicial: escolha do modo de estudo, revisões pendentes e resumo.
 */

import { IDIOMAS, nomeTipo } from '../config.js';
import { html, render } from '../core/dom.js';
import { ROTAS, navegar } from '../core/nav.js';
import { formatarDataBR, formatarDuracao } from '../core/utils.js';
import { progresso } from '../services/progress.js';
import { seloRevisao } from '../ui/components.js';

const MODOS = [
  {
    rota: ROTAS.PALAVRAS,
    icone: '▰',
    titulo: 'Palavras',
    descricao: 'Flashcards com voz',
    cor: 'violeta',
  },
  {
    rota: ROTAS.FRASES,
    icone: '“ ”',
    titulo: 'Frases',
    descricao: 'Pratique trechos',
    cor: 'azul',
  },
  {
    rota: ROTAS.REVISAR,
    icone: '↻',
    titulo: 'Revisar',
    descricao: 'Continue seus PDFs',
    cor: 'rosa',
  },
];

export class MenuScreen {
  montar(raiz) {
    const servico = progresso();
    const stats = servico.estatisticas();
    const pendentes = servico.revisoesPendentes();

    render(
      raiz,
      html`
        <section class="tela tela--menu">
          <div class="menu__cabecalho">
            <div>
              <p class="menu__saudacao">Bom estudo</p>
              <h1 class="menu__titulo">O que você quer estudar hoje?</h1>
            </div>
            ${
              stats.diasSeguidos
                ? html`
              <span class="menu__sequencia">${stats.diasSeguidos} dias seguidos</span>
            `
                : ''
            }
          </div>

          ${pendentes.length ? this.painelRevisoes(pendentes) : ''}

          <a class="menu__criar" href="#/${ROTAS.TEXTO}">
            <span>
              <strong>Colar ou abrir um texto</strong>
              <small>Ouvir, criar PDF e revisar depois</small>
            </span>
            <span class="menu__criar-seta" aria-hidden="true">→</span>
          </a>

          <div class="menu__modulos">
            <h2 class="secao__titulo">Continue estudando</h2>
            <div class="grade-modos">
              ${MODOS.map(
                (modo) => html`
                  <a class="modo modo--${modo.cor} ${modo.destaque ? 'modo--destaque' : ''}" href="#/${modo.rota}">
                    <span class="modo__icone" aria-hidden="true">${modo.icone}</span>
                    <span class="modo__titulo">${modo.titulo}</span>
                    <span class="modo__descricao">${modo.descricao}</span>
                  </a>
                `
              )}
            </div>
          </div>

          <a class="cartao resumo" href="#/${ROTAS.PROGRESSO}">
            <div class="resumo__item">
              <span class="resumo__valor">${stats.sessoes}</span>
              <span class="resumo__rotulo">sessões</span>
            </div>
            <div class="resumo__item">
              <span class="resumo__valor">${stats.palavrasUnicas}</span>
              <span class="resumo__rotulo">palavras únicas</span>
            </div>
            <div class="resumo__item">
              <span class="resumo__valor">${formatarDuracao(stats.segundos.total)}</span>
              <span class="resumo__rotulo">de estudo</span>
            </div>
            <div class="resumo__item">
              <span class="resumo__valor">${stats.diasSeguidos}🔥</span>
              <span class="resumo__rotulo">dias seguidos</span>
            </div>
            <span class="resumo__link">Ver meu progresso →</span>
          </a>
          ${servico.precisaBackup() ? this.lembreteBackup(stats.ultimoBackup) : ''}
        </section>
      `
    );

    raiz.querySelector('#btnAbrirRevisar')?.addEventListener('click', () => navegar(ROTAS.REVISAR));
  }

  /** Lembrete discreto: há progresso e nenhum backup recente. */
  lembreteBackup(ultimoBackup) {
    const quando = ultimoBackup
      ? `o último foi em ${formatarDataBR(ultimoBackup)}`
      : 'você ainda não fez nenhum';
    return html`<a class="lembrete-backup" href="#/${ROTAS.PROGRESSO}">
      💾 Guarde seu progresso num arquivo de backup (${quando}) →
    </a>`;
  }

  painelRevisoes(pendentes) {
    return html`
      <div class="menu__revisoes cartao--destaque">
        <div class="menu__revisoes-cabecalho">
          <div>
            <p class="menu__revisoes-titulo">Revisar hoje</p>
            <p class="menu__revisoes-meta">${pendentes[0]?.titulo || 'Seu material'} · ${pendentes.length} pendências</p>
          </div>
          <button class="btn btn--secundario btn--pequeno" id="btnAbrirRevisar">Abrir</button>
        </div>
        <ul class="lista-revisoes" hidden>
          ${pendentes.slice(0, 4).map(
            (m) => html`
              <li class="lista-revisoes__item">
                <span class="lista-revisoes__titulo"
                  >${IDIOMAS[m.idioma]?.bandeira || ''} ${m.titulo}</span
                >
                <span class="lista-revisoes__meta"
                  >${
                    m.quantidade
                      ? `${m.quantidade} ${nomeTipo(m.tipo)}`
                      : nomeTipo(m.tipo, { plural: false, maiuscula: true })
                  }</span
                >
                ${seloRevisao(m.status)}
              </li>
            `
          )}
        </ul>
        ${
          pendentes.length > 4
            ? html`<p class="texto-suave">e mais ${pendentes.length - 4}…</p>`
            : ''
        }
      </div>
    `;
  }
}
