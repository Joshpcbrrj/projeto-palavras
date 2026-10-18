/**
 * Acesso ao localStorage com tolerância a falhas (modo privado, cota cheia, etc.).
 */

function obterStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const storage = {
  lerTexto(chave) {
    try {
      return obterStorage()?.getItem(chave) ?? null;
    } catch {
      return null;
    }
  },

  lerJSON(chave, padrao = null) {
    const texto = this.lerTexto(chave);
    if (texto === null) return padrao;
    try {
      return JSON.parse(texto);
    } catch {
      return padrao;
    }
  },

  salvarJSON(chave, valor) {
    try {
      obterStorage()?.setItem(chave, JSON.stringify(valor));
      return true;
    } catch (erro) {
      console.warn('Não foi possível salvar no armazenamento local:', erro);
      return false;
    }
  },

  remover(chave) {
    try {
      obterStorage()?.removeItem(chave);
    } catch {
      /* ignora */
    }
  },
};
