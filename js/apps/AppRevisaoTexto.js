class AppRevisaoTexto {
  constructor() {
    this.navigation = new AppNavigation();
    this.texto = '';
    this.idioma = AudioIdiomas?.idiomaAtual || 'pt-BR';
    this.rateRevisao = 0.85;
  }

  renderizar() {
    const appDiv = document.getElementById('app');

    if (!appDiv) return;

    appDiv.innerHTML = `
      <div class="card-surface p-8 md:p-10">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">📂 Revise texto já estudado</h2>
            <p class="text-gray-600 mt-1">Faça upload de um texto no formato exportado pelo app e revise com leitura em voz.</p>
          </div>
          <div class="inline-flex items-center px-3 py-2 rounded-full bg-sky-50 text-sky-700 text-sm font-semibold">Upload • Revisão • Voz</div>
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-bold mb-2">Idioma da leitura</label>
          <select id="idiomaRevisao" class="input-modern w-full p-3">
            ${this.renderizarOpcoesIdioma()}
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-bold mb-2">Arquivo de texto</label>
          <input id="inputArquivo" type="file" accept=".txt,.md,.pdf" class="input-modern w-full p-3" />
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-bold mb-2">Texto carregado</label>
          <textarea id="textoRevisao" rows="12" class="input-modern w-full p-4 focus:outline-none font-mono"></textarea>
        </div>

        <div class="mt-4">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div class="flex flex-wrap gap-3">
              <button id="btnOuvirRevisao" class="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition shadow-lg shadow-purple-200">▶️ Ouvir texto</button>
              <button id="btnPausarRevisao" class="bg-slate-600 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition">⏸️ Pausar</button>
              <button id="btnVoltarInicioRevisao" class="bg-slate-500 text-white px-6 py-3 rounded-xl hover:bg-slate-600 transition">⏮️ Voltar ao início</button>
              <button id="btnVoltar" class="bg-slate-400 text-white px-6 py-3 rounded-xl hover:bg-slate-500 transition">⬅️ Voltar</button>
            </div>
          </div>

          <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <label for="rateRevisao" class="block text-gray-700 font-bold">Velocidade</label>
            <div class="flex items-center gap-3">
              <button id="btnRateMinusRevisao" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">-</button>
              <input id="rateRevisao" type="range" min="0.5" max="1.5" step="0.05" value="0.85" class="w-64" />
              <button id="btnRatePlusRevisao" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">+</button>
            </div>
            <div class="inline-flex items-center px-3 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold">
              <span id="rateRevisaoValor">0.85</span>x
            </div>
          </div>
        </div>

      </div>
    `;

    document
      .getElementById('inputArquivo')
      ?.addEventListener('change', (event) => this.processarArquivo(event));

    document.getElementById('btnOuvirRevisao')?.addEventListener('click', () => this.ouvirTexto());
    document
      .getElementById('btnPausarRevisao')
      ?.addEventListener('click', () => this.togglePausarOuRetomar());
    document
      .getElementById('btnVoltarInicioRevisao')
      ?.addEventListener('click', () => this.voltarAoInicio());
    document
      .getElementById('btnVoltar')
      ?.addEventListener('click', () => this.navigation.voltarParaMenu());

    const rateRange = document.getElementById('rateRevisao');
    const rateValor = document.getElementById('rateRevisaoValor');
    const syncRate = () => {
      if (!rateRange) return;
      const v = Number(rateRange.value);
      const rate = Number.isFinite(v) ? v : 0.85;
      if (rateValor) rateValor.textContent = rate.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
      this.rateRevisao = rate;
    };

    this.rateRevisao = Number(rateRange?.value || 0.85);
    syncRate();
    rateRange?.addEventListener('input', syncRate);

    document.getElementById('btnRateMinusRevisao')?.addEventListener('click', () => {
      if (!rateRange) return;
      rateRange.value = String(Math.max(0.5, Number(rateRange.value) - 0.05));
      syncRate();
    });

    document.getElementById('btnRatePlusRevisao')?.addEventListener('click', () => {
      if (!rateRange) return;
      rateRange.value = String(Math.min(1.5, Number(rateRange.value) + 0.05));
      syncRate();
    });

    document.getElementById('idiomaRevisao')?.addEventListener('change', (event) => {
      this.idioma = event.target.value;
      AudioIdiomas?.salvarIdioma(this.idioma);
    });
  }

  renderizarOpcoesIdioma() {
    if (typeof AudioIdiomas === 'undefined') return '';

    return Object.entries(AudioIdiomas.idiomas)
      .map(
        ([codigo, info]) =>
          `<option value="${codigo}" ${this.idioma === codigo ? 'selected' : ''}>${info.bandeira} ${info.nome}</option>`
      )
      .join('');
  }

  async processarArquivo(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    const texto = await this.lerArquivo(arquivo);
    this.texto = texto;
    document.getElementById('textoRevisao').value = texto;
  }

  async lerArquivo(arquivo) {
    const nomeArquivo = (arquivo.name || '').toLowerCase();

    if (arquivo.type === 'application/pdf' || nomeArquivo.endsWith('.pdf')) {
      return this.lerTextoPDF(arquivo);
    }

    const texto = await arquivo.text();
    return TextoPersonalizadoService?.extrairTextoImportado(texto) || texto;
  }

  async lerTextoPDF(arquivo) {
    if (typeof window === 'undefined' || !window.pdfjsLib) {
      return 'Não foi possível ler o PDF. O navegador não suporta esta função.';
    }

    const buffer = await arquivo.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
    let textoCompleto = '';

    for (let pagina = 1; pagina <= pdf.numPages; pagina += 1) {
      const page = await pdf.getPage(pagina);
      const conteudo = await page.getTextContent();
      const paginaTexto = conteudo.items.map((item) => item.str).join(' ');
      textoCompleto += `${paginaTexto}\n`;
    }

    return TextoPersonalizadoService?.extrairTextoImportado(textoCompleto) || textoCompleto;
  }

  ouvirTexto() {
    const texto = document.getElementById('textoRevisao')?.value?.trim();
    if (!texto) {
      alert('Carregue um texto antes de ouvir.');
      return;
    }

    this.texto = texto;
    AudioIdiomas?.salvarIdioma(this.idioma);

    const rate = Number.isFinite(this.rateRevisao) ? this.rateRevisao : 0.85;
    AudioPlayer?.falar(texto, { rate });

    this.atualizarBotaoPausar();
  }

  togglePausarOuRetomar() {
    if (AudioPlayer?.isPaused?.()) {
      AudioPlayer.retomar();
    } else {
      AudioPlayer.pausar();
    }
    this.atualizarBotaoPausar();
  }

  atualizarBotaoPausar() {
    const btn = document.getElementById('btnPausarRevisao');
    if (!btn || !AudioPlayer) return;

    const label = AudioPlayer.isPaused?.() ? '▶️ Retomar' : '⏸️ Pausar';
    btn.textContent = label;
  }

  voltarAoInicio() {
    if (!this.texto) {
      const texto = document.getElementById('textoRevisao')?.value?.trim();
      this.texto = texto || '';
    }

    if (!this.texto) return;

    AudioPlayer?.parar?.();
    AudioIdiomas?.salvarIdioma(this.idioma);
    AudioPlayer?.falar(this.texto, { rate: this.rateRevisao || 0.85 });
    this.atualizarBotaoPausar();
  }
}
