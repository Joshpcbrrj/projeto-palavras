/**
 * AppState.js
 * Gerenciamento centralizado do estado do aplicativo
 */

class AppState {
  constructor(tipo = null) {
    this.reset(tipo);
  }

  /**
   * Reseta o estado para os valores iniciais
   * @param {string|null} tipo - Tipo de estudo ('palavras', 'frases' ou null)
   */
  reset(tipo = null) {
    this.estado = {
      passo: 1,
      tipo: tipo,
      itens: [],
      itensEstudados: [],
      indiceAtual: 0,
      tempoIntervalo: null,
      estudoAtivo: false,
      tempoConfig: null,
      pdfGenerator: null,
      audioAutomatico: false,
    };
  }

  /**
   * Obtém o estado atual completo
   * @returns {Object}
   */
  get() {
    return this.estado;
  }

  /**
   * Atualiza o estado parcialmente
   * @param {Object} novoEstado - Estado parcial a ser mesclado
   */
  set(novoEstado) {
    this.estado = { ...this.estado, ...novoEstado };
  }

  /**
   * Define o tipo de estudo
   * @param {string} tipo - 'palavras' ou 'frases'
   */
  setTipo(tipo) {
    this.estado.tipo = tipo;
  }

  /**
   * Obtém o tipo de estudo
   * @returns {string|null}
   */
  getTipo() {
    return this.estado.tipo;
  }

  /**
   * Define os itens do estudo
   * @param {Array} itens - Lista de itens
   */
  setItens(itens) {
    this.estado.itens = itens;
    this.estado.itensEstudados = [...itens];
  }

  /**
   * Obtém os itens do estudo
   * @returns {Array}
   */
  getItens() {
    return this.estado.itens;
  }

  /**
   * Obtém os itens estudados (cópia)
   * @returns {Array}
   */
  getItensEstudados() {
    return [...this.estado.itensEstudados];
  }

  /**
   * Obtém o tamanho da lista de itens
   * @returns {number}
   */
  getTotalItens() {
    return this.estado.itens.length;
  }

  /**
   * Obtém o item atual com base no índice
   * @returns {string|null}
   */
  getItemAtual() {
    if (this.estado.indiceAtual < this.estado.itens.length) {
      return this.estado.itens[this.estado.indiceAtual];
    }
    return null;
  }

  /**
   * Obtém o índice atual
   * @returns {number}
   */
  getIndiceAtual() {
    return this.estado.indiceAtual;
  }

  /**
   * Avança para o próximo item
   */
  proximoItem() {
    this.estado.indiceAtual++;
  }

  /**
   * Reseta o índice para zero
   */
  resetIndice() {
    this.estado.indiceAtual = 0;
  }

  /**
   * Verifica se ainda há itens para estudar
   * @returns {boolean}
   */
  temProximoItem() {
    return this.estado.indiceAtual + 1 < this.estado.itens.length;
  }

  /**
   * Obtém o passo atual do estudo
   * @returns {number}
   */
  getPasso() {
    return this.estado.passo;
  }

  /**
   * Define o passo atual
   * @param {number} passo - Número do passo
   */
  setPasso(passo) {
    this.estado.passo = passo;
  }

  /**
   * Avança para o próximo passo
   */
  proximoPasso() {
    this.estado.passo++;
  }

  /**
   * Verifica se o estudo está ativo
   * @returns {boolean}
   */
  isEstudoAtivo() {
    return this.estado.estudoAtivo;
  }

  /**
   * Ativa/desativa o estudo
   * @param {boolean} ativo - Estado ativo/inativo
   */
  setEstudoAtivo(ativo) {
    this.estado.estudoAtivo = ativo;
  }

  /**
   * Define o tempo de configuração (segundos entre itens)
   * @param {number} tempo - Tempo em segundos
   */
  setTempoConfig(tempo) {
    this.estado.tempoConfig = tempo;
  }

  /**
   * Obtém o tempo de configuração
   * @returns {number|null}
   */
  getTempoConfig() {
    return this.estado.tempoConfig;
  }

  /**
   * Define o gerador de PDF
   * @param {Object} generator - Instância do PDFGenerator
   */
  setPDFGenerator(generator) {
    this.estado.pdfGenerator = generator;
  }

  /**
   * Obtém o gerador de PDF
   * @returns {Object|null}
   */
  getPDFGenerator() {
    return this.estado.pdfGenerator;
  }

  /**
   * Obtém a preferência de áudio automático
   * @returns {boolean}
   */
  getAudioAutomatico() {
    return this.estado.audioAutomatico;
  }

  /**
   * Define a preferência de áudio automático
   * @param {boolean} valor - true/false
   */
  setAudioAutomatico(valor) {
    this.estado.audioAutomatico = valor;
  }

  /**
   * Verifica se o estudo já foi concluído
   * @returns {boolean}
   */
  isConcluido() {
    return this.estado.passo === 5;
  }

  /**
   * Verifica se está na tela de configuração
   * @returns {boolean}
   */
  isConfiguracao() {
    return this.estado.passo === 3;
  }

  /**
   * Verifica se está na tela de estudo
   * @returns {boolean}
   */
  isEstudando() {
    return this.estado.passo === 4;
  }

  /**
   * Verifica se está na tela de finalização
   * @returns {boolean}
   */
  isFinalizado() {
    return this.estado.passo === 5;
  }
}
