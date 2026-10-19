/**
 * Passo a passo ilustrado para criar a chave gratuita do Google Gemini.
 * As ilustrações são desenhadas em HTML/CSS (seguem o tema e não dependem de imagens).
 */

import { html } from '../core/dom.js';
import { URL_CRIAR_CHAVE } from '../create/gemini.js';

/**
 * Tira a chave de um texto colado. Aceita a chave pura ou com sobras comuns
 * (aspas, espaços, "GEMINI_API_KEY=…").
 * @returns {{chave: string, erro: string}}
 */
export function extrairChave(texto) {
  const limpo = String(texto || '').trim();
  if (!limpo) return { chave: '', erro: 'Cole a chave no campo antes de salvar.' };
  const encontrada = limpo.match(/AIza[0-9A-Za-z_-]{35}/)?.[0];
  if (encontrada) return { chave: encontrada, erro: '' };
  const semAspas = limpo.replace(/^["']|["']$/g, '');
  if (/^\S{30,}$/.test(semAspas)) return { chave: semAspas, erro: '' };
  return {
    chave: '',
    erro: 'Isso não parece uma chave do Gemini. Ela é um código de 39 caracteres que começa com “AIza”. Use o botão de copiar ao lado da chave no Google AI Studio.',
  };
}

const PASSOS = [
  {
    titulo: 'Abra o Google AI Studio',
    texto: html`Clique em <a href="${URL_CRIAR_CHAVE}" target="_blank" rel="noopener">abrir o Google AI Studio ↗</a> e entre com a sua conta Google (a mesma do Gmail). Na primeira vez, aceite os termos de uso.`,
    ilustracao: html`
      <div class="guia-tela__barra"><span></span><span></span><span></span><em>aistudio.google.com</em></div>
      <div class="guia-tela__conteudo">
        <div class="guia-tela__linha guia-tela__linha--curta"></div>
        <div class="guia-tela__botao guia-tela__botao--destaque">Entrar com o Google</div>
      </div>`,
  },
  {
    titulo: 'Crie a chave',
    texto: html`Clique em <strong>“Create API key”</strong> (Criar chave de API). Se pedir um projeto, aceite o que já aparece ou crie um novo. <strong>É grátis e não pede cartão de crédito.</strong>`,
    ilustracao: html`
      <div class="guia-tela__barra"><span></span><span></span><span></span><em>API keys</em></div>
      <div class="guia-tela__conteudo guia-tela__conteudo--linha">
        <div class="guia-tela__linha"></div>
        <div class="guia-tela__botao guia-tela__botao--destaque">🔑 Create API key</div>
      </div>`,
  },
  {
    titulo: 'Copie a chave',
    texto: html`A chave aparece na tela: um código que começa com <code>AIza</code>. Use o botão de <strong>copiar</strong> ao lado dela (é mais seguro que selecionar com o mouse).`,
    ilustracao: html`
      <div class="guia-tela__barra"><span></span><span></span><span></span><em>API key</em></div>
      <div class="guia-tela__conteudo guia-tela__conteudo--linha">
        <code class="guia-tela__chave">AIzaSy••••••••••••••••</code>
        <div class="guia-tela__botao guia-tela__botao--destaque" aria-hidden="true">⧉ Copiar</div>
      </div>`,
  },
  {
    titulo: 'Cole aqui e salve',
    texto: html`Volte para esta página, cole a chave no campo abaixo e clique em <strong>Salvar</strong>. O app testa a chave na hora e avisa se deu certo.`,
    ilustracao: html`
      <div class="guia-tela__barra"><span></span><span></span><span></span><em>Aprendendo Palavras</em></div>
      <div class="guia-tela__conteudo guia-tela__conteudo--linha">
        <div class="guia-tela__campo">AIzaSy••••••••</div>
        <div class="guia-tela__botao guia-tela__botao--destaque">Salvar</div>
      </div>`,
  },
];

/** HTML do passo a passo (recolhível). */
export function guiaChaveGemini({ aberto = true } = {}) {
  return html`
    <details class="guia-chave" ${aberto ? html`open` : ''}>
      <summary class="guia-chave__titulo">📘 Como criar a chave grátis — passo a passo (1 minuto)</summary>
      <ol class="guia-chave__passos">
        ${PASSOS.map(
          (p, i) => html`
            <li class="guia-passo">
              <div class="guia-tela" aria-hidden="true">${p.ilustracao}</div>
              <div class="guia-passo__texto">
                <p class="guia-passo__titulo"><span class="guia-passo__numero">${i + 1}</span> ${p.titulo}</p>
                <p class="texto-pequeno">${p.texto}</p>
              </div>
            </li>
          `
        )}
      </ol>
      <p class="campo__ajuda">
        Problemas? “Chave inválida”: copie de novo pelo botão de copiar. “Sem permissão” ou
        “região”: o Gemini ainda não está disponível na sua conta ou país. O plano grátis tem um
        limite de pedidos por minuto — se aparecer o aviso, espere um pouco.
      </p>
    </details>
  `;
}
