/**
 * "Ouvir enquanto gera": toca cada trecho do MP3 assim que ele fica pronto,
 * em sequência e com as mesmas pausas do arquivo final.
 */

export class OuvirEnquantoGera {
  /** Precisa ser criado num clique do usuário (regra de áudio dos navegadores). */
  constructor({ ContextoAudio = globalThis.AudioContext || globalThis.webkitAudioContext } = {}) {
    this.ctx = ContextoAudio ? new ContextoAudio() : null;
    this.proximoInicio = 0;
    this.fontes = new Set();
  }

  get disponivel() {
    return Boolean(this.ctx);
  }

  /** Agenda um trecho para tocar depois do anterior. */
  adicionar(pcm, taxa, pausaMs = 0) {
    if (!this.ctx || !pcm?.length) return;
    const buffer = this.ctx.createBuffer(1, pcm.length, taxa);
    buffer.copyToChannel(pcm instanceof Float32Array ? pcm : Float32Array.from(pcm), 0);
    const fonte = this.ctx.createBufferSource();
    fonte.buffer = buffer;
    fonte.connect(this.ctx.destination);
    // Se a geração atrasar, o trecho toca assim que chega.
    const inicio = Math.max(this.ctx.currentTime + 0.05, this.proximoInicio);
    fonte.start(inicio);
    this.proximoInicio = inicio + buffer.duration + pausaMs / 1000;
    this.fontes.add(fonte);
    fonte.onended = () => this.fontes.delete(fonte);
  }

  parar() {
    this.fontes.forEach((fonte) => {
      try {
        fonte.stop();
      } catch {
        // já tinha terminado
      }
    });
    this.fontes.clear();
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close().catch(() => {});
    this.ctx = null;
  }
}
