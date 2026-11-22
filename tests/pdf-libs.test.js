import { afterEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ carregarScript: vi.fn() }));

vi.mock('../js/core/dom.js', () => ({ carregarScript: mocks.carregarScript }));

const { obterJsPDF, obterPdfJs } = await import('../js/pdf/libs.js');

afterEach(() => {
  delete globalThis.jspdf;
  delete globalThis.pdfjsLib;
  mocks.carregarScript.mockReset();
});

describe('carregamento sob demanda das bibliotecas PDF', () => {
  test('reutiliza jsPDF já carregado e reporta erro quando a CDN não expõe a biblioteca', async () => {
    class JsPDF {}
    globalThis.jspdf = { jsPDF: JsPDF };
    await expect(obterJsPDF()).resolves.toBe(JsPDF);
    expect(mocks.carregarScript).not.toHaveBeenCalled();

    delete globalThis.jspdf;
    mocks.carregarScript.mockResolvedValue(undefined);
    await expect(obterJsPDF()).rejects.toThrow(
      'A biblioteca de geração de PDF não está disponível.'
    );
  });

  test('carrega jsPDF quando necessário e propaga falha de rede', async () => {
    class JsPDF {}
    mocks.carregarScript.mockImplementation(async () => {
      globalThis.jspdf = { jsPDF: JsPDF };
    });
    await expect(obterJsPDF()).resolves.toBe(JsPDF);
    expect(mocks.carregarScript).toHaveBeenCalledOnce();

    delete globalThis.jspdf;
    mocks.carregarScript.mockRejectedValueOnce(new Error('offline'));
    await expect(obterJsPDF()).rejects.toThrow('offline');
  });

  test('configura o worker PDF.js apenas quando ainda não foi definido', async () => {
    const pdfjs = { GlobalWorkerOptions: {} };
    globalThis.pdfjsLib = pdfjs;
    await expect(obterPdfJs()).resolves.toBe(pdfjs);
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toContain('pdf.worker.min.js');

    pdfjs.GlobalWorkerOptions.workerSrc = 'custom-worker.js';
    await obterPdfJs();
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe('custom-worker.js');
    expect(mocks.carregarScript).not.toHaveBeenCalled();
  });

  test('carrega PDF.js sob demanda e rejeita uma biblioteca indisponível', async () => {
    const pdfjs = {};
    mocks.carregarScript.mockImplementation(async () => {
      globalThis.pdfjsLib = pdfjs;
    });
    await expect(obterPdfJs()).resolves.toBe(pdfjs);
    expect(mocks.carregarScript).toHaveBeenCalledOnce();

    delete globalThis.pdfjsLib;
    mocks.carregarScript.mockResolvedValueOnce(undefined);
    await expect(obterPdfJs()).rejects.toThrow(
      'A biblioteca de leitura de PDF não está disponível.'
    );
  });
});
