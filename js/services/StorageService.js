/**
 * StorageService.js
 * Gerenciamento centralizado do localStorage
 */

const StorageService = {
  /**
   * Salva um valor no localStorage
   * @param {string} key - Chave para armazenar
   * @param {any} value - Valor a ser armazenado
   */
  salvar(key, value) {
    try {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error('Erro ao salvar no storage:', error);
      return false;
    }
  },

  /**
   * Carrega um valor do localStorage
   * @param {string} key - Chave do valor armazenado
   * @param {any} defaultValue - Valor padrão se não existir
   * @returns {any}
   */
  carregar(key, defaultValue = null) {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return defaultValue;

      try {
        return JSON.parse(saved);
      } catch {
        return saved;
      }
    } catch (error) {
      console.error('Erro ao carregar do storage:', error);
      return defaultValue;
    }
  },

  /**
   * Remove um valor do localStorage
   * @param {string} key - Chave do valor a ser removido
   */
  remover(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Erro ao remover do storage:', error);
      return false;
    }
  },

  /**
   * Limpa todo o localStorage
   */
  limpar() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Erro ao limpar storage:', error);
      return false;
    }
  },
};
