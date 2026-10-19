/**
 * Ações de exportação usadas pelas telas: botão "PDF" e "Kit de estudo (PDF + MP3)".
 */

import { html, render } from '../core/dom.js';
import { exportarMaterialPdf, nomeBaseKit } from '../services/export.js';
import { abrirExportacaoMp3 } from './mp3Dialog.js';
import { toast } from './toast.js';

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
    toast.sucesso(`PDF gerado: ${resultado.nome}`);
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
        toast.sucesso(`PDF gerado: ${resultado.nome}`);
        aoGerarPdf?.(resultado);
        return resultado;
      },
    },
  });
}
