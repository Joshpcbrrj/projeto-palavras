/**
 * AppTimer.js
 * Gerenciamento do timer do estudo
 */

class AppTimer {
  constructor(onTick, onComplete) {
    this.tempoIntervalo = null;
    this.estudoAtivo = false;
    this.tempoConfig = null;
    this.onTick = onTick; // Callback para cada tick
    this.onComplete = onComplete; // Callback quando terminar
    this.isPausado = false;
    this.tempoRestante = null;
  }

  /**
   * Inicia o timer
   * @param {number} tempoConfig - Tempo em segundos entre cada tick
   * @param {boolean} estudoAtivo - Estado inicial do estudo
   */
  iniciar(tempoConfig, estudoAtivo) {
    this.parar();
    this.tempoConfig = tempoConfig;
    this.estudoAtivo = estudoAtivo;
    this.isPausado = false;

    // Função recursiva para processar próximo item
    const processarProximo = async () => {
      if (this.estudoAtivo && !this.isPausado && this.onTick) {
        await this.onTick();
        if (this.estudoAtivo && !this.isPausado) {
          this.tempoIntervalo = setTimeout(processarProximo, this.tempoConfig * 1000);
        }
      }
    };

    processarProximo();
  }

  /**
   * Para o timer completamente
   */
  parar() {
    if (this.tempoIntervalo) {
      clearTimeout(this.tempoIntervalo);
      this.tempoIntervalo = null;
    }
  }

  /**
   * Pausa o timer (preserva o estado)
   */
  pausar() {
    if (this.estudoAtivo && !this.isPausado) {
      this.isPausado = true;
      this.parar();
    }
  }

  /**
   * Retoma o timer do ponto onde parou
   */
  retomar() {
    if (this.estudoAtivo && this.isPausado && this.onTick) {
      this.isPausado = false;

      const processarProximo = async () => {
        if (this.estudoAtivo && !this.isPausado && this.onTick) {
          await this.onTick();
          if (this.estudoAtivo && !this.isPausado) {
            this.tempoIntervalo = setTimeout(processarProximo, this.tempoConfig * 1000);
          }
        }
      };
      processarProximo();
    }
  }

  /**
   * Limpa o timer e reseta o estado
   */
  limpar() {
    this.parar();
    this.tempoIntervalo = null;
    this.estudoAtivo = false;
    this.isPausado = false;
    this.tempoRestante = null;
  }

  /**
   * Define o estado ativo do estudo
   * @param {boolean} ativo - Estado ativo/inativo
   */
  setEstudoAtivo(ativo) {
    this.estudoAtivo = ativo;
    if (!ativo) {
      this.parar();
    }
  }

  /**
   * Verifica se o timer está ativo
   * @returns {boolean}
   */
  isAtivo() {
    return this.tempoIntervalo !== null && this.estudoAtivo && !this.isPausado;
  }

  /**
   * Verifica se o timer está pausado
   * @returns {boolean}
   */
  isPausado() {
    return this.isPausado;
  }

  /**
   * Obtém o tempo configurado
   * @returns {number|null}
   */
  getTempoConfig() {
    return this.tempoConfig;
  }

  /**
   * Define um novo callback para cada tick
   * @param {Function} onTick - Função chamada a cada tick
   */
  setOnTick(onTick) {
    this.onTick = onTick;
  }

  /**
   * Define um novo callback para conclusão
   * @param {Function} onComplete - Função chamada ao completar
   */
  setOnComplete(onComplete) {
    this.onComplete = onComplete;
  }

  /**
   * Completa o timer manualmente
   */
  completar() {
    if (this.onComplete) {
      this.onComplete();
    }
    this.limpar();
  }
}
