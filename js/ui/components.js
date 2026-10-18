/**
 * Componentes de interface reutilizados pelas telas.
 */

import { ETAPAS_REVISAO, IDIOMAS, VELOCIDADE_FALA } from '../config.js';
import { $, html, render } from '../core/dom.js';
import { speaker, vozes } from '../audio/index.js';
import { vozDeAltaQualidade } from '../audio/voices.js';
import { settings } from '../services/settings.js';

export function cabecalhoTela({ icone, titulo, subtitulo, extra = '' }) {
  return html`
    <header class="tela__cabecalho">
      <div class="tela__icone" aria-hidden="true">${icone}</div>
      <div class="tela__titulos">
        <h2 class="tela__titulo">${titulo}</h2>
        ${subtitulo ? html`<p class="tela__subtitulo">${subtitulo}</p>` : ''}
      </div>
      ${extra}
    </header>
  `;
}

/** Indicador de etapas (1 Texto → 2 Configurar → 3 Estudar → 4 Resultado). */
export function etapas(nomes, atual) {
  return html`
    <ol class="etapas" aria-label="Etapas">
      ${nomes.map(
        (nome, i) => html`
          <li
            class="etapas__item ${i < atual ? 'etapas__item--feita' : ''} ${
              i === atual ? 'etapas__item--atual' : ''
            }"
            ${i === atual ? html`aria-current="step"` : ''}
          >
            <span class="etapas__numero">${i < atual ? '✓' : i + 1}</span>
            <span class="etapas__nome">${nome}</span>
          </li>
        `
      )}
    </ol>
  `;
}

export function seletorIdioma({ id, valor, rotulo = 'Idioma da pronúncia' }) {
  return html`
    <div class="campo">
      <label class="campo__rotulo" for="${id}">${rotulo}</label>
      <select id="${id}" class="input">
        ${Object.entries(IDIOMAS).map(
          ([codigo, info]) =>
            html`<option value="${codigo}" ${codigo === valor ? html`selected` : ''}>
              ${info.bandeira} ${info.nome}
            </option>`
        )}
      </select>
    </div>
  `;
}

export function seletorVoz({ id }) {
  return html`
    <div class="campo">
      <label class="campo__rotulo" for="${id}">Voz</label>
      <div class="campo__linha">
        <select id="${id}" class="input" aria-describedby="${id}Aviso"></select>
        <button
          type="button"
          class="btn btn--secundario btn--icone"
          id="${id}Testar"
          title="Testar voz"
          aria-label="Testar voz"
        >
          ▶
        </button>
      </div>
      <p class="campo__ajuda" id="${id}Aviso"></p>
    </div>
  `;
}

/**
 * Preenche e conecta um seletor de voz.
 * @param {HTMLElement} raiz elemento que contém o seletor
 * @param {string} id id usado em `seletorVoz`
 * @param {() => string} obterIdioma idioma atualmente selecionado na tela
 * @param {() => number} [obterVelocidade]
 * @returns {{atualizar: () => void, destruir: () => void}}
 */
export function conectarSeletorVoz(
  raiz,
  id,
  obterIdioma,
  obterVelocidade = () => settings.get('velocidadeFala')
) {
  const select = $(`#${id}`, raiz);
  const aviso = $(`#${id}Aviso`, raiz);
  const testar = $(`#${id}Testar`, raiz);

  const atualizar = () => {
    if (!select) return;
    const idioma = obterIdioma();
    const lista = vozes.listar(idioma);
    const preferida = settings.getVoz(idioma);
    const melhor = lista[0];

    render(
      select,
      html`
        <option value="">${melhor ? `Automática (${melhor.name})` : 'Automática'}</option>
        ${lista.map(
          (voz) =>
            html`<option
              value="${voz.voiceURI}"
              ${voz.voiceURI === preferida ? html`selected` : ''}
            >
              ${vozDeAltaQualidade(voz) ? '★ ' : ''}${voz.name} (${voz.lang})
            </option>`
        )}
      `
    );

    if (!speaker.disponivel) {
      aviso.textContent = 'Este navegador não oferece síntese de voz. Use Chrome, Edge ou Safari.';
      aviso.className = 'campo__ajuda campo__ajuda--aviso';
    } else if (!vozes.vozes.length) {
      aviso.textContent = 'Carregando vozes do dispositivo…';
      aviso.className = 'campo__ajuda';
    } else if (!lista.length) {
      aviso.textContent = `Nenhuma voz de ${IDIOMAS[idioma]?.nome || idioma} instalada neste dispositivo. A pronúncia pode sair com sotaque de outro idioma. Instale a voz nas configurações de fala do sistema.`;
      aviso.className = 'campo__ajuda campo__ajuda--aviso';
    } else {
      const boas = lista.filter(vozDeAltaQualidade).length;
      aviso.textContent = boas
        ? `${lista.length} voz(es) disponível(is). ★ indica vozes mais naturais.`
        : `${lista.length} voz(es) disponível(is). Dica: no Edge e no Chrome há vozes online mais naturais.`;
      aviso.className = 'campo__ajuda';
    }
  };

  const aoMudarSelect = () => vozes.definirPreferida(obterIdioma(), select.value);
  const aoTestar = () => {
    const idioma = obterIdioma();
    speaker.falar(IDIOMAS[idioma]?.amostra || 'Olá!', { idioma, velocidade: obterVelocidade() });
  };

  select?.addEventListener('change', aoMudarSelect);
  testar?.addEventListener('click', aoTestar);
  const remover = vozes.aoMudar(atualizar);
  atualizar();
  vozes.carregar().then(atualizar);

  return {
    atualizar,
    destruir() {
      remover();
      select?.removeEventListener('change', aoMudarSelect);
      testar?.removeEventListener('click', aoTestar);
    },
  };
}

export function controleVelocidade({ id, valor, rotulo = 'Velocidade da fala' }) {
  const { min, max, passo } = VELOCIDADE_FALA;
  return html`
    <div class="campo">
      <label class="campo__rotulo" for="${id}">${rotulo}</label>
      <div class="controle-velocidade">
        <button
          type="button"
          class="btn btn--secundario btn--icone btn--pequeno"
          data-velocidade="-"
          aria-label="Diminuir velocidade"
        >
          −
        </button>
        <input
          type="range"
          id="${id}"
          class="faixa"
          min="${min}"
          max="${max}"
          step="${passo}"
          value="${valor}"
        />
        <button
          type="button"
          class="btn btn--secundario btn--icone btn--pequeno"
          data-velocidade="+"
          aria-label="Aumentar velocidade"
        >
          +
        </button>
        <output class="pilula" for="${id}" id="${id}Valor">${formatarVelocidade(valor)}</output>
      </div>
    </div>
  `;
}

export function formatarVelocidade(valor) {
  return `${Number(valor).toFixed(2).replace(/0$/, '').replace(/\.0$/, '')}×`;
}

/** Conecta o controle de velocidade; chama `aoMudar(valor)` a cada alteração. */
export function conectarVelocidade(raiz, id, aoMudar) {
  const faixa = $(`#${id}`, raiz);
  const saida = $(`#${id}Valor`, raiz);
  if (!faixa) return;
  const { min, max, passo } = VELOCIDADE_FALA;
  const aplicar = (valor) => {
    const v = Math.round(Math.min(max, Math.max(min, valor)) / passo) * passo;
    faixa.value = String(v);
    saida.textContent = formatarVelocidade(v);
    aoMudar(Number(v.toFixed(2)));
  };
  faixa.addEventListener('input', () => aplicar(Number(faixa.value)));
  faixa.parentElement.querySelectorAll('[data-velocidade]').forEach((botao) => {
    botao.addEventListener('click', () =>
      aplicar(Number(faixa.value) + (botao.dataset.velocidade === '+' ? passo : -passo))
    );
  });
}

export function alternador({ id, rotulo, ajuda = '', marcado = false }) {
  return html`
    <label class="alternador" for="${id}">
      <input type="checkbox" id="${id}" class="alternador__input" ${marcado ? html`checked` : ''} />
      <span class="alternador__trilho" aria-hidden="true"></span>
      <span class="alternador__texto">
        <span class="alternador__rotulo">${rotulo}</span>
        ${ajuda ? html`<span class="alternador__ajuda">${ajuda}</span>` : ''}
      </span>
    </label>
  `;
}

/** Grupo de botões de escolha única (ex.: repetições 1×, 2×, 3×). */
export function segmentado({ nome, rotulo, opcoes, valor }) {
  return html`
    <fieldset class="campo">
      <legend class="campo__rotulo">${rotulo}</legend>
      <div class="segmentado" role="radiogroup">
        ${opcoes.map(
          (o) => html`
            <label class="segmentado__opcao">
              <input
                type="radio"
                name="${nome}"
                value="${o.valor}"
                ${String(o.valor) === String(valor) ? html`checked` : ''}
              />
              <span>${o.rotulo}</span>
            </label>
          `
        )}
      </div>
    </fieldset>
  `;
}

export function valorSegmentado(raiz, nome) {
  return $(`input[name="${nome}"]:checked`, raiz)?.value;
}

const CLASSES_REVISAO = {
  atrasada: 'selo--perigo',
  hoje: 'selo--aviso',
  futura: 'selo--sucesso',
  'sem-data': 'selo--neutro',
};

export function seloRevisao(status) {
  return html`<span class="selo ${CLASSES_REVISAO[status.situacao]}">${status.texto}</span>`;
}

export function estadoVazio({ icone, titulo, texto }) {
  return html`
    <div class="vazio">
      <div class="vazio__icone" aria-hidden="true">${icone}</div>
      <p class="vazio__titulo">${titulo}</p>
      ${texto ? html`<p class="vazio__texto">${texto}</p>` : ''}
    </div>
  `;
}

/** Opções de agendamento da próxima revisão usadas nas exportações. */
export function seletorRevisao({ id, etapaSugerida = 0, intervalos = ETAPAS_REVISAO }) {
  return html`
    <div class="campo">
      <label class="campo__rotulo" for="${id}">Próxima revisão</label>
      <select id="${id}" class="input">
        ${intervalos.map(
          (dias, i) =>
            html`<option
              value="${dias}"
              ${i === Math.min(etapaSugerida, intervalos.length - 1) ? html`selected` : ''}
            >
              ${dias === 1 ? 'Amanhã' : `Em ${dias} dias`}${
                i === Math.min(etapaSugerida, intervalos.length - 1) ? ' (recomendado)' : ''
              }
            </option>`
        )}
        <option value="0">Não agendar</option>
      </select>
    </div>
  `;
}
