class AppTextoPersonalizado {
  constructor() {
    this.navigation = new AppNavigation();
    this.texto = '';
    this.titulo = '';
    this.idioma = AudioIdiomas?.idiomaAtual || 'pt-BR';
  }

  renderizar() {
    const appDiv = document.getElementById('app');

    if (!appDiv) return;

    appDiv.innerHTML = `
      <div class="card-surface p-8 md:p-10">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">📝 Estude e gere seu texto</h2>
            <p class="text-gray-600 mt-1">Cole um texto já criado por você, escolha o idioma da leitura e estude com áudio.</p>
          </div>
          <div class="inline-flex items-center px-3 py-2 rounded-full bg-purple-50 text-purple-700 text-sm font-semibold">Web • Estudo • Leitura</div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="mb-4">
            <label class="block text-gray-700 font-bold mb-2">Título do texto</label>
            <input id="tituloTexto" type="text" class="input-modern w-full p-3" placeholder="Ex.: Texto sobre viagens" />
          </div>

          <div class="mb-4">
            <label class="block text-gray-700 font-bold mb-2">Idioma da leitura</label>
            <select id="idiomaTexto" class="input-modern w-full p-3">
              ${this.renderizarOpcoesIdioma()}
            </select>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-bold mb-2">Texto</label>
          <textarea id="textoInput" rows="12" class="input-modern w-full p-4 focus:outline-none font-mono" placeholder="Cole aqui o texto que você quer estudar..."></textarea>
        </div>

        <div class="flex flex-wrap gap-3">
          <button id="btnOuvir" class="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition shadow-lg shadow-purple-200">🔊 Ouvir texto</button>
          <button id="btnExportar" class="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">📄 Exportar PDF</button>
          <button id="btnVoltar" class="bg-slate-500 text-white px-6 py-3 rounded-xl hover:bg-slate-600 transition">⬅️ Voltar</button>
        </div>
      </div>
    `;

    document.getElementById('btnOuvir')?.addEventListener('click', () => this.ouvirTexto());
    document.getElementById('btnExportar')?.addEventListener('click', () => this.exportarPDF());
    document.getElementById('btnVoltar')?.addEventListener('click', () => this.navigation.voltarParaMenu());

    document.getElementById('idiomaTexto')?.addEventListener('change', (event) => {
      this.idioma = event.target.value;
      AudioIdiomas?.salvarIdioma(this.idioma);
    });
  }

  renderizarOpcoesIdioma() {
    if (typeof AudioIdiomas === 'undefined') return '';

    return Object.entries(AudioIdiomas.idiomas)
      .map(([codigo, info]) => `<option value="${codigo}" ${this.idioma === codigo ? 'selected' : ''}>${info.bandeira} ${info.nome}</option>`)
      .join('');
  }

  ouvirTexto() {
    const texto = document.getElementById('textoInput')?.value?.trim();
    if (!texto) {
      alert('Digite ou cole um texto antes de ouvir.');
      return;
    }

    this.texto = texto;
    this.titulo = document.getElementById('tituloTexto')?.value?.trim() || 'Texto personalizado';
    AudioIdiomas?.salvarIdioma(this.idioma);
    AudioPlayer?.falar(texto);
  }

  exportarPDF() {
    const texto = document.getElementById('textoInput')?.value?.trim();
    if (!texto) {
      alert('Digite ou cole um texto antes de exportar.');
      return;
    }

    this.texto = texto;
    this.titulo = document.getElementById('tituloTexto')?.value?.trim() || 'Texto personalizado';
    const generator = new PDFGenerator();
    const doc = generator.gerarTextoPersonalizadoPDF({
      titulo: this.titulo,
      texto: this.texto,
      idioma: this.idioma,
      tipo: 'texto-personalizado',
    });
    generator.salvarPDF(doc, 'texto_personalizado');
  }
}
