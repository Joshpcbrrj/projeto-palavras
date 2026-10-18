// @vitest-environment node
/**
 * Teste de ida e volta: gera PDFs reais com jsPDF e os lê de volta com pdf.js,
 * exatamente como o app faz no navegador.
 */
import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';
import { jsPDF } from 'jspdf';
import { criarPacote, criarRevisao } from '../js/pdf/format.js';
import { gerarDocumentoPdf } from '../js/pdf/exporter.js';
import { ORIGENS, extrairTextoPdf, interpretarPdf } from '../js/pdf/importer.js';

const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

function gerarBytes(pacote) {
  const doc = gerarDocumentoPdf(pacote, { jsPDF, rasterizar: null, hoje: new Date(2026, 9, 18) });
  return new Uint8Array(doc.output('arraybuffer'));
}

describe('PDF: geração e revisão (ida e volta)', () => {
  test('palavras com acentos voltam idênticas e na mesma ordem', async () => {
    const itens = ['coração', 'ação', 'über', 'niño', 'garçon', 'straße', "don't", 'casa'];
    const pacote = criarPacote({
      tipo: 'palavras',
      titulo: 'Lição 1 — Básico',
      idioma: 'pt-BR',
      itens,
    });
    const material = await interpretarPdf(gerarBytes(pacote), 'licao.pdf', pdfjsLib);

    expect(material.origem).toBe(ORIGENS.PACOTE);
    expect(material.tipo).toBe('palavras');
    expect(material.itens).toEqual(itens);
    expect(material.titulo).toBe('Lição 1 — Básico');
    expect(material.id).toBe(pacote.id);
  });

  test('frases e data de revisão são preservadas', async () => {
    const revisao = criarRevisao({ etapa: 2, revisarEm: '2026-10-25', historico: ['2026-10-18'] });
    const itens = ['Where is the train station?', 'I would like a cup of coffee, please.'];
    const pacote = criarPacote({ tipo: 'frases', idioma: 'en-US', itens, revisao });
    const material = await interpretarPdf(gerarBytes(pacote), 'frases.pdf', pdfjsLib);

    expect(material.itens).toEqual(itens);
    expect(material.idioma).toBe('en-US');
    expect(material.revisao).toMatchObject({ etapa: 2, revisarEm: '2026-10-25' });
  });

  test('texto longo (várias páginas) e escrita não latina voltam intactos', async () => {
    const paragrafo =
      'Aprender um idioma exige constância. Ouça, repita e revise em intervalos crescentes. ';
    const texto = `${paragrafo.repeat(120)}\n\nПривет! これは日本語の文です。`;
    const pacote = criarPacote({ tipo: 'texto', titulo: 'Texto longo', idioma: 'ru-RU', texto });
    const bytes = gerarBytes(pacote);
    const material = await interpretarPdf(bytes, 'texto.pdf', pdfjsLib);

    expect(material.texto).toBe(texto);
    expect(material.idioma).toBe('ru-RU');

    const pdf = await pdfjsLib.getDocument({ data: bytes, verbosity: 0 }).promise;
    expect(pdf.numPages).toBeGreaterThan(1);
  });

  test('o texto visível do PDF também é legível (acentos corretos)', async () => {
    const itens = ['coração', 'atenção', 'pão'];
    const pacote = criarPacote({ tipo: 'palavras', itens });
    const pdf = await pdfjsLib.getDocument({ data: gerarBytes(pacote), verbosity: 0 }).promise;
    const texto = await extrairTextoPdf(pdf);

    for (const item of itens) expect(texto).toContain(item);
    expect(texto).toContain('Página 1 de 1');
  });

  test('PDF sem pacote cai na leitura do formato antigo', async () => {
    // Simula um PDF da versão 2 (lista numerada + metadados em texto).
    const doc = new jsPDF();
    doc.text('Palavras Estudadas', 20, 20);
    doc.text('Data: 10/07/2026', 20, 30);
    ['1. casa', '2. carro', '3. escola'].forEach((linha, i) => doc.text(linha, 20, 45 + i * 7));
    doc.setFontSize(6);
    doc.text('=== METADADOS DO ESTUDO ===', 20, 80);
    doc.text('IDIOMA: en-US', 20, 84);
    doc.text('TIPO: palavras', 20, 88);
    doc.text('=== FIM METADADOS ===', 20, 92);

    const material = await interpretarPdf(
      new Uint8Array(doc.output('arraybuffer')),
      'palavras_estudadas_2026-07-10.pdf',
      pdfjsLib
    );
    expect(material.origem).toBe(ORIGENS.LEGADO);
    expect(material.tipo).toBe('palavras');
    expect(material.itens).toEqual(['casa', 'carro', 'escola']);
    expect(material.idioma).toBe('en-US');
  });
});
