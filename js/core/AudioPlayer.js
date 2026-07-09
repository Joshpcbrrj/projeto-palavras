/**
 * AudioPlayer.js
 * Reprodução de áudio usando Web Speech API
 */

const AudioPlayer = {
  /**
   * Fala um texto no idioma selecionado
   * @param {string} texto - Texto a ser falado
   * @returns {boolean}
   */
  falar(texto, { rate } = {}) {
    if (!texto) {
      console.warn('Nenhum texto para falar');
      return false;
    }

    if (!window.speechSynthesis) {
      alert('Seu navegador não suporta áudio. Tente usar Chrome, Edge ou Safari.');
      return false;
    }

    // Cancela qualquer fala em andamento
    window.speechSynthesis.cancel();

    const idiomaAtual = AudioIdiomas
      ? AudioIdiomas.getIdiomaAtual?.() || AudioIdiomas.idiomaAtual || 'pt-BR'
      : 'pt-BR';

    const vozDisponivel = AudioIdiomas
      ? AudioIdiomas.getVozDisponivel?.() || AudioIdiomas.vozDisponivel || null
      : null;

    const utterance = new SpeechSynthesisUtterance(texto);


    utterance.lang = idiomaAtual;
    utterance.rate = typeof rate === 'number' ? rate : 0.85; // Velocidade configurável
    utterance.pitch = 1; // Tom normal

    // Usa a voz específica se disponível
    if (vozDisponivel) {
      utterance.voice = vozDisponivel;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  },

  /**
   * Fala um texto com callback ao terminar
   * @param {string} texto - Texto a ser falado
   * @param {Function} callback - Função chamada ao terminar
   * @returns {boolean}
   */
  falarComCallback(texto, callback, { rate } = {}) {
    if (!texto) {
      if (callback) callback(false);
      return false;
    }

    if (!window.speechSynthesis) {
      alert('Seu navegador não suporta áudio. Tente usar Chrome, Edge ou Safari.');
      if (callback) callback(false);
      return false;
    }

    // Cancela qualquer fala em andamento
    window.speechSynthesis.cancel();

    const idiomaAtual = AudioIdiomas
      ? AudioIdiomas.getIdiomaAtual?.() || AudioIdiomas.idiomaAtual || 'pt-BR'
      : 'pt-BR';

    // getVoices() pode retornar [] no primeiro carregamento em alguns navegadores.
    // Recarrega se possível.
    if (
      AudioIdiomas &&
      window.speechSynthesis &&
      typeof window.speechSynthesis.getVoices === 'function' &&
      typeof AudioIdiomas.carregarVozes === 'function'
    ) {
      try {
        const vozes = window.speechSynthesis.getVoices();
        if (Array.isArray(vozes) && vozes.length > 0) {
          AudioIdiomas.carregarVozes();
        }
      } catch (e) {
        // ignora
      }
    }

    const vozDisponivel = AudioIdiomas
      ? AudioIdiomas.getVozDisponivel?.() || AudioIdiomas.vozDisponivel || null
      : null;

    const utterance = new SpeechSynthesisUtterance(texto);

    utterance.lang = idiomaAtual;
    utterance.rate = typeof rate === 'number' ? rate : 0.85;
    utterance.pitch = 1;

    if (vozDisponivel) {
      utterance.voice = vozDisponivel;
    }

    utterance.onend = () => {
      if (callback) callback(true);
    };

    utterance.onerror = () => {
      if (callback) callback(false);
    };

    window.speechSynthesis.speak(utterance);
    return true;
  },

  /**
   * Fala um texto com Promise (resolve quando terminar)
   * @param {string} texto - Texto a ser falado
   * @returns {Promise<boolean>}
   */
  falarComPromise(texto, { rate } = {}) {
    return new Promise((resolve) => {
      if (!texto) {
        resolve(false);
        return;
      }

      if (!window.speechSynthesis) {
        alert('Seu navegador não suporta áudio. Tente usar Chrome, Edge ou Safari.');
        resolve(false);
        return;
      }

      window.speechSynthesis.cancel();

      const idiomaAtual = AudioIdiomas
        ? AudioIdiomas.getIdiomaAtual?.() || AudioIdiomas.idiomaAtual || 'pt-BR'
        : 'pt-BR';
      const vozDisponivel = AudioIdiomas
        ? AudioIdiomas.getVozDisponivel?.() || AudioIdiomas.vozDisponivel || null
        : null;

      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = idiomaAtual;
      utterance.rate = typeof rate === 'number' ? rate : 0.85;

      utterance.pitch = 1;

      if (vozDisponivel) {
        utterance.voice = vozDisponivel;
      }

      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);

      window.speechSynthesis.speak(utterance);

      // Timeout de segurança
      const palavras = texto.split(/\s+/).length;
      const tempoEstimado = Math.min(Math.max(palavras * 0.6, 2), 12);
      setTimeout(() => resolve(true), tempoEstimado * 1000);
    });
  },

  /**
   * Para a fala atual
   */
  parar() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  },

  pausar() {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  },

  retomar() {
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  },

  /**
   * Verifica se o navegador suporta síntese de fala
   * @returns {boolean}
   */
  isSupported() {
    return typeof window.speechSynthesis !== 'undefined';
  },

  /**
   * Verifica se está falando no momento
   * @returns {boolean}
   */
  isSpeaking() {
    return window.speechSynthesis && window.speechSynthesis.speaking;
  },

  /**
   * Verifica se está pausado
   * @returns {boolean}
   */
  isPaused() {
    return window.speechSynthesis && window.speechSynthesis.paused;
  },
};
