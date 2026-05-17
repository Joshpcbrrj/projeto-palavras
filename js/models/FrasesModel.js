/**
 * FrasesModel.js
 * Modelo para processamento de frases
 */

const FrasesModel = {
  /**
   * Extrai frases de um texto
   * @param {string} texto - Texto original
   * @returns {Array<string>} - Lista de frases
   */
  extrair(texto) {
    const frases = texto.split(/[.!?;]+/);
    const frasesLimpas = frases.map((frase) => frase.trim()).filter((frase) => frase.length > 0);
    return frasesLimpas;
  },

  /**
   * Seleciona frases aleatórias
   * @param {Array<string>} frases - Lista original
   * @param {number} maximo - Número máximo a selecionar
   * @returns {Array<string>}
   */
  selecionarAleatorias(frases, maximo = CONFIG.MAX_FRASES) {
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

  /**
   * Conta quantas frases tem no texto
   * @param {string} texto - Texto original
   * @returns {number}
   */
  contar(texto) {
    const frases = this.extrair(texto);
    return frases.length;
  },

  /**
   * Obtém estatísticas das frases
   * @param {Array<string>} frases - Lista de frases
   * @returns {Object}
   */
  obterEstatisticas(frases) {
    const tamanhos = frases.map((frase) => frase.length);
    return {
      total: frases.length,
      maiorFrase: Math.max(...tamanhos),
      menorFrase: Math.min(...tamanhos),
      tamanhoMedio: (tamanhos.reduce((a, b) => a + b, 0) / tamanhos.length).toFixed(1),
    };
  },

  /**
   * Verifica se o texto tem frases válidas
   * @param {string} texto - Texto original
   * @returns {boolean}
   */
  temFrasesValidas(texto) {
    const frases = this.extrair(texto);
    return frases.length > 0;
  },
};
