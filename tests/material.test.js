/**
 * Material de estudo: filtro de palavras comuns e exportação unificada
 * (PDF e kit PDF + MP3).
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../js/pdf/exporter.js', async (original) => ({
  ...(await original()),
  exportarPdf: vi.fn(async (pacote, { nomeArquivo } = {}) => nomeArquivo || 'gerado.pdf'),
}));

const { ehPalavraComum, semPalavrasComuns, temListaDeComuns } =
  await import('../js/text/comuns.js');
const { extrairPalavras } = await import('../js/text/extract.js');
const { exportarMaterialPdf, nomeBaseKit } = await import('../js/services/export.js');
const { exportarPdf, nomeArquivoPdf } = await import('../js/pdf/exporter.js');
const { nomeArquivoMp3 } = await import('../js/audio/export/index.js');

beforeEach(() => {
  localStorage.clear();
  exportarPdf.mockClear();
});

describe('palavras muito comuns', () => {
  test('reconhece palavras comuns do inglês, sem diferenciar maiúsculas e apóstrofos', () => {
    expect(ehPalavraComum('The')).toBe(true);
    expect(ehPalavraComum('don’t')).toBe(true);
    expect(ehPalavraComum('kitchen')).toBe(false);
  });

  test('só filtra idiomas com lista (inglês)', () => {
    expect(temListaDeComuns('en-US')).toBe(true);
    expect(temListaDeComuns('pt-BR')).toBe(false);
    expect(semPalavrasComuns(['de', 'casa'], 'pt-BR')).toEqual(['de', 'casa']);
  });

  test('extrairPalavras com ignorarComuns deixa só o que vale estudar', () => {
    const texto = 'The cat is on the table and it is sleeping.';
    expect(extrairPalavras(texto, { idioma: 'en-US', ignorarComuns: true })).toEqual([
      'cat',
      'table',
      'sleeping',
    ]);
    expect(extrairPalavras(texto, { idioma: 'en-US' })).toContain('The');
  });
});

describe('exportação unificada', () => {
  const palavras = { tipo: 'palavras', titulo: 'Cozinha', idioma: 'en-US', itens: ['cat', 'dog'] };

  test('gera o PDF sem gravar histórico ou progresso no navegador', async () => {
    const resultado = await exportarMaterialPdf(palavras);
    expect(exportarPdf).toHaveBeenCalledWith(resultado.pacote, { nomeArquivo: undefined });
    expect(localStorage.length).toBe(0);
  });

  test('sem conteúdo, avisa em vez de gerar um PDF vazio', async () => {
    await expect(exportarMaterialPdf({ tipo: 'palavras', itens: [] })).rejects.toThrow(
      'Não há conteúdo'
    );
  });

  test('kit: PDF e MP3 compartilham o mesmo nome-base', async () => {
    const base = nomeBaseKit(palavras, new Date(2026, 9, 18, 9, 5));
    expect(base).toBe('palavras_cozinha_2026-10-18_09h05');
    const { nome } = await exportarMaterialPdf(palavras, { nomeArquivo: `${base}.pdf` });
    expect(nome).toBe(`${base}.pdf`);
  });

  test('o nome do PDF identifica o tipo de material e a data', () => {
    const data = new Date(2026, 9, 18, 9, 5);
    expect(nomeArquivoPdf({ tipo: 'texto', titulo: 'Aula' }, data)).toBe(
      'texto_aula_2026-10-18_09h05.pdf'
    );
    expect(nomeArquivoPdf({ tipo: 'frases', titulo: 'Aula' }, data)).toBe(
      'frases_aula_2026-10-18_09h05.pdf'
    );
    expect(nomeArquivoPdf({ tipo: 'palavras', titulo: 'Aula' }, data)).toBe(
      'palavras_aula_2026-10-18_09h05.pdf'
    );
  });

  test('o MP3 avulso e o PDF do kit compartilham o mesmo nome-base', () => {
    const data = new Date(2026, 9, 18, 9, 5);
    const material = { tipo: 'frases', titulo: 'Viagem' };
    expect(nomeArquivoMp3(material, data).replace(/\.mp3$/, '')).toBe(nomeBaseKit(material, data));
  });
});
