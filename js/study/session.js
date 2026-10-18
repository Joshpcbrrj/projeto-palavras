/**
 * Sessão de estudo com flashcards (independente da interface).
 *
 * Um único laço assíncrono e cancelável controla a sequência:
 * mostra o item → fala (se o áudio automático estiver ligado) → aguarda o intervalo → avança.
 * Pausar, avançar ou voltar cancelam o laço atual antes de iniciar outro, então
 * nunca existem dois temporizadores rodando ao mesmo tempo.
 */

import { esperar } from '../core/utils.js';

export const ESTADOS_SESSAO = Object.freeze({
  PRONTA: 'pronta',
  RODANDO: 'rodando',
  PAUSADA: 'pausada',
  CONCLUIDA: 'concluida',
  ENCERRADA: 'encerrada',
});

export class StudySession {
  /**
   * @param {object} opcoes
   * @param {string[]} opcoes.itens
   * @param {number} opcoes.intervaloMs pausa após cada item (depois da fala)
   * @param {(item: string, signal: AbortSignal) => Promise<unknown>} [opcoes.falar]
   * @param {(item: string, indice: number, total: number) => void} [opcoes.aoMostrar]
   * @param {(estado: string) => void} [opcoes.aoMudarEstado]
   * @param {() => void} [opcoes.aoConcluir]
   */
  constructor({ itens, intervaloMs, falar, aoMostrar, aoMudarEstado, aoConcluir }) {
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new Error('A sessão precisa de pelo menos um item.');
    }
    this.itens = [...itens];
    this.intervaloMs = intervaloMs;
    this.falar = falar || (async () => {});
    this.aoMostrar = aoMostrar || (() => {});
    this.aoMudarEstado = aoMudarEstado || (() => {});
    this.aoConcluir = aoConcluir || (() => {});
    this.indice = 0;
    this.estado = ESTADOS_SESSAO.PRONTA;
    this.vistos = new Set();
    this.inicio = null;
    this.segundosAtivos = 0;
    this._marcoAtivo = null;
    this._controle = null;
  }

  get total() {
    return this.itens.length;
  }

  get itemAtual() {
    return this.itens[this.indice];
  }

  /** Itens já exibidos, na ordem da sessão. */
  get itensVistos() {
    return this.itens.filter((_, i) => this.vistos.has(i));
  }

  get progresso() {
    return this.total ? this.vistos.size / this.total : 0;
  }

  iniciar(indice = 0) {
    this.inicio ??= Date.now();
    this._rodar(indice);
  }

  pausar() {
    if (this.estado !== ESTADOS_SESSAO.RODANDO) return;
    this._cancelar();
    this._definirEstado(ESTADOS_SESSAO.PAUSADA);
  }

  retomar() {
    if (this.estado === ESTADOS_SESSAO.PAUSADA || this.estado === ESTADOS_SESSAO.PRONTA) {
      this._rodar(this.indice);
    }
  }

  alternar() {
    if (this.estado === ESTADOS_SESSAO.RODANDO) this.pausar();
    else this.retomar();
  }

  proximo() {
    if (this._finalizada()) return;
    if (this.indice >= this.total - 1) {
      this.vistos.add(this.indice);
      this._concluir();
      return;
    }
    this._irPara(this.indice + 1);
  }

  anterior() {
    if (this._finalizada() || this.indice === 0) return;
    this._irPara(this.indice - 1);
  }

  /** Fala o item atual sob demanda (botão "ouvir"), sem alterar a sequência. */
  async ouvirAtual() {
    const controle = new AbortController();
    return this.falar(this.itemAtual, controle.signal);
  }

  setIntervalo(ms) {
    this.intervaloMs = ms;
  }

  encerrar() {
    if (this._finalizada()) return;
    this._cancelar();
    this._definirEstado(ESTADOS_SESSAO.ENCERRADA);
  }

  _finalizada() {
    return this.estado === ESTADOS_SESSAO.CONCLUIDA || this.estado === ESTADOS_SESSAO.ENCERRADA;
  }

  _irPara(indice) {
    if (this.estado === ESTADOS_SESSAO.RODANDO) {
      this._rodar(indice);
    } else {
      this._cancelar();
      this.indice = indice;
      this._mostrar();
      const controle = new AbortController();
      this._controle = controle;
      this.falar(this.itemAtual, controle.signal);
    }
  }

  async _rodar(indice) {
    this._cancelar();
    const controle = new AbortController();
    this._controle = controle;
    const { signal } = controle;
    this.indice = indice;
    this._definirEstado(ESTADOS_SESSAO.RODANDO);

    while (!signal.aborted) {
      this._mostrar();
      await this.falar(this.itemAtual, signal);
      if (signal.aborted) return;
      const continuar = await esperar(this.intervaloMs, signal);
      if (!continuar || signal.aborted) return;
      if (this.indice >= this.total - 1) {
        this._concluir();
        return;
      }
      this.indice++;
    }
  }

  _mostrar() {
    this.vistos.add(this.indice);
    this.aoMostrar(this.itemAtual, this.indice, this.total);
  }

  _concluir() {
    this._cancelar();
    this._definirEstado(ESTADOS_SESSAO.CONCLUIDA);
    this.aoConcluir();
  }

  _cancelar() {
    if (this._controle) {
      this._controle.abort();
      this._controle = null;
    }
  }

  _definirEstado(estado) {
    const agora = Date.now();
    if (this._marcoAtivo !== null) {
      this.segundosAtivos += (agora - this._marcoAtivo) / 1000;
      this._marcoAtivo = null;
    }
    if (estado === ESTADOS_SESSAO.RODANDO) this._marcoAtivo = agora;
    this.estado = estado;
    this.aoMudarEstado(estado);
  }
}
