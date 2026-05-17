/**
 * AppNavigation.js
 * Gerenciamento de navegação do aplicativo
 */

class AppNavigation {
  constructor() {
    this.tempoIntervalo = null;
  }

  /**
   * Limpa timers e áudios ativos
   */
  limparEstadoAtivo() {
    if (this.tempoIntervalo) {
      clearInterval(this.tempoIntervalo);
      this.tempoIntervalo = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Define o timer para limpeza posterior
   * @param {number} timer - ID do timer (setTimeout/setInterval)
   */
  setTimer(timer) {
    this.tempoIntervalo = timer;
  }

  /**
   * Obtém o timer atual
   * @returns {number|null}
   */
  getTimer() {
    return this.tempoIntervalo;
  }

  /**
   * Verifica se há um timer ativo
   * @returns {boolean}
   */
  hasTimer() {
    return this.tempoIntervalo !== null;
  }

  /**
   * Volta para o menu principal
   */
  voltarParaMenu() {
    this.limparEstadoAtivo();
    if (typeof renderizarMenu === 'function') {
      renderizarMenu();
    }
  }

  /**
   * Recarrega a página atual
   */
  recarregarPagina() {
    this.limparEstadoAtivo();
    location.reload();
  }

  /**
   * Navega para uma URL específica
   * @param {string} url - URL de destino
   */
  navegarPara(url) {
    this.limparEstadoAtivo();
    window.location.href = url;
  }
}
