/**
 * Painel da IA usada para criar textos (Google Gemini com chave gratuita).
 */

import { $, html, render } from '../core/dom.js';
import { iaDisponivel } from '../create/engine.js';
import { GeminiMotor, URL_CRIAR_CHAVE } from '../create/gemini.js';
import { settings } from '../services/settings.js';
import { toast } from './toast.js';

/**
 * Monta o painel dentro de `container`.
 * @param {HTMLElement} container
 * @param {{aoMudar?: (pronta: boolean) => void}} [opcoes]
 * @returns {{atualizar: () => void}}
 */
export function montarPainelIA(container, { aoMudar } = {}) {
  let editandoChave = false;

  const corpo = () => {
    const chave = settings.get('chaveGemini');
    if (chave && !editandoChave) {
      return html`
        <p class="painel-ia__status painel-ia__status--ok">✅ IA pronta — rápida e gratuita com a sua chave do Gemini.</p>
        <button type="button" class="link" data-trocar-chave>Trocar chave</button>
      `;
    }
    return html`
      <p class="texto-suave texto-pequeno">
        Para criar diálogos e adaptar textos ao seu nível, o app usa o Google Gemini. Crie uma
        <strong>chave gratuita</strong> no Google AI Studio (leva 1 minuto, só precisa de uma conta Google) e cole aqui.
        <a href="${URL_CRIAR_CHAVE}" target="_blank" rel="noopener">Criar chave grátis ↗</a>
      </p>
      <div class="campo__linha">
        <input id="chaveGeminiPainel" class="input" type="password" autocomplete="off" spellcheck="false" placeholder="Cole aqui a chave (começa com AIza…)" />
        <button type="button" class="btn btn--primario" data-salvar-chave>Salvar</button>
      </div>
      <p class="campo__ajuda">A chave fica só neste navegador e é enviada apenas ao Google.</p>
    `;
  };

  const atualizar = () => {
    render(
      container,
      html`<div class="painel-ia">
        <div class="painel-ia__topo"><strong>🤖 IA para criar o texto</strong></div>
        <div class="painel-ia__corpo">${corpo()}</div>
      </div>`
    );
    container.querySelector('[data-trocar-chave]')?.addEventListener('click', () => {
      editandoChave = true;
      atualizar();
    });
    container.querySelector('[data-salvar-chave]')?.addEventListener('click', salvarChave);
    $('#chaveGeminiPainel', container)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') salvarChave();
    });
    aoMudar?.(iaDisponivel());
  };

  const salvarChave = async () => {
    const chave = $('#chaveGeminiPainel', container)?.value.trim();
    if (!chave) return;
    const botao = container.querySelector('[data-salvar-chave]');
    botao.disabled = true;
    botao.textContent = 'Testando…';
    try {
      await new GeminiMotor({ chave }).testar();
      settings.set('chaveGemini', chave);
      editandoChave = false;
      toast.sucesso('Chave do Gemini salva. A IA está pronta!');
    } catch (erro) {
      toast.erro(erro.message);
    } finally {
      atualizar();
    }
  };

  atualizar();
  return { atualizar };
}
