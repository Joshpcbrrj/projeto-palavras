/**
 * AudioIdiomas.js
 * Gerencia idiomas e vozes para reprodução de áudio
 */

const AudioIdiomas = {
  // Idiomas suportados
  idiomas: {
    'pt-BR': { nome: 'Português (Brasil)', bandeira: '🇧🇷', codigo: 'pt-BR' },
    'pt-PT': { nome: 'Português (Portugal)', bandeira: '🇵🇹', codigo: 'pt-PT' },
    'en-US': { nome: 'Inglês (EUA)', bandeira: '🇺🇸', codigo: 'en-US' },
    'en-GB': { nome: 'Inglês (UK)', bandeira: '🇬🇧', codigo: 'en-GB' },
    'es-ES': { nome: 'Espanhol', bandeira: '🇪🇸', codigo: 'es-ES' },
    'fr-FR': { nome: 'Francês', bandeira: '🇫🇷', codigo: 'fr-FR' },
    'de-DE': { nome: 'Alemão', bandeira: '🇩🇪', codigo: 'de-DE' },
    'it-IT': { nome: 'Italiano', bandeira: '🇮🇹', codigo: 'it-IT' },
    'ja-JP': { nome: 'Japonês', bandeira: '🇯🇵', codigo: 'ja-JP' },
    'ko-KR': { nome: 'Coreano', bandeira: '🇰🇷', codigo: 'ko-KR' },
    'zh-CN': { nome: 'Chinês', bandeira: '🇨🇳', codigo: 'zh-CN' },
    'ru-RU': { nome: 'Russo', bandeira: '🇷🇺', codigo: 'ru-RU' },
  },

  // Chave para salvar no localStorage
  STORAGE_KEY: 'audio_idioma',

  // Idioma selecionado atualmente
  idiomaAtual: null,

  // Voz disponível para o idioma
  vozDisponivel: null,

  // Lista de vozes disponíveis no sistema
  vozesDisponiveis: [],

  /**
   * Inicializa o gerenciador de idiomas
   */
  init() {
    this.carregarIdiomaSalvo();
    this.carregarVozes();

    // Alguns navegadores carregam vozes async
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.carregarVozes();
      };
    }
  },

  /**
   * Salva o idioma no localStorage usando StorageService
   * @param {string} idioma - Código do idioma
   */
  salvarIdiomaStorage(idioma) {
    if (typeof StorageService !== 'undefined') {
      StorageService.salvar(this.STORAGE_KEY, idioma);
    } else {
      localStorage.setItem(this.STORAGE_KEY, idioma);
    }
  },

  /**
   * Carrega o idioma salvo no localStorage
   */
  carregarIdiomaSalvo() {
    let saved;
    if (typeof StorageService !== 'undefined') {
      saved = StorageService.carregar(this.STORAGE_KEY);
    } else {
      saved = localStorage.getItem(this.STORAGE_KEY);
    }

    if (saved && this.idiomas[saved]) {
      this.idiomaAtual = saved;
    } else {
      // Detecta idioma do navegador ou usa português como padrão
      const navegadorIdioma = navigator.language;
      if (this.idiomas[navegadorIdioma]) {
        this.idiomaAtual = navegadorIdioma;
      } else {
        this.idiomaAtual = 'pt-BR';
      }
    }
  },

  /**
   * Salva o idioma e atualiza as vozes
   * @param {string} idioma - Código do idioma
   * @returns {boolean}
   */
  salvarIdioma(idioma) {
    if (this.idiomas[idioma]) {
      this.idiomaAtual = idioma;
      this.salvarIdiomaStorage(idioma);
      this.vozDisponivel = null;
      this.carregarVozes();
      return true;
    }
    return false;
  },

  /**
   * Carrega as vozes disponíveis e encontra a melhor para o idioma
   */
  carregarVozes() {
    if (!window.speechSynthesis) return;

    this.vozesDisponiveis = window.speechSynthesis.getVoices();

    // Busca voz que corresponde ao idioma atual
    this.vozDisponivel = this.vozesDisponiveis.find(
      (voz) => voz.lang === this.idiomaAtual || voz.lang.startsWith(this.idiomaAtual.split('-')[0])
    );

    if (!this.vozDisponivel) {
      // Fallback: tenta encontrar qualquer voz do mesmo idioma base
      const baseLang = this.idiomaAtual.split('-')[0];
      this.vozDisponivel = this.vozesDisponiveis.find((voz) => voz.lang.startsWith(baseLang));
    }
  },

  /**
   * Obtém a voz disponível para o idioma atual
   * @returns {SpeechSynthesisVoice|null}
   */
  getVozDisponivel() {
    return this.vozDisponivel;
  },

  /**
   * Obtém o código do idioma atual
   * @returns {string}
   */
  getIdiomaAtual() {
    return this.idiomaAtual;
  },

  /**
   * Obtém o nome do idioma atual
   * @returns {string}
   */
  getNomeIdiomaAtual() {
    return this.idiomas[this.idiomaAtual]?.nome || 'Português (Brasil)';
  },

  /**
   * Obtém a bandeira do idioma atual
   * @returns {string}
   */
  getBandeiraAtual() {
    return this.idiomas[this.idiomaAtual]?.bandeira || '🇧🇷';
  },

  /**
   * Calcula o tempo estimado para falar um texto (em segundos)
   * @param {string} texto - Texto a ser falado
   * @returns {number}
   */
  calcularTempoFala(texto) {
    if (!texto) return 2;

    const palavras = texto.trim().split(/\s+/).length;
    let tempoEstimado = palavras * 0.5;
    tempoEstimado = Math.max(tempoEstimado, 2);
    tempoEstimado = Math.min(tempoEstimado, 15);

    return tempoEstimado;
  },
};

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  AudioIdiomas.init();
});
