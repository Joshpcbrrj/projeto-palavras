/**
 * ShufflerService.js
 * Embaralhamento de itens (ordem aleatória)
 */

const ShufflerService = {
  /**
   * Embaralha um array usando algoritmo Fisher-Yates
   */
  shuffle(itens) {
    const arr = [...itens];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /**
   * Retorna uma cópia embaralhada mantendo o original
   */
  shuffledCopy(itens) {
    return this.shuffle(itens);
  },
};
