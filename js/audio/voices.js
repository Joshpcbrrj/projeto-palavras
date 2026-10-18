/**
 * Gerencia as vozes de síntese disponíveis no dispositivo.
 *
 * A qualidade das vozes varia muito entre navegadores e sistemas. Este módulo
 * classifica as vozes de cada idioma e escolhe automaticamente a melhor
 * (vozes "Natural", "Neural", "Online", "Premium" e as do Google costumam soar
 * bem mais naturais), respeitando a escolha manual do usuário quando houver.
 */

const QUALIDADE_ALTA = /natural|neural|online|premium|enhanced|wavenet|studio|journey|siri/i;
const VOZES_NOVIDADE =
  /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|eloquence|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|espeak/i;

/** Normaliza códigos como "en_US" (Android) para "en-US". */
export function normalizarIdioma(lang) {
  return String(lang || '')
    .replace('_', '-')
    .toLowerCase();
}

export function idiomaBase(lang) {
  return normalizarIdioma(lang).split('-')[0];
}

/** Pontua uma voz para um idioma. Retorna -1 se a voz não serve para o idioma. */
export function pontuarVoz(voz, idioma) {
  const lang = normalizarIdioma(voz.lang);
  const alvo = normalizarIdioma(idioma);
  let pontos;
  if (lang === alvo) pontos = 100;
  else if (idiomaBase(lang) === idiomaBase(alvo)) pontos = 60;
  else return -1;

  const nome = voz.name || '';
  if (QUALIDADE_ALTA.test(nome)) pontos += 30;
  if (/google/i.test(nome)) pontos += 15;
  if (VOZES_NOVIDADE.test(nome)) pontos -= 80;
  if (/compact/i.test(nome)) pontos -= 10;
  if (voz.default) pontos += 3;
  if (voz.localService) pontos += 1;
  return pontos;
}

export function vozDeAltaQualidade(voz) {
  return QUALIDADE_ALTA.test(voz?.name || '') || /google/i.test(voz?.name || '');
}

export class VoiceManager {
  constructor({ synth = globalThis.speechSynthesis, preferencias } = {}) {
    this.synth = synth;
    this.preferencias = preferencias; // { getVoz(idioma), setVoz(idioma, uri) }
    this.vozes = [];
    this.ouvintes = new Set();
    this._carregando = null;

    if (this.synth) {
      const atualizar = () => {
        this.vozes = this._ler();
        this.ouvintes.forEach((fn) => fn(this.vozes));
      };
      if (typeof this.synth.addEventListener === 'function') {
        this.synth.addEventListener('voiceschanged', atualizar);
      } else {
        this.synth.onvoiceschanged = atualizar;
      }
      this.vozes = this._ler();
    }
  }

  get disponivel() {
    return Boolean(this.synth);
  }

  _ler() {
    try {
      return Array.from(this.synth?.getVoices?.() || []);
    } catch {
      return [];
    }
  }

  /**
   * Aguarda as vozes ficarem disponíveis (alguns navegadores carregam de forma assíncrona).
   * @param {number} [limiteMs=2500]
   * @returns {Promise<SpeechSynthesisVoice[]>}
   */
  carregar(limiteMs = 2500) {
    if (this.vozes.length || !this.synth) return Promise.resolve(this.vozes);
    if (!this._carregando) {
      this._carregando = new Promise((resolve) => {
        const fim = () => {
          clearTimeout(timer);
          clearInterval(sondagem);
          this.ouvintes.delete(fim);
          this._carregando = null;
          this.vozes = this._ler();
          resolve(this.vozes);
        };
        const timer = setTimeout(fim, limiteMs);
        // Safari às vezes não dispara "voiceschanged": consulta periodicamente.
        const sondagem = setInterval(() => {
          if (this._ler().length) fim();
        }, 150);
        this.ouvintes.add(fim);
      });
    }
    return this._carregando;
  }

  /** Vozes que servem para o idioma, da melhor para a pior. */
  listar(idioma) {
    return this.vozes
      .map((voz) => ({ voz, pontos: pontuarVoz(voz, idioma) }))
      .filter((v) => v.pontos >= 0)
      .sort((a, b) => b.pontos - a.pontos || a.voz.name.localeCompare(b.voz.name))
      .map((v) => v.voz);
  }

  /** Voz escolhida pelo usuário para o idioma, ou a melhor disponível. */
  escolher(idioma) {
    const preferida = this.preferencias?.getVoz?.(idioma);
    if (preferida) {
      const voz = this.vozes.find((v) => v.voiceURI === preferida);
      if (voz) return voz;
    }
    return this.listar(idioma)[0] || null;
  }

  definirPreferida(idioma, voiceURI) {
    this.preferencias?.setVoz?.(idioma, voiceURI || null);
  }

  temVozPara(idioma) {
    return this.listar(idioma).length > 0;
  }

  aoMudar(fn) {
    this.ouvintes.add(fn);
    return () => this.ouvintes.delete(fn);
  }
}
