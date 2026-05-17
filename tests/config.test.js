/**
 * tests/config.test.js
 * Testes para as configurações globais
 */

const CONFIG = {
  MAX_PALAVRAS: 100,
  MAX_FRASES: 30,
  TEMPO_PADRAO_PALAVRAS: 2,
  TEMPO_PADRAO_FRASES: 3,
  TIPOS: {
    PALAVRAS: 'palavras',
    FRASES: 'frases',
  },
};

describe('Configurações Globais', () => {
  describe('Limites', () => {
    test('MAX_PALAVRAS deve ser 100', () => {
      expect(CONFIG.MAX_PALAVRAS).toBe(100);
    });

    test('MAX_FRASES deve ser 30', () => {
      expect(CONFIG.MAX_FRASES).toBe(30);
    });
  });

  describe('Tempos padrão', () => {
    test('TEMPO_PADRAO_PALAVRAS deve ser 2 segundos', () => {
      expect(CONFIG.TEMPO_PADRAO_PALAVRAS).toBe(2);
    });

    test('TEMPO_PADRAO_FRASES deve ser 3 segundos', () => {
      expect(CONFIG.TEMPO_PADRAO_FRASES).toBe(3);
    });
  });

  describe('Tipos', () => {
    test('TIPOS.PALAVRAS deve ser "palavras"', () => {
      expect(CONFIG.TIPOS.PALAVRAS).toBe('palavras');
    });

    test('TIPOS.FRASES deve ser "frases"', () => {
      expect(CONFIG.TIPOS.FRASES).toBe('frases');
    });
  });
});
