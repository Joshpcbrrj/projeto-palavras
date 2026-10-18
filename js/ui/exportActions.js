/**
 * Ações de exportação usadas pelas telas: botão "PDF" e "Kit de estudo (PDF + MP3)".
 */

import { html, render } from '../core/dom.js';
import { exportarMaterialPdf, nomeBaseKit } from '../services/export.js';
import { settings } from '../services/settings.js';
import { alternador } from './components.js';
import { abrirExportacaoMp3 } from './mp3Dialog.js';
import { toast } from './toast.js';

/** O material precisa de tradução? (não faz sentido traduzir português para português) */
export function precisaTraducao(idioma) {
  return !String(idioma || '').startsWith('pt');
}

/** Alternador "Incluir tradução" (oculto para material em português). */
export function alternadorTraducao(idioma) {
  return html`<div class="area-traducao" ${precisaTraducao(idioma) ? '' : html`hidden`}>
    ${alternador({
      id: 'incluirTraducao',
      rotulo: 'Incluir tradução para o português',
      ajuda:
        'O PDF ganha a tradução de cada item (ou um glossário, nos textos) para estudar sem o app. Usa o Gemini, se configurado, ou o tradutor do Chrome/Edge.',
      marcado: settings.get('incluirTraducao'),
    })}
  </div>`;
}

/** Mostra ou oculta o alternador quando o idioma do material muda. */
export function atualizarAlternadorTraducao(raiz, idioma) {
  const area = raiz.querySelector('.area-traducao');
  if (area) area.hidden = !precisaTraducao(idioma);
}

/** Salva a preferência quando o alternador muda. */
export function ligarAlternadorTraducao(raiz) {
  raiz.querySelector('#incluirTraducao')?.addEventListener('change', (e) => {
    settings.set('incluirTraducao', e.target.checked);
  });
}

function avisar(resultado) {
  if (resultado.aviso) toast.aviso(resultado.aviso);
  toast.sucesso(`PDF gerado: ${resultado.nome}`);
}

/**
 * Gera o PDF mostrando o progresso no botão.
 * @returns {Promise<object|null>} resultado de exportarMaterialPdf, ou null se falhar
 */
export async function exportarPdfComBotao(botao, dados) {
  const rotulo = botao.innerHTML;
  botao.disabled = true;
  render(botao, html`<span class="carregando" aria-hidden="true"></span> Gerando PDF…`);
  try {
    const resultado = await exportarMaterialPdf(dados);
    avisar(resultado);
    return resultado;
  } catch (erro) {
    console.error(erro);
    toast.erro(`Não foi possível gerar o PDF. ${erro.message || ''}`);
    return null;
  } finally {
    botao.disabled = false;
    botao.innerHTML = rotulo;
  }
}

/**
 * Abre o diálogo do kit de estudo: baixa o PDF e depois gera o MP3, com o mesmo nome.
 * @param {object} dados campos de criarPacote
 * @param {object} [opcoes]
 * @param {(resultado: object) => void} [opcoes.aoGerarPdf]
 */
export function abrirKit(dados, { aoGerarPdf } = {}) {
  const nomeBase = nomeBaseKit(dados);
  abrirExportacaoMp3(dados, {
    kit: {
      nomeBase,
      async gerarPdf() {
        const resultado = await exportarMaterialPdf(dados, { nomeArquivo: `${nomeBase}.pdf` });
        avisar(resultado);
        aoGerarPdf?.(resultado);
        return resultado;
      },
    },
  });
}
