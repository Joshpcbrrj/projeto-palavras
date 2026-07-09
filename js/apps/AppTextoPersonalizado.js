class AppTextoPersonalizado {
  constructor() {
    this.navigation = new AppNavigation();
    this.texto = '';
    this.titulo = '';
    this.idioma = AudioIdiomas?.idiomaAtual || 'pt-BR';
    this.rateTexto = 0.85;
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

        <div class="mt-3">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="mb-2">
              <label class="block text-gray-700 font-bold mb-2">Intervalo padrão (dias)</label>
              <input id="revisaoIntervaloTextoPersonalizado" type="number" min="1" max="365" step="1" value="3" class="input-modern w-full p-3" />
            </div>

            <div class="mb-2">
              <label class="block text-gray-700 font-bold mb-2">Revisar em (DD/MM/AAAA)</label>
              <input id="revisaoDataTextoPersonalizado" type="text" class="input-modern w-full p-3" placeholder="Ex.: 12/07/2026" />
              <p class="text-sm text-gray-600 mt-2">
                Deixe vazio para usar o padrão (+intervalo). O app também insere esses dados no PDF para uso offline.
              </p>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div class="flex flex-wrap gap-3">
              <button id="btnOuvir" class="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition shadow-lg shadow-purple-200">▶️ Ouvir texto</button>
              <button id="btnPausar" class="bg-slate-600 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition">⏸️ Pausar</button>
              <button id="btnVoltarInicio" class="bg-slate-500 text-white px-6 py-3 rounded-xl hover:bg-slate-600 transition">⏮️ Voltar ao início</button>
              <button id="btnExportar" class="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">📄 Exportar PDF</button>
            </div>
          </div>

          <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <label for="rateTexto" class="block text-gray-700 font-bold">Velocidade</label>
            <div class="flex items-center gap-3">
              <button id="btnRateMinus" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">-</button>
              <input id="rateTexto" type="range" min="0.5" max="1.5" step="0.05" value="0.85" class="w-64" />
              <button id="btnRatePlus" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">+</button>
            </div>
            <div class="inline-flex items-center px-3 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold">
              <span id="rateTextoValor">0.85</span>x
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnOuvir')?.addEventListener('click', () => this.ouvirTexto());
    document.getElementById('btnExportar')?.addEventListener('click', () => this.exportarPDF());

    document
      .getElementById('btnPausar')
      ?.addEventListener('click', () => this.togglePausarOuRetomar());
    document
      .getElementById('btnVoltarInicio')
      ?.addEventListener('click', () => this.voltarAoInicio());

    const rateRange = document.getElementById('rateTexto');
    const rateValor = document.getElementById('rateTextoValor');
    const syncRate = () => {
      if (!rateRange) return;
      const v = Number(rateRange.value);
      const rate = Number.isFinite(v) ? v : 0.85;
      if (rateValor) rateValor.textContent = rate.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
      this.rateTexto = rate;
    };

    this.rateTexto = Number(rateRange?.value || 0.85);
    syncRate();
    rateRange?.addEventListener('input', syncRate);

    document.getElementById('btnRateMinus')?.addEventListener('click', () => {
      if (!rateRange) return;
      rateRange.value = String(Math.max(0.5, Number(rateRange.value) - 0.05));
      syncRate();
    });
    document.getElementById('btnRatePlus')?.addEventListener('click', () => {
      if (!rateRange) return;
      rateRange.value = String(Math.min(1.5, Number(rateRange.value) + 0.05));
      syncRate();
    });

    document
      .getElementById('btnVoltar')
      ?.addEventListener('click', () => this.navigation.voltarParaMenu());

    document.getElementById('idiomaTexto')?.addEventListener('change', (event) => {
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

  ouvirTexto() {
    const texto = document.getElementById('textoInput')?.value?.trim();
    if (!texto) {
      alert('Digite ou cole um texto antes de ouvir.');
      return;
    }

    this.texto = texto;
    this.titulo = document.getElementById('tituloTexto')?.value?.trim() || 'Texto personalizado';
    AudioIdiomas?.salvarIdioma(this.idioma);

    const rate = Number.isFinite(this.rateTexto) ? this.rateTexto : 0.85;
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
    const btn = document.getElementById('btnPausar');
    if (!btn || !AudioPlayer) return;

    const label = AudioPlayer.isPaused?.() ? '▶️ Retomar' : '⏸️ Pausar';
    btn.textContent = label;
  }

  voltarAoInicio() {
    if (!this.texto) {
      const texto = document.getElementById('textoInput')?.value?.trim();
      this.texto = texto || '';
    }
    if (!this.texto) return;

    AudioPlayer?.parar?.();
    AudioIdiomas?.salvarIdioma(this.idioma);
    AudioPlayer?.falar(this.texto, { rate: this.rateTexto || 0.85 });
    this.atualizarBotaoPausar();
  }

  exportarPDF() {
    const texto = document.getElementById('textoInput')?.value?.trim();
    if (!texto) {
      alert('Digite ou cole um texto antes de exportar.');
      return;
    }

    this.texto = texto;
    this.titulo = document.getElementById('tituloTexto')?.value?.trim() || 'Texto personalizado';

    // Data de revisão: padrão +3 dias, mas o usuário pode sobrescrever.
    // UI: vamos ler de um input opcional se existir.
    const inputRevisao = document.getElementById('revisaoDataTextoPersonalizado');
    const inputIntervalo = document.getElementById('revisaoIntervaloTextoPersonalizado');

    const hoje = new Date();
    const intervaloDias = inputIntervalo ? Number(inputIntervalo.value) : 3;

    const somaDias = (date, dias) => {
      const d = new Date(date);
      d.setDate(d.getDate() + dias);
      return d;
    };

    const formataBR = (date) => {
      try {
        return date.toLocaleDateString('pt-BR');
      } catch {
        return String(date);
      }
    };

    const dataDefault = formataBR(somaDias(hoje, intervaloDias));
    const dataUsuario = inputRevisao ? String(inputRevisao.value || '').trim() : '';
    const dataRevisar = dataUsuario || dataDefault;

    const generator = new PDFGenerator();
    const doc = generator.gerarTextoPersonalizadoPDF({
      titulo: this.titulo,
      texto: this.texto,
      idioma: this.idioma,
      tipo: 'texto-personalizado',
      revisao: { dataBR: dataRevisar, intervaloDias },
    });

    generator.salvarPDF(doc, 'texto_personalizado', {
      titulo: this.titulo,
      subject: 'texto-personalizado',
      keywords: ['revisao', dataRevisar],
      author: 'Aprendendo Palavras',
      creator: 'Aprendendo Palavras',
    });
  }
}
