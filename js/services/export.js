/**
 * Exportação de materiais de estudo em PDF, num só lugar para todas as telas:
 * monta o pacote, gera o arquivo e registra no histórico e na agenda de revisões.
 */

import { TIPOS } from '../config.js';
import { criarPacote } from '../pdf/format.js';
import { exportarPdf, nomeArquivoPdf } from '../pdf/exporter.js';
import { contarPalavras } from '../text/extract.js';
import { progresso } from './progress.js';

function quantidade(pacote) {
  return pacote.tipo === TIPOS.TEXTO ? contarPalavras(pacote.texto) : pacote.itens.length;
}

/** Nome-base comum ao PDF e ao MP3 do kit de estudo (sem extensão). */
export function nomeBaseKit(dados, data = new Date()) {
  return nomeArquivoPdf(dados, data).replace(/\.pdf$/, '');
}

/**
 * Gera e baixa o PDF de um material.
 * @param {object} dados campos de criarPacote ({ tipo, titulo, idioma, itens|texto, revisao, ... })
 * @param {object} [opcoes]
 * @param {string} [opcoes.nomeArquivo]
 * @returns {Promise<{pacote: object, nome: string}>}
 */
export async function exportarMaterialPdf(dados, { nomeArquivo } = {}) {
  const pacote = criarPacote(dados);
  if (!pacote) throw new Error('Não há conteúdo para exportar.');
  const nome = await exportarPdf(pacote, { nomeArquivo });
  progresso().registrarArquivo('exportados', {
    nome,
    tipo: pacote.tipo,
    quantidade: quantidade(pacote),
  });
  if (pacote.revisao) progresso().salvarMaterial(pacote);
  return { pacote, nome };
}
