/**
 * Simulação mínima da Web Speech API para testes.
 */

export class FakeUtterance {
  constructor(text) {
    this.text = text;
    this.lang = '';
    this.voice = null;
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.onend = null;
    this.onerror = null;
  }
}

export function criarSynthFalso({ duracaoMs = 50, vozes = [] } = {}) {
  const ouvintes = {};
  return {
    speaking: false,
    pending: false,
    paused: false,
    falas: [],
    vozes,
    atual: null,
    getVoices() {
      return this.vozes;
    },
    addEventListener(evento, fn) {
      (ouvintes[evento] ||= []).push(fn);
    },
    speak(utterance) {
      this.falas.push(utterance);
      this.speaking = true;
      this.atual = utterance;
      utterance._timer = setTimeout(() => {
        this.speaking = false;
        this.atual = null;
        utterance.onend?.();
      }, duracaoMs);
    },
    cancel() {
      const u = this.atual;
      if (u) {
        clearTimeout(u._timer);
        this.speaking = false;
        this.atual = null;
        u.onerror?.({ error: 'interrupted' });
      }
    },
    resume() {
      this.paused = false;
    },
    definirVozes(novas) {
      this.vozes = novas;
      (ouvintes.voiceschanged || []).forEach((fn) => fn());
    },
  };
}

export const voz = (name, lang, extra = {}) => ({
  name,
  lang,
  voiceURI: `${name}|${lang}`,
  default: false,
  localService: true,
  ...extra,
});
