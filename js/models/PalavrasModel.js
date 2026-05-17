/**
 * PalavrasModel.js
 * Modelo para processamento de palavras
 */

const PalavrasModel = {
  /**
   * Extrai palavras de um texto
   * @param {string} texto - Texto original
   * @returns {Array<string>} - Lista de palavras
   */
  extrair(texto) {
    const textoLimpo = texto.replace(/[^\w\sáéíóúãõâêîôûçüñÁÉÍÓÚÃÕÂÊÎÔÛÇÜÑ]/gi, ' ');
    const palavras = textoLimpo.split(/\s+/).filter((p) => p.length > 0);
    return palavras;
  },

  /**
   * Seleciona palavras aleatórias
   * @param {Array<string>} palavras - Lista original
   * @param {number} maximo - Número máximo a selecionar
   * @returns {Array<string>}
   */
  selecionarAleatorias(palavras, maximo = CONFIG.MAX_PALAVRAS) {
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

  /**
   * Obtém estatísticas das palavras
   * @param {Array<string>} palavras - Lista de palavras
   * @returns {Object}
   */
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
