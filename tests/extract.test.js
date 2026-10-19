import { describe, expect, test } from 'vitest';
import {
  contarPalavras,
  dividirParaLeitura,
  extrairFrases,
  extrairPalavras,
  normalizarTexto,
  pareceTitulo,
} from '../js/text/extract.js';

describe('extrairPalavras', () => {
  test('extrai palavras ignorando pontuação e repetições', () => {
    expect(extrairPalavras('Casa, carro! Escola? casa.')).toEqual(['Casa', 'carro', 'Escola']);
  });

  test('mantém palavras curtas (bug antigo descartava itens com menos de 5 letras)', () => {
    expect(extrairPalavras('I am at the sea')).toEqual(['I', 'am', 'at', 'the', 'sea']);
  });

  test('preserva acentos, cedilha e apóstrofos internos', () => {
    expect(extrairPalavras('coração, ação; don’t café-da-manhã')).toEqual([
      'coração',
      'ação',
      'don’t',
      'café',
      'da',
      'manhã',
    ]);
  });

  test('funciona com alfabetos não latinos', () => {
    expect(extrairPalavras('Привет, как дела?')).toEqual(['Привет', 'как', 'дела']);
    expect(extrairPalavras('Γειά σου κόσμε')).toEqual(['Γειά', 'σου', 'κόσμε']);
  });

  test('segmenta japonês (sem espaços) quando Intl.Segmenter existe', () => {
    const palavras = extrairPalavras('私は日本語を勉強します', { idioma: 'ja-JP' });
    expect(palavras.length).toBeGreaterThan(2);
    expect(palavras.join('')).not.toMatch(/[。、]/);
  });

  test('ignora números isolados, mas mantém palavras com letras', () => {
    expect(extrairPalavras('casa 123 2pac 4you')).toEqual(['casa', '2pac', '4you']);
  });

  test('pode manter repetições quando pedido', () => {
    expect(extrairPalavras('a a b', { removerDuplicadas: false })).toEqual(['a', 'a', 'b']);
  });

  test('retorna lista vazia para texto vazio', () => {
    expect(extrairPalavras('')).toEqual([]);
    expect(extrairPalavras('   ...  ')).toEqual([]);
    expect(extrairPalavras(null)).toEqual([]);
  });
});

describe('extrairFrases', () => {
  test('separa por ponto, exclamação, interrogação, ponto e vírgula e quebra de linha', () => {
    const texto = 'Bom dia! Como vai? Tudo bem; obrigado.\nAté amanhã';
    expect(extrairFrases(texto)).toEqual([
      'Bom dia',
      'Como vai',
      'Tudo bem',
      'obrigado',
      'Até amanhã',
    ]);
  });

  test('pode manter a pontuação final', () => {
    expect(extrairFrases('Olá! Tudo bem?', { manterPontuacao: true })).toEqual([
      'Olá!',
      'Tudo bem?',
    ]);
  });

  test('remove marcadores de lista e duplicadas', () => {
    expect(extrairFrases('- Primeira frase\n• Primeira frase\n* Segunda')).toEqual([
      'Primeira frase',
      'Segunda',
    ]);
  });

  test('entende pontuação japonesa', () => {
    expect(extrairFrases('おはよう。元気ですか？', { idioma: 'ja-JP' })).toEqual([
      'おはよう',
      '元気ですか',
    ]);
  });
});

describe('dividirParaLeitura', () => {
  test('divide em frases com a posição exata no texto original', () => {
    const texto = 'Primeira frase. Segunda frase!\n\nTerceira?';
    const trechos = dividirParaLeitura(texto);
    expect(trechos.map((t) => t.texto)).toEqual(['Primeira frase.', 'Segunda frase!', 'Terceira?']);
    for (const t of trechos) expect(texto.slice(t.inicio, t.fim)).toBe(t.texto);
  });

  test('quebra frases muito longas em trechos menores (limite do Chrome)', () => {
    const longa = Array.from({ length: 40 }, (_, i) => `parte ${i}`).join(', ') + '.';
    const trechos = dividirParaLeitura(longa, { maxCaracteres: 80 });
    expect(trechos.length).toBeGreaterThan(3);
    for (const t of trechos) {
      expect(t.texto.length).toBeLessThanOrEqual(80);
      expect(longa.slice(t.inicio, t.fim)).toBe(t.texto);
    }
  });

  test('ignora linhas sem letras', () => {
    expect(dividirParaLeitura('---\n\nOlá.')).toEqual([{ texto: 'Olá.', inicio: 5, fim: 9 }]);
  });
});

test('normalizarTexto remove espaços especiais e invisíveis', () => {
  expect(normalizarTexto('a b​c\r\nd   e')).toBe('a bc\nd e');
});

test('contarPalavras conta repetições', () => {
  expect(contarPalavras('o gato e o rato')).toBe(5);
});

test('pareceTitulo reconhece títulos de seção, mas não frases nem falas', () => {
  expect(pareceTitulo('A short history')).toBe(true);
  expect(pareceTitulo('Markets today')).toBe(true);
  expect(pareceTitulo('People trade goods every day.')).toBe(false);
  expect(pareceTitulo('Anna: Hi there')).toBe(false);
  expect(pareceTitulo('')).toBe(false);
  expect(pareceTitulo('x'.repeat(90))).toBe(false);
});
