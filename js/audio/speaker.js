/**
 * Camada de fala sobre a Web Speech API.
 *
 * Contorna problemas conhecidos dos navegadores:
 * - o Chrome descarta a utterance pelo coletor de lixo e nunca dispara `onend`
 *   (mantemos uma referência até a fala terminar);
 * - `cancel()` seguido imediatamente de `speak()` às vezes perde a nova fala
 *   (aguardamos um instante após cancelar);
 * - eventos `onend` que nunca chegam (há um tempo-limite de segurança);
 * - o iOS só libera a síntese depois de uma fala iniciada por gesto do usuário
 *   (`desbloquear()`).
 */

import { esperar } from '../core/utils.js';

/** Estima a duração (ms) de uma fala, usada como tempo-limite de segurança. */
export function estimarDuracaoMs(texto, velocidade = 1) {
  const caracteres = String(texto || '').length;
  const porSegundo = 14 * (velocidade || 1);
  return Math.round((caracteres / porSegundo) * 1000 * 2 + 4000);
}

export class Speaker {
  constructor({
    synth = globalThis.speechSynthesis,
    Utterance = globalThis.SpeechSynthesisUtterance,
    vozes = null,
  } = {}) {
    this.synth = synth;
    this.Utterance = Utterance;
    this.vozes = vozes;
    this.ativas = new Set();
    this._desbloqueado = false;
  }

  get disponivel() {
    return Boolean(this.synth && this.Utterance);
  }

  get falando() {
    return Boolean(this.synth?.speaking);
  }

  /** Deve ser chamado dentro de um gesto do usuário (clique/toque). */
  desbloquear() {
    if (this._desbloqueado || !this.disponivel) return;
    this._desbloqueado = true;
    try {
      const vazio = new this.Utterance(' ');
      vazio.volume = 0;
      this.synth.speak(vazio);
    } catch {
      /* ignora */
    }
  }

  cancelar() {
    if (!this.synth) return;
    try {
      this.synth.cancel();
    } catch {
      /* ignora */
    }
  }

  /**
   * Fala um texto e resolve quando terminar.
   * @param {string} texto
   * @param {object} [opcoes]
   * @param {string} [opcoes.idioma]
   * @param {number} [opcoes.velocidade=1]
   * @param {number} [opcoes.tom=1]
   * @param {number} [opcoes.volume=1]
   * @param {SpeechSynthesisVoice} [opcoes.voz] força uma voz específica
   * @param {AbortSignal} [opcoes.signal] cancela a fala
   * @returns {Promise<boolean>} true se a fala terminou normalmente
   */
  async falar(texto, { idioma, velocidade = 1, tom = 1, volume = 1, voz, signal } = {}) {
    const conteudo = String(texto ?? '').trim();
    if (!conteudo || !this.disponivel || signal?.aborted) return false;

    if (this.vozes) await this.vozes.carregar();
    if (signal?.aborted) return false;

    if (this.synth.speaking || this.synth.pending) {
      this.cancelar();
      await esperar(60);
      if (signal?.aborted) return false;
    }

    const utterance = new this.Utterance(conteudo);
    if (idioma) utterance.lang = idioma;
    utterance.rate = velocidade;
    utterance.pitch = tom;
    utterance.volume = volume;
    const vozEscolhida = voz || (idioma && this.vozes ? this.vozes.escolher(idioma) : null);
    if (vozEscolhida) utterance.voice = vozEscolhida;

    return new Promise((resolve) => {
      let concluido = false;
      const finalizar = (ok) => {
        if (concluido) return;
        concluido = true;
        clearTimeout(limite);
        signal?.removeEventListener('abort', aoAbortar);
        this.ativas.delete(utterance);
        resolve(ok);
      };
      const aoAbortar = () => {
        this.cancelar();
        finalizar(false);
      };

      utterance.onend = () => finalizar(true);
      utterance.onerror = () => finalizar(false);
      signal?.addEventListener('abort', aoAbortar, { once: true });
      const limite = setTimeout(() => finalizar(true), estimarDuracaoMs(conteudo, velocidade));

      this.ativas.add(utterance);
      try {
        if (this.synth.paused) this.synth.resume();
        this.synth.speak(utterance);
      } catch {
        finalizar(false);
      }
    });
  }
}
