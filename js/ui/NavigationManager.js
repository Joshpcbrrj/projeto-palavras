/**
 * NavigationManager.js
 * Gerencia a navegação e o botão de voltar ao início
 * Agora integra com o salvamento de progresso e ErrorHandler
 */

const NavigationManager = {
  button: null,
  aplicativoAtual: null,

  init() {
    this.button = document.getElementById('btnVoltarInicio');
    if (this.button) {
      this.button.addEventListener('click', () => this.voltarAoInicio());
    }
  },

  setAplicativo(app) {
    this.aplicativoAtual = app;
  },

  getProgressoInfo() {
    if (!this.aplicativoAtual || !this.aplicativoAtual.state) {
      return null;
    }

    const state = this.aplicativoAtual.state.get();
    const tipo = state.tipo || 'estudo';
    const total = state.itens?.length || 0;
    const atual = state.indiceAtual || 0;
    const concluido = state.passo === 5;

    if (concluido) {
      return {
        temProgresso: true,
        mensagem: `Você já completou o estudo de ${total} ${tipo}!`,
        tipo: tipo,
        total: total,
        concluido: true,
        estudados: total,
      };
    }

    if (total > 0 && atual < total) {
      const restante = total - atual;
      return {
        temProgresso: true,
        mensagem: `Você está na ${atual + 1}ª de ${total} ${tipo}. Faltam ${restante} ${tipo} para concluir.`,
        tipo: tipo,
        total: total,
        atual: atual + 1,
        restante: restante,
        concluido: false,
        estudados: atual,
      };
    }

    return null;
  },

  voltarAoInicio() {
    // Verifica se há progresso para salvar
    if (
      this.aplicativoAtual &&
      this.aplicativoAtual.state &&
      this.aplicativoAtual.state.getIndiceAtual() > 0 &&
      this.aplicativoAtual.state.isEstudoAtivo()
    ) {
      const progresso = this.getProgressoInfo();
      const estado = this.aplicativoAtual.state.get();
      const tipo = estado.tipo || 'estudo';
      const estudados = progresso?.estudados || 0;
      const total = progresso?.total || 0;

      const opcao = confirm(
        `⚠️ Você está prestes a sair do estudo atual!\n\n` +
          `📊 Você estudou ${estudados} de ${total} ${tipo}.\n` +
          `⏱️ Tempo configurado: ${estado.tempoConfig} segundos por ${tipo === 'frases' ? 'frase' : 'palavra'}\n\n` +
          `Deseja salvar o progresso antes de sair?\n\n` +
          `✅ OK - Salvar progresso e sair\n` +
          `❌ Cancelar - Sair sem salvar`
      );

      if (opcao === null) return; // Cancelou - não sai

      if (opcao) {
        // Salva progresso antes de sair
        this.aplicativoAtual.salvarSessaoAtual();
      }
    }

    // Limpa áudios e timers
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (this.aplicativoAtual && typeof this.aplicativoAtual.limparEstadoAtivo === 'function') {
      this.aplicativoAtual.limparEstadoAtivo();
    }

    // Volta ao menu principal
    if (typeof renderizarMenu === 'function') {
      renderizarMenu();
    } else {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.warning('Recarregando a página...');
      }
      setTimeout(() => location.reload(), 100);
    }
  },

  mostrar() {
    if (this.button) this.button.classList.remove('hidden');
  },

  esconder() {
    if (this.button) this.button.classList.add('hidden');
  },

  atualizarTooltip() {
    if (!this.button) return;
    const progresso = this.getProgressoInfo();
    if (progresso && !progresso.concluido) {
      this.button.title = `${progresso.tipo}: ${progresso.atual} de ${progresso.total}`;
    } else {
      this.button.title = 'Voltar ao menu principal';
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  NavigationManager.init();
});
