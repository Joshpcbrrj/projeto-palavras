/**
 * LoadingManager.js
 * Gerencia estados de loading em botões
 */

const LoadingManager = {
  /**
   * Ativa o estado de loading em um botão
   * @param {HTMLElement} button - Botão
   * @param {string} loadingText - Texto durante loading
   * @returns {string} - Texto original
   */
  start(button, loadingText = '⏳ Carregando...') {
    if (!button) return null;

    const originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    button.classList.add('opacity-50', 'cursor-not-allowed');

    return originalText;
  },

  /**
   * Desativa o estado de loading em um botão
   * @param {HTMLElement} button - Botão
   * @param {string} originalText - Texto original
   */
  stop(button, originalText) {
    if (!button) return;

    button.textContent = originalText;
    button.disabled = false;
    button.classList.remove('opacity-50', 'cursor-not-allowed');
  },

  /**
   * Executa uma função assíncrona com loading
   * @param {HTMLElement} button - Botão
   * @param {Function} fn - Função assíncrona
   * @param {string} loadingText - Texto durante loading
   * @returns {Promise<any>}
   */
  async execute(button, fn, loadingText = '⏳ Processando...') {
    const originalText = this.start(button, loadingText);
    try {
      return await fn();
    } finally {
      this.stop(button, originalText);
    }
  },
};
