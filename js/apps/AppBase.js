/**
 * AppBase.js
 * Classe Base do Aplicativo (Refatorada)
 * Agora usando ErrorHandler e LoadingManager
 */

class AppBase {
  constructor() {
    // Inicializa os módulos core
    this.state = new AppState();
    this.audio = new AppAudio();
    this.navigation = new AppNavigation();

    // Estado inicial
    this.state.setAudioAutomatico(this.audio.carregarPreferencia());

    if (typeof NavigationManager !== 'undefined') {
      NavigationManager.setAplicativo(this);
    }
  }

  // Métodos abstratos (devem ser sobrescritos)
  getTipo() {
    throw new Error('Método getTipo() deve ser implementado');
  }
  getMaxItens() {
    throw new Error('Método getMaxItens() deve ser implementado');
  }
  getTempoPadrao() {
    throw new Error('Método getTempoPadrao() deve ser implementado');
  }
  getBotaoTexto() {
    throw new Error('Método getBotaoTexto() deve ser implementado');
  }
  extrairItens(texto) {
    throw new Error('Método extrairItens() deve ser implementado');
  }
  selecionarAleatorias(lista) {
    throw new Error('Método selecionarAleatorias() deve ser implementado');
  }
  criarPDFGenerator() {
    throw new Error('Método criarPDFGenerator() deve ser implementado');
  }
  renderizar() {
    throw new Error('Método renderizar() deve ser implementado');
  }
  renderizarEstudo() {
    throw new Error('Método renderizarEstudo() deve ser implementado');
  }
  renderizarFinalizacao() {
    throw new Error('Método renderizarFinalizacao() deve ser implementado');
  }

  /**
   * Limpa todos os timers e áudios ativos
   */
  limparEstadoAtivo() {
    this.navigation.limparEstadoAtivo();
    this.state.setEstudoAtivo(false);
  }

  /**
   * Salva a sessão atual no progresso
   */
  async salvarSessaoAtual() {
    if (this.state.getTotalItens() === 0 || this.state.getIndiceAtual() === 0) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.warning('Nenhum item estudado ainda para salvar!');
      } else {
        alert('Nenhum item estudado ainda para salvar!');
      }
      return false;
    }

    const itensEstudados = this.state.getItens().slice(0, this.state.getIndiceAtual());
    const tempoSessao = this.state.getIndiceAtual() * this.state.get().tempoConfig;

    if (typeof ProgressService !== 'undefined') {
      const progressService = new ProgressService();

      // Verifica duplicação
      const historico = progressService.dados.historicoSessoes;
      const ultimaSessao = historico[historico.length - 1];

      if (ultimaSessao && ultimaSessao.tipo === this.getTipo()) {
        const agora = new Date();
        const ultimaSessaoData = new Date(ultimaSessao.data);
        const diffMinutos = (agora - ultimaSessaoData) / 1000 / 60;

        if (diffMinutos < 10) {
          const itensUltimaSessao = ultimaSessao.itens || [];
          const itensAtuais = itensEstudados.map((i) => i.toLowerCase());
          const itensComuns = itensAtuais.filter((item) => itensUltimaSessao.includes(item));
          const percentualComum =
            (itensComuns.length / Math.max(itensAtuais.length, itensUltimaSessao.length)) * 100;

          if (percentualComum > 80) {
            const confirmar = confirm(
              `⚠️ Esta sessão parece ser uma repetição da anterior (${Math.round(percentualComum)}% dos itens iguais).\n\nDeseja salvar mesmo assim?`
            );
            if (!confirmar) {
              return false;
            }
          }
        }
      }

      progressService.registrarSessao({
        tipo: this.getTipo(),
        quantidade: itensEstudados.length,
        tempo: tempoSessao,
        itens: itensEstudados,
      });

      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.success(`${itensEstudados.length} ${this.getTipo()} registradas!`);
      } else {
        alert(`✅ Progresso salvo! ${itensEstudados.length} ${this.getTipo()} registradas.`);
      }
      return true;
    }
    return false;
  }

  /**
   * Processa o texto e avança para configuração
   */
  processarTexto(texto) {
    if (!texto) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.warning('Por favor, digite ou cole algum texto!');
      } else {
        alert('Por favor, digite ou cole algum texto!');
      }
      return false;
    }

    const todosItens = this.extrairItens(texto);

    if (todosItens.length === 0) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.warning(this.getMensagemErroVazio());
      } else {
        alert(this.getMensagemErroVazio());
      }
      return false;
    }

    this.state.setItens(this.selecionarAleatorias(todosItens));
    this.state.setPasso(3);
    return true;
  }

  /**
   * Inicia o estudo (com ordem aleatória)
   */
  iniciarEstudo(tempoConfig) {
    this.state.setTempoConfig(tempoConfig);
    this.state.resetIndice();

    const itensEmbaralhados = ShufflerService.shuffledCopy(this.state.getItens());
    this.state.setItens(itensEmbaralhados);

    this.state.setPasso(4);
    this.renderizarEstudo();
  }

  /**
   * Mostra o item atual e toca áudio se ativado
   */
  async mostrarItem(indice) {
    const itemDiv = document.getElementById('itemAtual');
    const progressoDiv = document.getElementById('progresso');

    if (itemDiv && progressoDiv) {
      if (indice >= this.state.getTotalItens()) {
        this.finalizarEstudo();
        return;
      }

      const item = this.state.getItens()[indice];

      if (!ValidatorService.isItemValido(item)) {
        if (window.DEBUG_MODE) console.warn(`⚠️ Pulando item inválido: "${item}"`);
        this.state.proximoItem();
        this.mostrarItem(this.state.getIndiceAtual());
        return;
      }

      itemDiv.textContent = item.toUpperCase();
      progressoDiv.textContent = `${this.getItemLabel()} ${indice + 1} de ${this.state.getTotalItens()}`;

      if (this.audio.isAudioAutomatico()) {
        await this.audio.falarItemComPromise(item);
      }
    }
  }

  /**
   * Fala o item atual manualmente (botão "Ouvir Pronúncia")
   */
  falarItemManual() {
    const itemAtual = this.state.getItemAtual();
    this.audio.falarItemManual(itemAtual);
  }

  /**
   * Inicia o timer
   */
  async iniciarTimer() {
    const itensValidos = ValidatorService.filtrarValidos(this.state.getItens());

    if (itensValidos.length !== this.state.getTotalItens()) {
      this.state.setItens(itensValidos);
    }

    if (this.state.getTotalItens() === 0) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.warning('Nenhum item válido encontrado para estudar!');
      } else {
        alert('❌ Nenhum item válido encontrado para estudar!');
      }
      this.voltarParaMenu();
      return;
    }

    this.state.setEstudoAtivo(true);

    const processarProximo = async () => {
      if (this.state.isEstudoAtivo()) {
        this.state.proximoItem();
        if (this.state.getIndiceAtual() < this.state.getTotalItens()) {
          await this.mostrarItem(this.state.getIndiceAtual());
          setTimeout(processarProximo, this.state.get().tempoConfig * 1000);
        } else {
          this.finalizarEstudo();
        }
      }
    };

    await this.mostrarItem(this.state.getIndiceAtual());
    setTimeout(processarProximo, this.state.get().tempoConfig * 1000);
  }

  /**
   * Pausa o estudo com opção de salvar
   */
  pausarEstudo() {
    if (this.state.isEstudoAtivo()) {
      const opcao = confirm(
        'Deseja salvar o progresso atual antes de pausar?\n\n' +
          '✅ OK - Salvar e pausar\n' +
          '❌ Cancelar - Pausar sem salvar'
      );

      if (opcao) {
        this.salvarSessaoAtual();
      }

      this.state.setEstudoAtivo(false);
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.info('Estudo pausado! Clique em "Retomar" para continuar.');
      } else {
        alert('Estudo pausado! Clique em "Retomar" para continuar.');
      }
      this.adicionarBotaoRetomar();
    }
  }

  /**
   * Retoma o estudo
   */
  retomarEstudo() {
    if (!this.state.isEstudoAtivo() && this.state.getIndiceAtual() < this.state.getTotalItens()) {
      this.state.setEstudoAtivo(true);
      this.iniciarTimer();
      this.removerBotaoRetomar();
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.info('Estudo retomado!');
      } else {
        alert('Estudo retomado!');
      }
    }
  }

  /**
   * Para o estudo com opção de salvar
   */
  pararEstudo() {
    const opcao = confirm(
      'Deseja salvar o progresso antes de parar?\n\n' +
        '✅ OK - Salvar e sair\n' +
        '❌ Cancelar - Sair sem salvar'
    );

    if (opcao === null) return;

    if (opcao) {
      this.salvarSessaoAtual();
    }

    this.limparEstadoAtivo();
    this.state.reset(this.getTipo());
    this.renderizar();
  }

  /**
   * Finaliza o estudo com sucesso
   */
  finalizarEstudo() {
    this.limparEstadoAtivo();
    this.state.setPasso(5);
    this.renderizarFinalizacao();
  }

  /**
   * Exporta para PDF
   */
  async exportarPDF() {
    const btn = document.getElementById('btnExportarPDF');

    if (typeof LoadingManager !== 'undefined' && btn) {
      await LoadingManager.execute(
        btn,
        async () => {
          await this.executarExportarPDF();
        },
        '⏳ Gerando PDF...'
      );
    } else {
      await this.executarExportarPDF();
    }
  }

  async executarExportarPDF() {
    try {
      let pdfGen = this.state.get().pdfGenerator;
      if (!pdfGen) {
        pdfGen = this.criarPDFGenerator();
        this.state.setPDFGenerator(pdfGen);
      }

      const config = { tempo: this.state.get().tempoConfig };
      const tipo = this.getTipo();
      const resultado = await pdfGen.gerarESalvar(this.state.get().itensEstudados, config, tipo);

      if (resultado.sucesso) {
        if (typeof ErrorHandler !== 'undefined') {
          ErrorHandler.success(`PDF gerado com sucesso!\n📁 Arquivo: ${resultado.nomeArquivo}`);
        } else {
          alert(`✅ PDF gerado com sucesso!\n📁 Arquivo: ${resultado.nomeArquivo}`);
        }
      } else {
        throw new Error(resultado.erro);
      }
    } catch (error) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.show('Erro ao gerar PDF. Tente novamente.', 'error');
      } else {
        alert('❌ Erro ao gerar PDF. Tente novamente.');
      }
    }
  }

  /**
   * Ver itens estudados
   */
  verItens() {
    const revisaoArea = document.getElementById('revisaoArea');
    const listaRevisao = document.getElementById('listaRevisao');
    const btn = document.getElementById('btnVerItens');
    const tipoTexto = this.getTipo();

    if (revisaoArea && listaRevisao) {
      if (revisaoArea.classList.contains('hidden')) {
        listaRevisao.innerHTML = this.state
          .get()
          .itensEstudados.map(
            (p, i) =>
              `<div class="text-gray-600 py-3 hover:bg-gray-100 px-2 rounded cursor-pointer border-b border-gray-200" onclick="alert('${this.getItemLabel()}: ${p.toUpperCase()}')">
                        <span class="font-bold text-green-600 text-lg">${i + 1}.</span> 
                        <span class="text-md">${p}</span>
                    </div>`
          )
          .join('');
        revisaoArea.classList.remove('hidden');
        revisaoArea.scrollIntoView({ behavior: 'smooth' });
        btn.textContent = `📖 Ocultar ${tipoTexto === 'frases' ? 'Frases' : 'Palavras'}`;
      } else {
        revisaoArea.classList.add('hidden');
        btn.textContent = `📖 Ver ${tipoTexto === 'frases' ? 'Frases' : 'Palavras'}`;
      }
    }
  }

  /**
   * Revisa a série (recomeça do início com ordem aleatória)
   */
  revisarSerie() {
    if (
      confirm(
        'Deseja revisar a série novamente?\n\nAs palavras/frases serão exibidas em ordem aleatória para melhor aprendizado.'
      )
    ) {
      this.state.resetIndice();
      const itensEmbaralhados = ShufflerService.shuffledCopy(this.state.get().itensEstudados);
      this.state.setItens(itensEmbaralhados);
      this.state.setPasso(3);
      this.renderizarConfiguracaoRevisao();
    }
  }

  /**
   * Renderiza tela de configuração para revisão
   */
  renderizarConfiguracaoRevisao() {
    const appDiv = document.getElementById('app');
    const audioAutomaticoChecked = this.audio.isAudioAutomatico() ? 'checked' : '';

    appDiv.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">🔄 Revisão da Série</h2>
                <p class="text-gray-600 mb-4">Você está prestes a revisar as mesmas ${this.getTipo()} novamente.</p>
                
                <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" id="audioAutomaticoRevisao" class="w-5 h-5 mr-3" ${audioAutomaticoChecked}>
                        <span class="text-gray-700 font-bold">🔊 Falar automaticamente cada ${this.getItemLabel().toLowerCase()}</span>
                    </label>
                    <p class="text-sm text-gray-500 mt-2 ml-8">🎤 Se ativado, cada ${this.getItemLabel().toLowerCase()} será pronunciada automaticamente durante a revisão.</p>
                </div>
                
                <div class="bg-yellow-50 p-4 rounded-lg mb-6">
                    <p class="text-yellow-800">📊 Informações da série:</p>
                    <p class="text-yellow-800">✅ Total de ${this.getTipo()}: <strong>${this.state.getTotalItens()}</strong></p>
                    <p class="text-yellow-800">⏱️ Tempo configurado: <strong>${this.state.get().tempoConfig} segundos</strong></p>
                </div>
                
                <div class="flex gap-4 justify-center">
                    <button id="btnIniciarRevisao" class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition">▶️ Iniciar Revisão</button>
                    <button id="btnCancelarRevisao" class="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition">❌ Cancelar</button>
                </div>
            </div>
        `;

    const chkAudioAutomatico = document.getElementById('audioAutomaticoRevisao');
    if (chkAudioAutomatico) {
      chkAudioAutomatico.addEventListener('change', (e) => {
        this.audio.salvarPreferencia(e.target.checked);
      });
    }

    document.getElementById('btnIniciarRevisao')?.addEventListener('click', () => {
      this.state.setEstudoAtivo(true);
      this.state.setPasso(4);
      this.renderizarEstudo();
      this.mostrarItem(0);
      this.iniciarTimer();
    });

    document.getElementById('btnCancelarRevisao')?.addEventListener('click', () => {
      this.renderizarFinalizacao();
    });
  }

  /**
   * Volta para o menu principal com opção de salvar
   */
  async voltarParaMenuComSalvamento() {
    if (this.state.getIndiceAtual() > 0 && this.state.isEstudoAtivo()) {
      const opcao = confirm(
        'Deseja salvar o progresso desta sessão antes de sair?\n\n' +
          `📊 Você estudou ${this.state.getIndiceAtual()} de ${this.state.getTotalItens()} ${this.getTipo()}.\n\n` +
          '✅ OK - Salvar progresso e sair\n' +
          '❌ Cancelar - Sair sem salvar'
      );

      if (opcao) {
        await this.salvarSessaoAtual();
      }
    }

    this.limparEstadoAtivo();
    if (typeof renderizarMenu === 'function') {
      renderizarMenu();
    }
  }

  /**
   * Volta para o menu principal
   */
  voltarParaMenu() {
    this.voltarParaMenuComSalvamento();
  }

  /**
   * Novo estudo - volta para o menu principal
   */
  novoEstudo() {
    this.limparEstadoAtivo();
    this.voltarParaMenu();
  }

  // Métodos auxiliares
  getItemLabel() {
    return this.getTipo() === 'frases' ? 'Frase' : 'Palavra';
  }

  getMensagemErroVazio() {
    return this.getTipo() === 'frases'
      ? 'Nenhuma frase encontrada no texto! Use ponto final (.), exclamação (!) ou interrogação (?) para separar as frases.'
      : 'Nenhuma palavra encontrada no texto!';
  }

  adicionarBotaoRetomar() {
    const botoesDiv = document.querySelector('.flex.gap-4.justify-center');
    if (botoesDiv && !document.getElementById('btnRetomar')) {
      const btnRetomar = document.createElement('button');
      btnRetomar.id = 'btnRetomar';
      btnRetomar.className =
        'bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition';
      btnRetomar.textContent = '▶️ Retomar';
      btnRetomar.onclick = () => this.retomarEstudo();
      botoesDiv.appendChild(btnRetomar);
    }
  }

  removerBotaoRetomar() {
    const btnRetomar = document.getElementById('btnRetomar');
    if (btnRetomar) btnRetomar.remove();
  }
}
