/**
 * tests/palavras.test.js
 * Testes para o modelo de palavras
 */

const PalavrasModel = {
  extrair(texto) {
    const textoLimpo = texto.replace(/[^\w\sáéíóúãõâêîôûçüñÁÉÍÓÚÃÕÂÊÎÔÛÇÜÑ]/gi, ' ');
    const palavras = textoLimpo.split(/\s+/).filter((p) => p.length > 0);
    return palavras;
  },

  selecionarAleatorias(palavras, maximo = 100) {
    if (palavras.length <= maximo) {
      return palavras;
    }

    const embaralhadas = [...palavras];
    for (let i = embaralhadas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [embaralhadas[i], embaralhadas[j]] = [embaralhadas[j], embaralhadas[i]];
    }

    return embaralhadas.slice(0, maximo);
  },

  obterEstatisticas(palavras) {
    const tamanhos = palavras.map((p) => p.length);
    return {
      total: palavras.length,
      maiorPalavra: Math.max(...tamanhos),
      menorPalavra: Math.min(...tamanhos),
      tamanhoMedio: (tamanhos.reduce((a, b) => a + b, 0) / tamanhos.length).toFixed(1),
    };
  },
};

describe('PalavrasModel', () => {
  describe('extrair()', () => {
    test('deve extrair palavras de um texto simples', () => {
      const texto = 'casa carro escola';
      const resultado = PalavrasModel.extrair(texto);

      expect(resultado).toEqual(['casa', 'carro', 'escola']);
    });

    test('deve ignorar pontuação', () => {
      const texto = 'casa, carro! escola?';
      const resultado = PalavrasModel.extrair(texto);

      expect(resultado).toEqual(['casa', 'carro', 'escola']);
    });

    test('deve manter números como palavras', () => {
      const texto = 'casa 123 carro 456 escola';
      const resultado = PalavrasModel.extrair(texto);

      // Números são mantidos como palavras
      expect(resultado).toEqual(['casa', '123', 'carro', '456', 'escola']);
    });

    test('deve manter números misturados com letras', () => {
      const texto = '18 and life 2pac 4you';
      const resultado = PalavrasModel.extrair(texto);

      expect(resultado).toEqual(['18', 'and', 'life', '2pac', '4you']);
    });

    test('deve retornar array vazio para texto vazio', () => {
      expect(PalavrasModel.extrair('')).toEqual([]);
      expect(PalavrasModel.extrair('   ')).toEqual([]);
    });

    test('deve lidar com acentos corretamente', () => {
      const texto = 'coração ação atenção';
      const resultado = PalavrasModel.extrair(texto);

      expect(resultado).toEqual(['coração', 'ação', 'atenção']);
    });
  });

  describe('selecionarAleatorias()', () => {
    test('deve retornar todas as palavras se menos que o máximo', () => {
      const palavras = ['casa', 'carro', 'escola'];
      const resultado = PalavrasModel.selecionarAleatorias(palavras, 100);

      expect(resultado).toEqual(palavras);
    });

    test('deve selecionar no máximo o limite especificado', () => {
      const palavras = Array.from({ length: 200 }, (_, i) => `palavra${i}`);
      const resultado = PalavrasModel.selecionarAleatorias(palavras, 100);

      expect(resultado.length).toBe(100);
    });

    test('deve retornar array vazio para entrada vazia', () => {
      const resultado = PalavrasModel.selecionarAleatorias([], 100);
      expect(resultado).toEqual([]);
    });
  });

  describe('obterEstatisticas()', () => {
    test('deve calcular corretamente as estatísticas', () => {
      const palavras = ['casa', 'carro', 'escola'];
      const resultado = PalavrasModel.obterEstatisticas(palavras);

      expect(resultado.total).toBe(3);
      expect(resultado.maiorPalavra).toBe(6); // 'escola' tem 6 letras
      expect(resultado.menorPalavra).toBe(4); // 'casa' tem 4 letras
      expect(resultado.tamanhoMedio).toBe('5.0');
    });

    test('deve lidar com números nas estatísticas', () => {
      const palavras = ['18', 'and', 'life', '2pac'];
      const resultado = PalavrasModel.obterEstatisticas(palavras);

      expect(resultado.total).toBe(4);
      expect(resultado.maiorPalavra).toBe(4); // 'life' tem 4 letras
      expect(resultado.menorPalavra).toBe(2); // '18' tem 2 caracteres
    });

    test('deve lidar com palavras de diferentes tamanhos', () => {
      const palavras = ['a', 'bc', 'def', 'ghij'];
      const resultado = PalavrasModel.obterEstatisticas(palavras);

      expect(resultado.maiorPalavra).toBe(4);
      expect(resultado.menorPalavra).toBe(1);
      expect(resultado.tamanhoMedio).toBe('2.5');
    });

    test('deve retornar valores padrão para array vazio', () => {
      const resultado = PalavrasModel.obterEstatisticas([]);

      expect(resultado.total).toBe(0);
      expect(resultado.maiorPalavra).toBe(-Infinity);
      expect(resultado.menorPalavra).toBe(Infinity);
      expect(resultado.tamanhoMedio).toBe('NaN');
    });
  });
});
