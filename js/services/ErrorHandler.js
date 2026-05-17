/**
 * ErrorHandler.js
 * Centraliza o tratamento de erros e feedback visual
 */

const ErrorHandler = {
  /**
   * Mostra uma mensagem de erro para o usuário
   * @param {string} message - Mensagem de erro
   * @param {string} type - 'error', 'success', 'info', 'warning'
   */
  show(message, type = 'error') {
    console.error(`[${type.toUpperCase()}]`, message);

    // Usa toast se disponível, senão usa alert
    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show(message, type);
    } else {
      const prefix = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : '⚠️ ';
      alert(prefix + message);
    }
  },

  /**
   * Registra um erro no console com contexto
   * @param {Error} error - Objeto de erro
   * @param {string} context - Contexto onde o erro ocorreu
   */
  log(error, context) {
    console.error(`[${context}]`, error.message || error);
    if (error.stack) {
      console.debug(error.stack);
    }
  },

  /**
   * Mostra mensagem de sucesso
   * @param {string} message - Mensagem de sucesso
   */
  success(message) {
    this.show(message, 'success');
  },

  /**
   * Mostra mensagem de aviso
   * @param {string} message - Mensagem de aviso
   */
  warning(message) {
    this.show(message, 'warning');
  },

  /**
   * Mostra mensagem informativa
   * @param {string} message - Mensagem informativa
   */
  info(message) {
    this.show(message, 'info');
  },

  /**
   * Cria um handler para async/await com tratamento automático
   * @param {Function} fn - Função async
   * @param {string} context - Contexto para log
   * @returns {Function}
   */
  wrap(fn, context) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.log(error, context);
        this.show(`Erro: ${error.message}`);
        return null;
      }
    };
  },
};
