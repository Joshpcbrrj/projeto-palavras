/**
 * Notificações curtas e não intrusivas.
 */

import { html, render } from '../core/dom.js';

const ICONES = { sucesso: '✓', erro: '✕', aviso: '!', info: 'i' };

function obterContainer() {
  let container = document.getElementById('toasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toasts';
    container.className = 'toasts';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * @param {string} mensagem
 * @param {'sucesso'|'erro'|'aviso'|'info'} [tipo='info']
 * @param {number} [duracao=3500]
 */
export function toast(mensagem, tipo = 'info', duracao = 3500) {
  const item = document.createElement('div');
  item.className = `toast toast--${tipo}`;
  render(
    item,
    html`<span class="toast__icone" aria-hidden="true">${ICONES[tipo] || 'i'}</span
      ><span>${mensagem}</span>`
  );
  obterContainer().appendChild(item);
  requestAnimationFrame(() => item.classList.add('toast--visivel'));

  const remover = () => {
    item.classList.remove('toast--visivel');
    setTimeout(() => item.remove(), 250);
  };
  const timer = setTimeout(remover, tipo === 'erro' ? Math.max(duracao, 6000) : duracao);
  item.addEventListener('click', () => {
    clearTimeout(timer);
    remover();
  });
}

toast.sucesso = (m) => toast(m, 'sucesso');
toast.erro = (m) => toast(m, 'erro');
toast.aviso = (m) => toast(m, 'aviso');
toast.info = (m) => toast(m, 'info');
