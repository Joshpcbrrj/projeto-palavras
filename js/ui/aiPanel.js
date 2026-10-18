/**
 * Painel da IA usada para criar textos: escolha entre a IA online (Gemini, com
 * chave gratuita) e a IA no navegador (offline), configuração e ativação.
 */

import { MODELOS_IA } from '../config.js';
import { $, html, render } from '../core/dom.js';
import { MOTORES_IA, iaDisponivel } from '../create/engine.js';
import { GeminiMotor, URL_CRIAR_CHAVE } from '../create/gemini.js';
import { ia } from '../create/llm.js';
import { settings } from '../services/settings.js';
import { toast } from './toast.js';

/**
 * Monta o painel dentro de `container`.
 * @param {HTMLElement} container
 * @param {{aoMudar?: (pronta: boolean) => void, compacto?: boolean}} [opcoes]
 * @returns {{atualizar: () => Promise<void>}}
 */
export function montarPainelIA(container, { aoMudar, compacto = false } = {}) {
  let progresso = null;
  let editandoChave = false;

  const seletor = (motor) => html`
    <div class="segmentado painel-ia__motores" role="radiogroup" aria-label="IA usada para criar textos">
      <label class="segmentado__opcao">
        <input type="radio" name="motorIA" value="${MOTORES_IA.GEMINI}" ${motor === MOTORES_IA.GEMINI ? html`checked` : ''} />
        <span>☁️ Online (Gemini)</span>
      </label>
      <label class="segmentado__opcao">
        <input type="radio" name="motorIA" value="${MOTORES_IA.LOCAL}" ${motor === MOTORES_IA.LOCAL ? html`checked` : ''} />
        <span>💻 No navegador</span>
      </label>
    </div>
  `;

  const corpoGemini = () => {
    const chave = settings.get('chaveGemini');
    if (chave && !editandoChave) {
      return html`
        <p class="painel-ia__status painel-ia__status--ok">✅ IA online pronta — rápida e gratuita com a sua chave do Gemini.</p>
        <button type="button" class="link" data-trocar-chave>Trocar chave</button>
      `;
    }
    return html`
      <p class="texto-suave texto-pequeno">
        Responde em segundos e funciona no celular. Crie uma <strong>chave gratuita</strong> no Google AI Studio
        (leva 1 minuto, só precisa de uma conta Google) e cole aqui.
        <a href="${URL_CRIAR_CHAVE}" target="_blank" rel="noopener">Criar chave grátis ↗</a>
      </p>
      <div class="campo__linha">
        <input id="chaveGeminiPainel" class="input" type="password" autocomplete="off" spellcheck="false" placeholder="Cole aqui a chave (começa com AIza…)" />
        <button type="button" class="btn btn--primario" data-salvar-chave>Salvar</button>
      </div>
      <p class="campo__ajuda">A chave fica só neste navegador e é enviada apenas ao Google.</p>
    `;
  };

  const corpoLocal = async () => {
    const chave = settings.get('modeloIA');
    const modelo = MODELOS_IA[chave];
    const suporte = await ia.obterSuporte();
    if (!suporte.suportado) {
      return html`<p class="painel-ia__status painel-ia__status--aviso">${suporte.motivo} Use a opção “Online (Gemini)”.</p>`;
    }
    if (ia.pronto) {
      return html`<p class="painel-ia__status painel-ia__status--ok">✅ IA no navegador pronta (modelo ${modelo.nome}) — offline e sem custo.</p>`;
    }
    if (progresso) {
      return html`
        <p><strong>⏳ Preparando a IA (${modelo.nome})…</strong></p>
        <div class="barra"><div class="barra__preenchimento" style="width:${Math.round(progresso.progresso * 100)}%"></div></div>
        <p class="texto-pequeno texto-suave" data-progresso-texto>${progresso.texto || 'Iniciando…'}</p>
      `;
    }
    const baixado = await ia.estaBaixado(chave).catch(() => false);
    return html`
      <p class="texto-suave texto-pequeno">
        ${
          baixado
            ? `Modelo ${modelo.nome} já baixado. Ative para usar (leva alguns segundos).`
            : `Roda no seu computador, sem internet e sem conta. Download único de ${modelo.tamanho}; mais lento que a opção online e exige placa de vídeo compatível.`
        }
        ${compacto ? '' : html` <a href="#/configuracoes">Trocar modelo</a>`}
      </p>
      <button type="button" class="btn btn--secundario" data-ativar-ia>${baixado ? '⚡ Ativar IA' : `⬇️ Baixar e ativar (${modelo.tamanho})`}</button>
    `;
  };

  const atualizar = async () => {
    const motor = settings.get('motorIA');
    const corpo = motor === MOTORES_IA.GEMINI ? corpoGemini() : await corpoLocal();
    render(
      container,
      html`<div class="painel-ia">
        <div class="painel-ia__topo">
          <strong>🤖 IA para criar o texto</strong>
          ${seletor(motor)}
        </div>
        <div class="painel-ia__corpo">${corpo}</div>
      </div>`
    );
    ligar();
    aoMudar?.(iaDisponivel());
  };

  const ligar = () => {
    container.querySelectorAll('input[name="motorIA"]').forEach((r) =>
      r.addEventListener('change', () => {
        settings.set('motorIA', r.value);
        atualizar();
      })
    );
    container.querySelector('[data-trocar-chave]')?.addEventListener('click', () => {
      editandoChave = true;
      atualizar();
    });
    container.querySelector('[data-salvar-chave]')?.addEventListener('click', salvarChave);
    $('#chaveGeminiPainel', container)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') salvarChave();
    });
    container.querySelector('[data-ativar-ia]')?.addEventListener('click', ativarLocal);
  };

  const salvarChave = async () => {
    const campo = $('#chaveGeminiPainel', container);
    const chave = campo?.value.trim();
    if (!chave) return;
    const botao = container.querySelector('[data-salvar-chave]');
    botao.disabled = true;
    botao.textContent = 'Testando…';
    try {
      await new GeminiMotor({ chave }).testar();
      settings.set('chaveGemini', chave);
      editandoChave = false;
      toast.sucesso('Chave do Gemini salva. A IA online está pronta!');
    } catch (erro) {
      toast.erro(erro.message);
    } finally {
      await atualizar();
    }
  };

  const ativarLocal = async () => {
    progresso = { progresso: 0, texto: '' };
    await atualizar();
    try {
      await ia.carregar(settings.get('modeloIA'), {
        aoProgresso: (info) => {
          progresso = info;
          const barra = container.querySelector('.barra__preenchimento');
          const texto = container.querySelector('[data-progresso-texto]');
          if (barra) barra.style.width = `${Math.round(info.progresso * 100)}%`;
          if (texto) texto.textContent = info.texto;
        },
      });
      toast.sucesso('IA no navegador pronta!');
    } catch (erro) {
      console.error(erro);
      toast.erro(erro.message);
    } finally {
      progresso = null;
      await atualizar();
    }
  };

  atualizar();
  return { atualizar };
}
