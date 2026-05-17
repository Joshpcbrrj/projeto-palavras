/**
 * tests/frases.test.js
 * Testes para o modelo de frases
 */

const FrasesModel = {
  extrair(texto) {
    const frases = texto.split(/[.!?;]+/);
    const frasesLimpas = frases.map((frase) => frase.trim()).filter((frase) => frase.length > 0);
    return frasesLimpas;
  },

  selecionarAleatorias(frases, maximo = 30) {
    if (frases.length <= maximo) {
      return frases;
    }

    const embaralhadas = [...frases];
    for (let i = embaralhadas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [embaralhadas[i], embaralhadas[j]] = [embaralhadas[j], embaralhadas[i]];
    }

    return embaralhadas.slice(0, maximo);
  },

  contar(texto) {
    const frases = this.extrair(texto);
    return frases.length;
  },

  obterEstatisticas(frases) {
    const tamanhos = frases.map((frase) => frase.length);
    return {
      total: frases.length,
      maiorFrase: Math.max(...tamanhos),
      menorFrase: Math.min(...tamanhos),
      tamanhoMedio: (tamanhos.reduce((a, b) => a + b, 0) / tamanhos.length).toFixed(1),
    };
  },

  temFrasesValidas(texto) {
    const frases = this.extrair(texto);
    return frases.length > 0;
  },
};

describe('FrasesModel', () => {
  describe('extrair()', () => {
    test('deve extrair frases separadas por ponto final', () => {
      const texto = 'Hoje é um belo dia. O sol está brilhando. Vamos estudar.';
      const resultado = FrasesModel.extrair(texto);

      expect(resultado).toEqual(['Hoje é um belo dia', 'O sol está brilhando', 'Vamos estudar']);
    });

    test('deve extrair frases separadas por ponto de exclamação', () => {
      const texto = 'Que dia lindo! Vamos aproveitar!';
      const resultado = FrasesModel.extrair(texto);

      expect(resultado).toEqual(['Que dia lindo', 'Vamos aproveitar']);
    });

    test('deve extrair frases separadas por ponto de interrogação', () => {
      const texto = 'Como você está? Tudo bem?';
      const resultado = FrasesModel.extrair(texto);

      expect(resultado).toEqual(['Como você está', 'Tudo bem']);
    });

    test('deve extrair frases separadas por ponto e vírgula', () => {
      const texto = 'Comprei maçãs; bananas; e laranjas.';
      const resultado = FrasesModel.extrair(texto);

      expect(resultado).toEqual(['Comprei maçãs', 'bananas', 'e laranjas']);
    });

    test('deve retornar array vazio para texto vazio', () => {
      expect(FrasesModel.extrair('')).toEqual([]);
      expect(FrasesModel.extrair('   ')).toEqual([]);
    });

    test('deve retornar array vazio para texto sem pontuação', () => {
      expect(FrasesModel.extrair('texto sem pontuacao')).toEqual(['texto sem pontuacao']);
    });
  });

  describe('selecionarAleatorias()', () => {
    test('deve retornar todas as frases se menos que o máximo', () => {
      const frases = ['Frase 1', 'Frase 2', 'Frase 3'];
      const resultado = FrasesModel.selecionarAleatorias(frases, 30);

      expect(resultado).toEqual(frases);
    });

    test('deve selecionar no máximo o limite especificado (30)', () => {
      const frases = Array.from({ length: 50 }, (_, i) => `Frase ${i}`);
      const resultado = FrasesModel.selecionarAleatorias(frases, 30);

      expect(resultado.length).toBe(30);
    });

    test('deve retornar array vazio para entrada vazia', () => {
      const resultado = FrasesModel.selecionarAleatorias([], 30);
      expect(resultado).toEqual([]);
    });
  });

  describe('contar()', () => {
    test('deve contar corretamente o número de frases', () => {
      const texto = 'Frase 1. Frase 2. Frase 3.';
      expect(FrasesModel.contar(texto)).toBe(3);
    });

    test('deve retornar 0 para texto vazio', () => {
      expect(FrasesModel.contar('')).toBe(0);
    });
  });

  describe('obterEstatisticas()', () => {
    test('deve calcular corretamente as estatísticas', () => {
      const frases = ['Frase curta', 'Esta é uma frase um pouco mais longa para teste', 'Média'];
      const resultado = FrasesModel.obterEstatisticas(frases);

      // Calcula os tamanhos dinamicamente
      const tamanhos = frases.map((f) => f.length);
      const maiorEsperado = Math.max(...tamanhos);
      const menorEsperado = Math.min(...tamanhos);

      expect(resultado.total).toBe(3);
      expect(resultado.maiorFrase).toBe(maiorEsperado);
      expect(resultado.menorFrase).toBe(menorEsperado);
    });

    test('deve retornar valores padrão para array vazio', () => {
      const resultado = FrasesModel.obterEstatisticas([]);

      expect(resultado.total).toBe(0);
      expect(resultado.maiorFrase).toBe(-Infinity);
      expect(resultado.menorFrase).toBe(Infinity);
      expect(resultado.tamanhoMedio).toBe('NaN');
    });
  });

  describe('temFrasesValidas()', () => {
    test('deve retornar true para texto com frases', () => {
      expect(FrasesModel.temFrasesValidas('Frase 1. Frase 2.')).toBe(true);
    });

    test('deve retornar false para texto vazio', () => {
      expect(FrasesModel.temFrasesValidas('')).toBe(false);
    });

    test('deve retornar true para texto sem pontuação', () => {
      expect(FrasesModel.temFrasesValidas('texto sem pontuacao')).toBe(true);
    });
  });
});
