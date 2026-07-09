/**
 * AppAudio.js
 * Gerenciamento de áudio do aplicativo
 */

class AppAudio {
  constructor() {
    this.audioAutomatico = false;
  }

  /**
   * Carrega a preferência de áudio automático salva
   * @returns {boolean}
   */
  carregarPreferencia() {
    let saved;
    if (typeof StorageService !== 'undefined') {
      saved = StorageService.carregar('audioAutomatico');
    } else {
      saved = localStorage.getItem('audioAutomatico');
    }

    if (saved !== null) {
      this.audioAutomatico = saved === 'true';
    }
    return this.audioAutomatico;
  }

  /**
   * Salva a preferência de áudio automático
   * @param {boolean} valor - Valor a ser salvo
   */
  salvarPreferencia(valor) {
    this.audioAutomatico = valor;
    if (typeof StorageService !== 'undefined') {
      StorageService.salvar('audioAutomatico', valor);
    } else {
      localStorage.setItem('audioAutomatico', valor);
    }
  }

  /**
   * Obtém o status do áudio automático
   * @returns {boolean}
   */
  isAudioAutomatico() {
    return this.audioAutomatico;
  }

  /**
   * Alterna o áudio automático
   * @returns {boolean}
   */
  toggleAudioAutomatico() {
    this.audioAutomatico = !this.audioAutomatico;
    this.salvarPreferencia(this.audioAutomatico);
    return this.audioAutomatico;
  }

  /**
   * Verifica se o sistema de áudio está disponível
   * @returns {boolean}
   */
  isAudioDisponivel() {
    return typeof AudioPlayer !== 'undefined' && typeof AudioPlayer.falarComCallback === 'function';
  }

  /**
   * Fala um item manualmente (botão "Ouvir Pronúncia")
   * @param {string} item - Texto a ser falado
   */
  falarItemManual(item) {
    if (!item) {
      console.warn('Nenhum item para falar');
      return;
    }

    if (typeof ValidatorService !== 'undefined' && !ValidatorService.isItemValido(item)) {
      console.warn(`⚠️ Não falando item inválido: "${item}"`);
      return;
    }

    if (!this.isAudioDisponivel()) {
      console.error('AudioPlayer não disponível');
      alert('Sistema de áudio não disponível. Recarregue a página.');
      return;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    AudioPlayer.falarComCallback(item, (sucesso) => {
      if (!sucesso) {
        console.warn('Falha ao reproduzir áudio');
      }
    });
  }

  /**
   * Fala um item com Promise (para áudio automático)
   * @param {string} item - Texto a ser falado
   * @returns {Promise<boolean>}
   */
  falarItemComPromise(item) {
    return new Promise((resolve) => {
      if (!item) {
        resolve(false);
        return;
      }

      if (typeof ValidatorService !== 'undefined' && !ValidatorService.isItemValido(item)) {
        resolve(false);
        return;
      }

      if (!this.isAudioDisponivel()) {
        resolve(false);
        return;
      }

      AudioPlayer.falarComCallback(item, () => {
        resolve(true);
      });

      // Timeout de segurança
      const palavras = item.split(/\s+/).length;
      const tempoEstimado = Math.min(Math.max(palavras * 0.6, 2), 12);
      setTimeout(() => resolve(true), tempoEstimado * 1000);
    });
  }

  /**
   * Para a reprodução de áudio atual
   */
  pararAudio() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}
