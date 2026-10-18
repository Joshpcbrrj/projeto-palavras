/**
 * Carrega as bibliotecas de PDF somente quando necessário,
 * deixando a abertura do app mais rápida.
 */

import { CDN } from '../config.js';
import { carregarScript } from '../core/dom.js';

export async function obterJsPDF() {
  if (!globalThis.jspdf?.jsPDF) await carregarScript(CDN.jsPDF);
  const jsPDF = globalThis.jspdf?.jsPDF;
  if (!jsPDF) throw new Error('A biblioteca de geração de PDF não está disponível.');
  return jsPDF;
}

export async function obterPdfJs() {
  if (!globalThis.pdfjsLib) await carregarScript(CDN.pdfjs);
  const pdfjsLib = globalThis.pdfjsLib;
  if (!pdfjsLib) throw new Error('A biblioteca de leitura de PDF não está disponível.');
  if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfjsWorker;
  }
  return pdfjsLib;
}
