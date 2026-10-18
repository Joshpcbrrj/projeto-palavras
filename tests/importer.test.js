import { describe, expect, test } from 'vitest';
import {
  ErroImportacao,
  ORIGENS,
  interpretarJSON,
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
      'Meu progresso'
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
