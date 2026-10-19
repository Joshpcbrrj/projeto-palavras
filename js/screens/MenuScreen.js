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
    rota: ROTAS.CRIAR,
    icone: '✨',
    titulo: 'Criar textos',
    descricao: 'Diálogos, explicações sobre qualquer tema e textos no seu nível — de graça.',
    cor: 'verde',
    destaque: true,
  },
  {
    rota: ROTAS.PALAVRAS,
    icone: '📖',
    titulo: 'Estudar palavras',
    descricao: 'Cole um texto e pratique as palavras em flashcards com pronúncia.',
    cor: 'violeta',
  },
  {
    rota: ROTAS.FRASES,
    icone: '💬',
    titulo: 'Estudar frases',
    descricao: 'Treine frases completas, uma por vez, ouvindo cada uma.',
    cor: 'azul',
  },
  {
    rota: ROTAS.TEXTO,
    icone: '🎧',
    titulo: 'Ler e ouvir um texto',
    descricao: 'Escute seu texto frase a frase, com destaque e controle de velocidade.',
    cor: 'ambar',
  },
  {
    rota: ROTAS.REVISAR,
    icone: '📂',
    titulo: 'Revisar arquivo',
    descricao: 'Abra um PDF exportado pelo app e retome o estudo de onde parou.',
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
          ${pendentes.length ? this.painelRevisoes(pendentes) : ''}

          <div class="cartao">
            <h2 class="secao__titulo">O que você quer estudar hoje?</h2>
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
      <div class="cartao cartao--destaque">
        <div class="secao__cabecalho">
          <h2 class="secao__titulo">🔔 Revisões para hoje</h2>
          <button class="btn btn--primario btn--pequeno" id="btnAbrirRevisar">
            Abrir PDF para revisar
          </button>
        </div>
        <ul class="lista-revisoes">
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
