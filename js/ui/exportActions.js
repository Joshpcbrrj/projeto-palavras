/**
 * Ações de exportação usadas pelas telas: botão "PDF", "Kit de estudo (PDF + MP3)"
 * e a opção de incluir a tradução no fim do PDF.
 */

import { html, render } from '../core/dom.js';
import { exportarMaterialPdf, nomeBaseKit } from '../services/export.js';
import { settings } from '../services/settings.js';
import { alternador } from './components.js';
import { abrirExportacaoMp3 } from './mp3Dialog.js';
import { toast } from './toast.js';

const emPortugues = (idioma) => String(idioma || '').startsWith('pt');

/** Opção "Incluir tradução no final" (oculta para material em português). */
export function alternadorTraducao(idioma) {
  return html`<div class="area-traducao" ${emPortugues(idioma) ? html`hidden` : ''}>
    ${alternador({
      id: 'incluirTraducao',
      rotulo: 'Incluir a tradução no final do PDF',
      ajuda:
        'Uma página extra com tudo traduzido para o português (mesma numeração ou mesmos parágrafos), para revisar rápido. Usa o Gemini, se configurado, ou o tradutor do Chrome/Edge.',
      marcado: settings.get('incluirTraducao'),
    })}
  </div>`;
}

/** Salva a preferência quando a opção muda. */
export function ligarAlternadorTraducao(raiz) {
  raiz.querySelector('#incluirTraducao')?.addEventListener('change', (e) => {
    settings.set('incluirTraducao', e.target.checked);
  });
}

/** Mostra ou oculta a opção quando o idioma do material muda. */
export function atualizarAlternadorTraducao(raiz, idioma) {
  const area = raiz.querySelector('.area-traducao');
  if (area) area.hidden = emPortugues(idioma);
}

function avisar(resultado) {
  if (resultado.aviso) toast.aviso(resultado.aviso);
  toast.sucesso(`PDF gerado: ${resultado.nome}`);
}

/**
 * Gera o PDF mostrando o progresso no botão.
 * @param {HTMLButtonElement} botao
 * @param {object} dados campos de criarPacote
 * @param {object} [opcoes] repassadas a exportarMaterialPdf (ex.: `conhecidas`)
 * @returns {Promise<object|null>} resultado de exportarMaterialPdf, ou null se falhar
 */
export async function exportarPdfComBotao(botao, dados, opcoes = {}) {
  const rotulo = botao.innerHTML;
  botao.disabled = true;
  const mostrar = (etapa) =>
    render(botao, html`<span class="carregando" aria-hidden="true"></span> ${etapa}`);
  mostrar('Gerando PDF…');
  try {
    const resultado = await exportarMaterialPdf(dados, { ...opcoes, aoEtapa: mostrar });
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
 * @param {Map<string, string>} [opcoes.conhecidas] traduções já existentes, por item
 */
export function abrirKit(dados, { aoGerarPdf, conhecidas } = {}) {
  const nomeBase = nomeBaseKit(dados);
  abrirExportacaoMp3(dados, {
    kit: {
      nomeBase,
      async gerarPdf(aoEtapa) {
        const resultado = await exportarMaterialPdf(dados, {
          nomeArquivo: `${nomeBase}.pdf`,
          conhecidas,
          aoEtapa,
        });
        avisar(resultado);
        aoGerarPdf?.(resultado);
        return resultado;
      },
    },
  });
}
