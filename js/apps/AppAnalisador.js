/**
 * AppAnalisador.js
 * Aplicativo para análise de estudo
 * Conta palavras/frases diferentes em arquivos upados
 * Suporta arquivos .txt e .pdf
 * Versão 2.0 - Inclui leitura de metadados
 */

class _AppAnalisador {
  constructor(tipoForcado = null) {
    this.analisador = new AnalisadorEstatisticas();
    this.analisadorExtracao = new AnalisadorExtracao();
    this.tipoSelecionado = tipoForcado;

    this.passo = 1;

    if (this.tipoSelecionado) {
      this.analisador.setTipoEstudo(this.tipoSelecionado);
      this.analisadorExtracao.setTipoEstudo(this.tipoSelecionado);
    }


    this.uiElements = null;
    this.arquivosSelecionados = [];
  }

  renderizar() {
    if (window.DEBUG_MODE) {
      console.log('Renderizando AppAnalisador. Passo:', this.passo);
    }

    if (this.passo === 1) {
      this.renderizarUpload();
    } else if (this.passo === 2) {
      this.renderizarResultado();
    }
  }

  renderizarUpload() {
const _tipoTexto = this.tipoSelecionado === 'frases' ? 'Frases' : 'Palavras';

    this.uiElements = AnalisadorUI.renderizarUpload(
      this.analisador,
      this.tipoSelecionado,
      () => this.processarArquivos(),
      () => this.voltarMenu()
    );

    this.configurarEventosUpload();
  }

  configurarEventosUpload() {
    const btnUpload = this.uiElements.btnUpload;
    const fileInput = this.uiElements.fileInput;
    const previewArea = this.uiElements.previewArea;
    const listaArquivos = this.uiElements.listaArquivos;
    const btnProcessar = this.uiElements.btnProcessar;
    const btnCancelar = this.uiElements.btnCancelar;
    const btnImportar = this.uiElements.btnImportar;
    const btnExportar = this.uiElements.btnExportar;
    const btnVoltar = this.uiElements.btnVoltar;

    if (btnUpload) {
      btnUpload.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.arquivosSelecionados = Array.from(e.target.files);

        if (this.arquivosSelecionados.length > 0 && previewArea && listaArquivos) {
          listaArquivos.innerHTML = this.arquivosSelecionados
            .map((f) => {
              const extensao = f.name.split('.').pop().toLowerCase();
              const icone = extensao === 'pdf' ? '📄' : '📃';
              let metadadoInfo = '';
              if (extensao === 'pdf') {
                metadadoInfo = ' <span class="text-xs text-green-500">(com metadados)</span>';
              }
              return `<div class="py-1">${icone} ${f.name} (${(f.size / 1024).toFixed(2)} KB)${metadadoInfo}</div>`;
            })
            .join('');
          previewArea.classList.remove('hidden');
        } else if (previewArea) {
          previewArea.classList.add('hidden');
        }
      });
    }

    if (btnProcessar) {
      btnProcessar.addEventListener('click', async () => {
        await this.processarArquivos();
      });
    }

    if (btnCancelar) {
      btnCancelar.addEventListener('click', () => {
        this.passo = 1;
        this.renderizar();
      });
    }

    if (btnImportar) {
      btnImportar.addEventListener('click', () => {
        this.importarDados();
      });
    }

    if (btnExportar) {
      btnExportar.addEventListener('click', () => {
        this.exportarJSON();
      });
    }

    if (btnVoltar) {
      btnVoltar.addEventListener('click', () => this.voltarMenu());
    }
  }

  async processarArquivos() {
    if (this.arquivosSelecionados.length === 0) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.warning('Selecione pelo menos um arquivo!');
      } else {
        alert('Selecione pelo menos um arquivo!');
      }
      return;
    }

    const btnProcessar = this.uiElements.btnProcessar;

    if (typeof LoadingManager !== 'undefined' && btnProcessar) {
      await LoadingManager.execute(
        btnProcessar,
        async () => {
          await this.executarProcessamento();
        },
        '⏳ Processando arquivos...'
      );
    } else {
      await this.executarProcessamento();
    }
  }

  async executarProcessamento() {
    let metadadosEncontrados = 0;
    let metadadosProcessados = 0;

    try {
      for (const arquivo of this.arquivosSelecionados) {
        const resultado = await this.analisadorExtracao.processarArquivo(arquivo);

        if (window.DEBUG_MODE) {
          console.log(`Processado: ${arquivo.name} - ${resultado.itensNoArquivo} itens`);
        }


        // Verifica se o arquivo tinha metadados
        if (resultado.metadados) {
          metadadosEncontrados++;


          // Processa os metadados no ProgressService
          if (typeof ProgressService !== 'undefined') {
            const progressService = new ProgressService();
            const resultadoMetadados = progressService.processarMetadadosImportados(
              resultado.metadados
            );

            if (resultadoMetadados.processado) {
              metadadosProcessados++;
              if (window.DEBUG_MODE) {
                console.log(`📊 Metadados processados: ${resultadoMetadados.mensagem}`);
              }
            }
          }
        }
      }

      // Mostra feedback sobre metadados
      if (metadadosEncontrados > 0) {
        const mensagem = `${metadadosEncontrados} arquivo(s) com metadados processados. ${metadadosProcessados} contribuíram para seu progresso.`;
        if (typeof ErrorHandler !== 'undefined') {
          ErrorHandler.success(mensagem);
        } else {
          alert(`✅ ${mensagem}`);
        }
      }

      this.passo = 2;
      this.renderizar();
    } catch (erro) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.show(`Erro ao processar: ${erro.message}`, 'error');
      } else {
        alert(`Erro ao processar: ${erro.message}`);
      }
    }
  }

  renderizarResultado() {
    const handlers = {
      onExibirItens: () => this.toggleExibirItens(),
      onRevisarEstudo: () => this.revisarEstudo(),
      onExportarPDF: () => this.exportarPDF(),
      onExportarJSON: () => this.exportarJSON(),
      onNovoUpload: () => this.novoUpload(),
      onReiniciar: () => this.reiniciar(),
      onVoltarMenu: () => this.voltarMenu(),
    };

    const uiResultado = AnalisadorUI.renderizarResultado(
      this.analisador,
      this.tipoSelecionado,
      handlers
    );

    this.uiResultado = uiResultado;
  }

  toggleExibirItens() {
    if (this.uiResultado) {
      const totalItens = this.analisador.getPalavrasUnicas().length;
      AnalisadorUI.toggleExibirItens(
        this.uiResultado.itensArea,
        this.uiResultado.btnExibirItens,
        totalItens
      );
    }
  }

  importarDados() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const arquivo = e.target.files[0];
      if (arquivo) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const resultado = this.analisador.importarDeJSON(event.target.result);
          if (typeof ErrorHandler !== 'undefined') {
            if (resultado.sucesso) {
              ErrorHandler.success(resultado.mensagem);
            } else {
              ErrorHandler.error(resultado.mensagem);
            }
          } else {
            alert(resultado.mensagem);
          }
          this.passo = 2;
          this.renderizar();
        };
        reader.readAsText(arquivo, 'UTF-8');
      }
    };
    input.click();
  }

  exportarJSON() {
    this.analisador.exportarParaJSON();
    if (typeof ErrorHandler !== 'undefined') {
      ErrorHandler.success('Dados exportados com sucesso!');
    } else {
      alert('✅ Dados exportados com sucesso!');
    }
  }

  async exportarPDF() {
    const btn = document.getElementById('btnExportarPDF');

    if (typeof LoadingManager !== 'undefined' && btn) {
      await LoadingManager.execute(
        btn,
        async () => {
          this.analisador.exportarParaPDF();
        },
        '⏳ Gerando PDF...'
      );
    } else {
      this.analisador.exportarParaPDF();
    }

    if (typeof ErrorHandler !== 'undefined') {
      ErrorHandler.success('Relatório PDF gerado com sucesso!');
    } else {
      alert('✅ Relatório PDF gerado com sucesso!');
    }
  }

  revisarEstudo() {
    let itens = this.analisador.getItensParaEstudo(100);

    if (itens.length === 0) {
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.warning(
          `Nenhuma ${this.tipoSelecionado === 'frases' ? 'frase' : 'palavra'} encontrada para revisar!`
        );
      } else {
        alert(
          `Nenhuma ${this.tipoSelecionado === 'frases' ? 'frase' : 'palavra'} encontrada para revisar!`
        );
      }
      return;
    }

    // Embaralha os itens para ordem aleatória
    itens = ShufflerService.shuffledCopy(itens);

    let appRevisao;

    if (this.tipoSelecionado === 'frases') {
      appRevisao = new AppFrases();
      appRevisao.state.setAudioAutomatico(false);
      appRevisao.state.setItens(itens);
      appRevisao.state.setPasso(3);
      appRevisao.renderizarConfiguracao();
    } else {
      appRevisao = new AppPalavras();
      appRevisao.state.setAudioAutomatico(false);
      appRevisao.state.setItens(itens);
      appRevisao.state.setPasso(3);
      appRevisao.renderizarConfiguracao();
    }
  }

  novoUpload() {
    this.passo = 1;
    this.renderizar();
  }

  reiniciar() {
    const confirmar = confirm('Tem certeza? Isso vai apagar todo o histórico de estudo!');
    if (confirmar) {
      this.analisador.reiniciar();
      this.analisadorExtracao.reiniciar();
      this.passo = 1;
      this.renderizar();
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.success('Histórico reiniciado com sucesso!');
      }
    }
  }

  voltarMenu() {
    if (typeof renderizarMenu === 'function') {
      renderizarMenu();
    }
  }
}
