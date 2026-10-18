/**
 * Leitor de textos longos, frase a frase.
 *
 * Em vez de entregar o texto inteiro à síntese de voz (o que o Chrome corta após
 * ~15 s e cujo pause/resume é instável no Android), o texto é dividido em trechos
 * curtos. Isso permite pausar e retomar de forma confiável, voltar/avançar frase,
 * repetir a frase atual e destacar na tela o trecho que está sendo lido.
 */

import { dividirParaLeitura } from '../text/extract.js';
import { esperar } from '../core/utils.js';

export const ESTADOS_LEITOR = Object.freeze({
  PARADO: 'parado',
  TOCANDO: 'tocando',
  PAUSADO: 'pausado',
  CONCLUIDO: 'concluido',
  ERRO: 'erro',
});

export class TextReader {
  /**
   * @param {import('./speaker.js').Speaker} speaker
   * @param {object} [opcoes]
   * @param {(info: object) => void} [opcoes.aoMudar] chamado a cada mudança de trecho/estado
   */
  constructor(speaker, { aoMudar } = {}) {
    this.speaker = speaker;
    this.aoMudar = aoMudar || (() => {});
    this.trechos = [];
    this.indice = 0;
    this.idioma = undefined;
    this.velocidade = 1;
    this.repetirTrecho = false;
    this.pausaEntreTrechosMs = 0;
    this.estado = ESTADOS_LEITOR.PARADO;
    this.segundosOuvidos = 0;
    /**
     * Permite ajustar o que é falado em cada trecho (ex.: em diálogos, tirar o nome
     * do falante e usar uma voz diferente para cada pessoa).
     * @type {(trecho: {texto: string}) => {texto: string, voz?: SpeechSynthesisVoice}}
     */
    this.preparar = (trecho) => ({ texto: trecho.texto });
    this._controle = null;
  }

  carregar(texto, { idioma } = {}) {
    this.parar();
    this.idioma = idioma;
    this.trechos = dividirParaLeitura(texto, { idioma });
    this.indice = 0;
    this._notificar();
    return this.trechos;
  }

  get total() {
    return this.trechos.length;
  }

  get tocando() {
    return this.estado === ESTADOS_LEITOR.TOCANDO;
  }

  setVelocidade(velocidade) {
    this.velocidade = velocidade;
    // Aplica imediatamente reiniciando o trecho atual.
    if (this.tocando) this.tocar(this.indice);
  }

  setIdioma(idioma) {
    this.idioma = idioma;
    if (this.tocando) this.tocar(this.indice);
  }

  async tocar(indice = this.indice) {
    if (!this.trechos.length) return;
    this._cancelarExecucao();
    const controle = new AbortController();
    this._controle = controle;
    this.indice = Math.min(Math.max(0, indice), this.trechos.length - 1);
    this._definirEstado(ESTADOS_LEITOR.TOCANDO);

    let falhasSeguidas = 0;
    while (!controle.signal.aborted && this.indice < this.trechos.length) {
      this._notificar();
      const inicio = Date.now();
      const { texto, voz } = this.preparar(this.trechos[this.indice]);
      const ok = await this.speaker.falar(texto, {
        idioma: this.idioma,
        velocidade: this.velocidade,
        voz,
        signal: controle.signal,
      });
      if (controle.signal.aborted) return;
      this.segundosOuvidos += (Date.now() - inicio) / 1000;

      falhasSeguidas = ok ? 0 : falhasSeguidas + 1;
      if (falhasSeguidas >= 3) {
        this._definirEstado(ESTADOS_LEITOR.ERRO);
        return;
      }

      if (this.pausaEntreTrechosMs) {
        const continuar = await esperar(this.pausaEntreTrechosMs, controle.signal);
        if (!continuar) return;
      }
      if (!this.repetirTrecho) this.indice++;
    }

    if (!controle.signal.aborted) {
      this.indice = this.trechos.length - 1;
      this._controle = null;
      this._definirEstado(ESTADOS_LEITOR.CONCLUIDO);
    }
  }

  pausar() {
    if (!this.tocando) return;
    this._cancelarExecucao();
    this._definirEstado(ESTADOS_LEITOR.PAUSADO);
  }

  retomar() {
    if (this.estado === ESTADOS_LEITOR.CONCLUIDO) return this.tocar(0);
    return this.tocar(this.indice);
  }

  alternar() {
    if (this.tocando) this.pausar();
    else this.retomar();
  }

  parar() {
    this._cancelarExecucao();
    this.indice = 0;
    this._definirEstado(ESTADOS_LEITOR.PARADO);
  }

  irPara(indice) {
    if (!this.trechos.length) return;
    const destino = Math.min(Math.max(0, indice), this.trechos.length - 1);
    if (this.tocando) {
      this.tocar(destino);
    } else {
      this.indice = destino;
      if (this.estado === ESTADOS_LEITOR.CONCLUIDO) this.estado = ESTADOS_LEITOR.PAUSADO;
      this._notificar();
    }
  }

  proximo() {
    this.irPara(this.indice + 1);
  }

  anterior() {
    this.irPara(this.indice - 1);
  }

  reiniciar() {
    if (this.tocando) this.tocar(0);
    else this.irPara(0);
  }

  destruir() {
    this._cancelarExecucao();
    this.aoMudar = () => {};
  }

  _cancelarExecucao() {
    if (this._controle) {
      this._controle.abort();
      this._controle = null;
    }
  }

  _definirEstado(estado) {
    this.estado = estado;
    this._notificar();
  }

  _notificar() {
    this.aoMudar({
      estado: this.estado,
      indice: this.indice,
      total: this.trechos.length,
      trecho: this.trechos[this.indice] || null,
    });
  }
}
