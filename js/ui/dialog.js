/**
 * Diálogos modais acessíveis (substituem confirm()/alert() nativos).
 */

import { html, render } from '../core/dom.js';

/**
 * Mostra um diálogo com várias opções.
 * @param {object} opcoes
 * @param {string} opcoes.titulo
 * @param {string} [opcoes.mensagem]
 * @param {{valor: string, rotulo: string, estilo?: string}[]} opcoes.botoes
 * @returns {Promise<string|null>} valor do botão escolhido, ou null se fechado
 */
export function escolher({ titulo, mensagem = '', botoes }) {
  return new Promise((resolve) => {
    const dialogo = document.createElement('dialog');
    dialogo.className = 'dialogo';
    dialogo.setAttribute('aria-labelledby', 'dialogoTitulo');
    render(
      dialogo,
      html`
        <form method="dialog" class="dialogo__conteudo">
          <h2 id="dialogoTitulo" class="dialogo__titulo">${titulo}</h2>
          ${mensagem ? html`<p class="dialogo__mensagem">${mensagem}</p>` : ''}
          <div class="dialogo__acoes">
            ${botoes.map(
              (b) =>
                html`<button class="btn btn--${b.estilo || 'secundario'}" value="${b.valor}">
                  ${b.rotulo}
                </button>`
            )}
          </div>
        </form>
      `
    );
    document.body.appendChild(dialogo);

    const finalizar = (valor) => {
      dialogo.remove();
      resolve(valor);
    };
    dialogo.addEventListener('close', () => finalizar(dialogo.returnValue || null));
    dialogo.addEventListener('cancel', () => {
      dialogo.returnValue = '';
    });
    dialogo.addEventListener('click', (e) => {
      if (e.target === dialogo) dialogo.close('');
    });

    if (typeof dialogo.showModal === 'function') {
      dialogo.showModal();
    } else {
      dialogo.setAttribute('open', '');
    }
    const principal =
      dialogo.querySelector('.btn--primario, .btn--perigo') || dialogo.querySelector('button');
    principal?.focus();
  });
}

/** Pergunta simples de confirmação. */
export async function confirmar({
  titulo,
  mensagem,
  confirmar = 'Confirmar',
  cancelar = 'Cancelar',
  perigo = false,
}) {
  const escolha = await escolher({
    titulo,
    mensagem,
    botoes: [
      { valor: 'nao', rotulo: cancelar, estilo: 'fantasma' },
      { valor: 'sim', rotulo: confirmar, estilo: perigo ? 'perigo' : 'primario' },
    ],
  });
  return escolha === 'sim';
}
