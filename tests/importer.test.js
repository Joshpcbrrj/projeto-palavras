import { describe, expect, test, vi } from 'vitest';
import {
  ErroImportacao,
  ORIGENS,
  extrairTextoPdf,
  interpretarJSON,
  interpretarPdf,
  interpretarTexto,
  lerArquivo,
} from '../js/pdf/importer.js';
import { codificarPacote, criarPacote } from '../js/pdf/format.js';

describe('importação de arquivos de texto e JSON', () => {
  test('texto livre vira um material do tipo texto com título do arquivo', () => {
    const m = interpretarTexto('Hello world. How are you?', 'minha_aula-de-ingles.txt');
    expect(m).toMatchObject({
      tipo: 'texto',
      origem: ORIGENS.TEXTO_LIVRE,
      titulo: 'minha aula de ingles',
    });
  });

  describe('importação de PDFs', () => {
    const pagina = (items) => ({
      getTextContent: vi.fn().mockResolvedValue({ items }),
    });

    test('agrupa fragmentos por linha, respeita quebras de página e ignora itens sem texto', async () => {
      const pdf = {
        numPages: 2,
        getPage: vi
          .fn()
          .mockResolvedValueOnce(
            pagina([
              { str: 'First', transform: [1, 0, 0, 1, 10, 100] },
              { str: 'paragraph.', transform: [1, 0, 0, 1, 40, 100], hasEOL: true },
              { str: 'Second line', transform: [1, 0, 0, 1, 10, 90] },
              { str: null, transform: [1, 0, 0, 1, 0, 90] },
            ])
          )
          .mockResolvedValueOnce(
            pagina([{ str: 'New page.', transform: [1, 0, 0, 1, 10, 100], hasEOL: true }])
          ),
      };

      await expect(extrairTextoPdf(pdf)).resolves.toBe(
        'First paragraph.\nSecond line\n\nNew page.\n\n'
      );
      expect(pdf.getPage).toHaveBeenNthCalledWith(1, 1);
      expect(pdf.getPage).toHaveBeenNthCalledWith(2, 2);
    });

    test('abre PDFs com texto selecionável e libera o documento mesmo se a metadata falhar', async () => {
      const pdf = {
        numPages: 1,
        getMetadata: vi.fn().mockRejectedValue(new Error('metadata ausente')),
        getPage: vi.fn().mockResolvedValue(
          pagina([
            { str: 'A useful reading.', transform: [1, 0, 0, 1, 10, 100], hasEOL: true },
            { str: 'A second sentence.', transform: [1, 0, 0, 1, 10, 80], hasEOL: true },
          ])
        ),
        destroy: vi.fn(),
      };
      const pdfjs = { getDocument: vi.fn(() => ({ promise: Promise.resolve(pdf) })) };

      const material = await interpretarPdf(new Uint8Array([1, 2]), 'lesson.pdf', pdfjs);
      expect(material).toMatchObject({
        tipo: 'texto',
        titulo: 'lesson',
        texto: 'A useful reading.\nA second sentence.',
        origem: ORIGENS.TEXTO_LIVRE,
      });
      expect(pdfjs.getDocument).toHaveBeenCalledWith({
        data: new Uint8Array([1, 2]),
        verbosity: 0,
      });
      expect(pdf.destroy).toHaveBeenCalledOnce();
    });

    test('prioriza o pacote do PDF e aceita-o em Keywords ou Subject', async () => {
      const pacote = criarPacote({
        tipo: 'frases',
        titulo: 'Revisão',
        idioma: 'en-US',
        itens: ['Keep learning.'],
        id: 'embedded-package',
      });
      const metadado = codificarPacote(pacote);
      const pdf = {
        numPages: 0,
        getMetadata: vi.fn().mockResolvedValue({ info: { Keywords: '', Subject: metadado } }),
        getPage: vi.fn(),
        destroy: vi.fn(),
      };
      const resultado = await interpretarPdf(new Uint8Array(), 'lesson.pdf', {
        getDocument: () => ({ promise: Promise.resolve(pdf) }),
      });

      expect(resultado).toMatchObject({
        id: 'embedded-package',
        tipo: 'frases',
        itens: ['Keep learning.'],
        origem: ORIGENS.PACOTE,
      });
      expect(pdf.getPage).not.toHaveBeenCalled();
      expect(pdf.destroy).toHaveBeenCalledOnce();
    });

    test('apresenta erros claros para PDF corrompido e arquivo sem texto selecionável', async () => {
      await expect(
        interpretarPdf(new Uint8Array(), 'broken.pdf', {
          getDocument: () => ({ promise: Promise.reject(new Error('broken')) }),
        })
      ).rejects.toThrow('pode estar corrompido');

      const pdf = {
        numPages: 1,
        getMetadata: vi.fn().mockResolvedValue({ info: {} }),
        getPage: vi.fn().mockResolvedValue(pagina([])),
        destroy: vi.fn(),
      };
      await expect(
        interpretarPdf(new Uint8Array(), 'scan.pdf', {
          getDocument: () => ({ promise: Promise.resolve(pdf) }),
        })
      ).rejects.toThrow('não tem texto selecionável');
      expect(pdf.destroy).toHaveBeenCalledOnce();
    });
  });

  test('reconhece pacote embutido em texto', () => {
    const pacote = criarPacote({ tipo: 'palavras', itens: ['a', 'b'] });
    const m = interpretarTexto(`qualquer coisa\n${codificarPacote(pacote)}`, 'x.txt');
    expect(m).toMatchObject({ origem: ORIGENS.PACOTE, itens: ['a', 'b'], id: pacote.id });
  });

  test('reconhece formato antigo em .txt', () => {
    const m = interpretarTexto(
      'Frases Estudadas\n1. Primeira frase aqui\n2. Segunda frase aqui',
      'antigo.txt'
    );
    expect(m).toMatchObject({ origem: ORIGENS.LEGADO, tipo: 'frases' });
  });

  test('JSON com vários materiais (exportado pela tela Revisar)', () => {
    const a = criarPacote({ tipo: 'palavras', itens: ['x'] });
    const b = criarPacote({ tipo: 'texto', texto: 'Olá' });
    const lista = interpretarJSON(
      JSON.stringify({ app: 'aprendendo-palavras', materiais: [a, b] }),
      'm.json'
    );
    expect(lista.map((m) => m.tipo)).toEqual(['palavras', 'texto']);
  });

  test('JSON do antigo "Verificar estudo"', () => {
    const [m] = interpretarJSON(
      JSON.stringify({ itens: ['casa', 'sol'], tipoEstudo: 'palavras' }),
      'meu_estudo.json'
    );
    expect(m).toMatchObject({ tipo: 'palavras', itens: ['casa', 'sol'], origem: ORIGENS.LEGADO });
  });

  test('mensagens claras para arquivos que não são materiais', () => {
    expect(() => interpretarJSON('{', 'quebrado.json')).toThrow(ErroImportacao);
    expect(() => interpretarJSON(JSON.stringify({ dadosCompletos: {} }), 'p.json')).toThrow(
      'versão anterior'
    );
    expect(() => interpretarJSON('{"a":1}', 'x.json')).toThrow('formato reconhecido');
    expect(() => interpretarTexto('   ', 'vazio.txt')).toThrow('não contém texto');
  });

  test('lerArquivo escolhe o leitor pela extensão', async () => {
    const txt = new File(['Bom dia. Boa noite.'], 'frases.txt', { type: 'text/plain' });
    const [m] = await lerArquivo(txt);
    expect(m.tipo).toBe('texto');
    await expect(lerArquivo(new File(['x'], 'foto.png', { type: 'image/png' }))).rejects.toThrow(
      'não suportado'
    );
  });
});
