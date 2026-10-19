/**
 * Painel da IA usada para criar textos (Google Gemini com chave gratuita).
 */

import { $, html, render } from '../core/dom.js';
import { iaDisponivel } from '../create/engine.js';
import { GeminiMotor } from '../create/gemini.js';
import { settings } from '../services/settings.js';
import { extrairChave, guiaChaveGemini } from './guiaChave.js';
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
        Para criar diálogos e textos completos no seu nível, o app usa o Google
        Gemini. Ele é <strong>grátis</strong>: só precisa de uma chave, criada uma vez com a sua conta Google.
      </p>
      ${guiaChaveGemini({ aberto: !chave })}
      <div class="campo__linha">
        <input id="chaveGeminiPainel" class="input" type="password" autocomplete="off" spellcheck="false" placeholder="Cole aqui a chave (começa com AIza…)" aria-label="Chave do Gemini" />
        ${
          navigator.clipboard?.readText
            ? html`<button type="button" class="btn btn--secundario" data-colar-chave title="Colar a chave copiada">📋 Colar</button>`
            : ''
        }
        <button type="button" class="btn btn--primario" data-salvar-chave>Salvar</button>
      </div>
      <p class="campo__ajuda campo__ajuda--aviso" id="erroChaveGemini" hidden></p>
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
    container.querySelector('[data-colar-chave]')?.addEventListener('click', async () => {
      try {
        const texto = await navigator.clipboard.readText();
        $('#chaveGeminiPainel', container).value = extrairChave(texto).chave || texto.trim();
        salvarChave();
      } catch {
        toast.info('Não foi possível ler a área de transferência. Cole no campo com Ctrl+V.');
      }
    });
    $('#chaveGeminiPainel', container)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') salvarChave();
    });
    aoMudar?.(iaDisponivel());
  };

  const mostrarErro = (mensagem) => {
    const el = $('#erroChaveGemini', container);
    if (!el) return;
    el.textContent = mensagem;
    el.hidden = !mensagem;
  };

  const salvarChave = async () => {
    const { chave, erro } = extrairChave($('#chaveGeminiPainel', container)?.value);
    if (erro) {
      mostrarErro(erro);
      return;
    }
    mostrarErro('');
    const botao = container.querySelector('[data-salvar-chave]');
    botao.disabled = true;
    botao.textContent = 'Testando…';
    try {
      await new GeminiMotor({ chave }).testar();
      settings.set('chaveGemini', chave);
      editandoChave = false;
      toast.sucesso('Chave do Gemini salva. A IA está pronta!');
      atualizar();
    } catch (erro) {
      // Mantém o que foi digitado e mostra o motivo junto do campo.
      botao.disabled = false;
      botao.textContent = 'Salvar';
      mostrarErro(erro.message);
    }
  };

  atualizar();
  return { atualizar };
}
