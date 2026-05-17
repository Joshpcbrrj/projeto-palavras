/**
 * AppFrases.js
 * Aplicativo para estudo de FRASES
 * Herda da classe base AppBase
 */

class AppFrases extends AppBase {
  constructor() {
    super();
    this.state.setTipo('frases');
    this.state.setTempoConfig(CONFIG.TEMPO_PADRAO_FRASES);
    this.audio.carregarPreferencia();
    this.state.setAudioAutomatico(this.audio.isAudioAutomatico());
  }

  getTipo() {
    return 'frases';
  }

  getMaxItens() {
    return CONFIG.MAX_FRASES;
  }

  getTempoPadrao() {
    return CONFIG.TEMPO_PADRAO_FRASES;
  }

  getBotaoTexto() {
    return '💬 Frases';
  }

  extrairItens(texto) {
    return FrasesModel.extrair(texto);
  }

  selecionarAleatorias(lista) {
    return FrasesModel.selecionarAleatorias(lista, this.getMaxItens());
  }

  criarPDFGenerator() {
    return new PDFGenerator();
  }

  renderizar() {
    const appDiv = document.getElementById('app');

    if (this.state.get().passo === 1) {
      appDiv.innerHTML = `
                <div class="bg-white rounded-2xl shadow-xl p-8">
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">1️⃣ Digite ou cole o texto com frases</h2>
                    <textarea id="textoInput" rows="8" class="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none font-mono" placeholder="Cole seu texto aqui. O programa vai separar cada frase pelo ponto final (.), exclamação (!) ou interrogação (?)."></textarea>
                    <button id="btnProcessar" class="mt-4 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition">Extrair Frases →</button>
                </div>
            `;
      document.getElementById('btnProcessar')?.addEventListener('click', () => {
        const texto = document.getElementById('textoInput')?.value.trim();
        if (this.processarTexto(texto)) {
          this.renderizarConfiguracao();
        }
      });
    }
  }

  renderizarConfiguracao() {
    const appDiv = document.getElementById('app');
    const maxItens = this.getMaxItens();
    const audioAutomaticoChecked = this.audio.isAudioAutomatico() ? 'checked' : '';

    appDiv.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">2️⃣ Configuração do Estudo</h2>
                
                <!-- Seletor de idioma para áudio -->
                <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                    <label class="block text-gray-700 font-bold mb-3">🌐 Idioma da pronúncia:</label>
                    <div id="idiomaSelector" class="flex flex-wrap gap-2">
                        ${this.renderizarBotoesIdioma()}
                    </div>
                    <p class="text-sm text-gray-500 mt-2">🔊 O idioma selecionado será usado para ler as frases em voz alta.</p>
                </div>
                
                <!-- Opção de áudio automático -->
                <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" id="audioAutomatico" class="w-5 h-5 mr-3" ${audioAutomaticoChecked}>
                        <span class="text-gray-700 font-bold">🔊 Falar automaticamente cada frase</span>
                    </label>
                    <p class="text-sm text-gray-500 mt-2 ml-8">🎤 Se ativado, cada frase será pronunciada automaticamente. Você também pode clicar no botão de áudio durante o estudo.</p>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-lg mb-6">
                    <p class="text-blue-800">✅ Total de frases encontradas: <strong>${this.state.getTotalItens()}</strong></p>
                    <p class="text-blue-800">✅ Frases selecionadas para estudo: <strong>${maxItens}</strong></p>
                    <p class="text-blue-800">📌 (Máximo de ${maxItens} frases)</p>
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 font-bold mb-2">⏱️ Tempo entre frases (segundos):</label>
                    <input type="number" id="tempoInput" value="${this.state.get().tempoConfig}" step="0.5" min="0.5" class="w-32 p-2 border-2 border-gray-300 rounded-lg">
                </div>
                <button id="btnIniciar" class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition">Iniciar Estudo →</button>
            </div>
        `;

    this.conectarEventosIdioma();

    const chkAudioAutomatico = document.getElementById('audioAutomatico');
    if (chkAudioAutomatico) {
      chkAudioAutomatico.addEventListener('change', (e) => {
        this.audio.salvarPreferencia(e.target.checked);
        this.state.setAudioAutomatico(e.target.checked);
      });
    }

    document.getElementById('btnIniciar')?.addEventListener('click', () => {
      const tempo = parseFloat(
        document.getElementById('tempoInput')?.value || this.getTempoPadrao()
      );
      if (isNaN(tempo) || tempo < 0.5) {
        if (typeof ErrorHandler !== 'undefined') {
          ErrorHandler.warning('Por favor, digite um tempo válido (mínimo 0.5 segundos)');
        } else {
          alert('Por favor, digite um tempo válido (mínimo 0.5 segundos)');
        }
        return;
      }
      this.iniciarEstudo(tempo);
    });
  }

  renderizarBotoesIdioma() {
    if (typeof AudioIdiomas === 'undefined') {
      return '<p class="text-gray-500">Carregando idiomas...</p>';
    }

    const idiomas = AudioIdiomas.idiomas;
    const idiomaAtual = AudioIdiomas.idiomaAtual;

    return Object.entries(idiomas)
      .map(
        ([codigo, info]) => `
            <button 
                class="idioma-btn ${idiomaAtual === codigo ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'} px-3 py-2 rounded-lg hover:bg-purple-500 hover:text-white transition"
                data-idioma="${codigo}"
            >
                ${info.bandeira} ${info.nome}
            </button>
        `
      )
      .join('');
  }

  conectarEventosIdioma() {
    if (typeof AudioIdiomas === 'undefined') return;

    document.querySelectorAll('.idioma-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idioma = btn.dataset.idioma;
        AudioIdiomas.salvarIdioma(idioma);

        document.querySelectorAll('.idioma-btn').forEach((b) => {
          const isActive = b.dataset.idioma === idioma;
          if (isActive) {
            b.classList.remove('bg-gray-200', 'text-gray-700');
            b.classList.add('bg-purple-600', 'text-white');
          } else {
            b.classList.remove('bg-purple-600', 'text-white');
            b.classList.add('bg-gray-200', 'text-gray-700');
          }
        });

        const info = AudioIdiomas.idiomas[idioma];
        if (info && AudioPlayer.falar) {
          AudioPlayer.falar(`Idioma alterado para ${info.nome}`);
        }
      });
    });
  }

  renderizarEstudo() {
    const appDiv = document.getElementById('app');
    const idiomaAtual = typeof AudioIdiomas !== 'undefined' ? AudioIdiomas.idiomaAtual : 'pt-BR';
    const bandeiraAtual =
      typeof AudioIdiomas !== 'undefined' && AudioIdiomas.idiomas[idiomaAtual]
        ? AudioIdiomas.idiomas[idiomaAtual].bandeira
        : '🌐';

    appDiv.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">3️⃣ Estudando Frases...</h2>
                <div class="text-center mb-4" id="progresso">Frase 1 de ${this.state.getTotalItens()}</div>
                <div class="bg-gradient-to-br from-purple-600 to-blue-500 rounded-2xl p-12 mb-6">
                    <div class="text-white text-2xl md:text-3xl font-bold text-center break-words" id="itemAtual">${this.state.getItemAtual()?.toUpperCase() || 'Pronto?'}</div>
                    <div class="flex justify-center mt-6">
                        <button id="btnAudio" class="bg-white text-purple-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition font-semibold flex items-center gap-2">
                            🔊 Ouvir Pronúncia ${bandeiraAtual}
                        </button>
                    </div>
                </div>
                <div class="flex gap-4 justify-center">
                    <button id="btnSalvarProgresso" class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition">
                        💾 Salvar Progresso
                    </button>
                    <button id="btnPausar" class="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition">
                        ⏸️ Pausar
                    </button>
                    <button id="btnParar" class="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition">
                        ⏹️ Parar
                    </button>
                </div>
            </div>
        `;

    document.getElementById('btnSalvarProgresso')?.addEventListener('click', () => {
      this.salvarSessaoAtual();
    });
    document.getElementById('btnPausar')?.addEventListener('click', () => this.pausarEstudo());
    document.getElementById('btnParar')?.addEventListener('click', () => this.pararEstudo());
    document.getElementById('btnAudio')?.addEventListener('click', () => this.falarItemManual());

    this.state.setEstudoAtivo(true);
    this.mostrarItem(this.state.getIndiceAtual());
    this.iniciarTimer();
  }

  renderizarFinalizacao() {
    const appDiv = document.getElementById('app');
    const tempoTotal = ((this.state.getTotalItens() * this.state.get().tempoConfig) / 60).toFixed(
      1
    );
    const tipoTexto = this.getTipo();

    appDiv.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">🎉 Estudo Finalizado!</h2>
                <div class="bg-green-50 p-4 rounded-lg mb-6">
                    <p class="text-green-800">✅ Parabéns! Você completou o estudo de ${this.state.getTotalItens()} ${tipoTexto}!</p>
                    <p class="text-green-800">⏱️ Tempo total: ${tempoTotal} minutos</p>
                </div>
                <div class="flex flex-wrap gap-4 justify-center">
                    <button id="btnVerItens" class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition">📖 Ver Frases</button>
                    <button id="btnRevisar" class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition">🔄 Revisar Série</button>
                    <button id="btnExportarPDF" class="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition">📄 Exportar PDF</button>
                    <button id="btnNovo" class="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition">✨ Novo Estudo</button>
                </div>
                <div id="revisaoArea" class="hidden mt-6">
                    <h3 class="font-bold text-gray-700 mb-3">📖 Todas as frases estudadas (na ordem):</h3>
                    <div class="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto" id="listaRevisao"></div>
                </div>
            </div>
        `;

    document.getElementById('btnVerItens')?.addEventListener('click', () => this.verItens());
    document.getElementById('btnRevisar')?.addEventListener('click', () => this.revisarSerie());
    document.getElementById('btnExportarPDF')?.addEventListener('click', () => this.exportarPDF());
    document.getElementById('btnNovo')?.addEventListener('click', () => this.novoEstudo());

    // Registra a sessão de estudo no progresso
    this.registrarSessaoEstudo();
  }

  /**
   * Registra a sessão de estudo concluída no ProgressService
   */
  registrarSessaoEstudo() {
    if (typeof ProgressService !== 'undefined') {
      const progressService = new ProgressService();
      progressService.registrarSessao({
        tipo: 'frases',
        quantidade: this.state.getTotalItens(),
        tempo: this.state.getTotalItens() * this.state.get().tempoConfig,
        itens: this.state.getItensEstudados(),
      });
      // Log silencioso (apenas debug)
      if (window.DEBUG_MODE) {
        console.log(
          `📊 Progresso registrado: sessão de frases - ${this.state.getTotalItens()} frases`
        );
      }
    }
  }
}
