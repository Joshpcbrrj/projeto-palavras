/**
 * Ponto de entrada do aplicativo
 * Escolhe entre Palavras, Frases, Verificar Estudo ou Analisar Progresso
 */

let aplicativoAtual = null;

function iniciarModo(tipo) {
  console.log('Iniciando modo:', tipo);

  if (tipo === 'palavras') {
    aplicativoAtual = new AppPalavras();
    aplicativoAtual.renderizar();
  } else if (tipo === 'frases') {
    aplicativoAtual = new AppFrases();
    aplicativoAtual.renderizar();
  } else if (tipo === 'textoPersonalizado') {
    aplicativoAtual = new AppTextoPersonalizado();
    aplicativoAtual.renderizar();
  } else if (tipo === 'revisaoTexto') {
    aplicativoAtual = new AppRevisaoTexto();
    aplicativoAtual.renderizar();
  } else if (tipo === 'analisadorPalavras') {
    aplicativoAtual = new AppAnalisador('palavras');
    aplicativoAtual.renderizar();
  } else if (tipo === 'analisadorFrases') {
    aplicativoAtual = new AppAnalisador('frases');
    aplicativoAtual.renderizar();
  } else if (tipo === 'progresso') {
    aplicativoAtual = new AppProgresso();
    aplicativoAtual.renderizar();
  } else {
    console.error('Tipo desconhecido:', tipo);
  }
}

function renderizarMenu() {
  const appDiv = document.getElementById('app');

  if (!appDiv) {
    console.error('Elemento #app não encontrado');
    return;
  }

  appDiv.innerHTML = `
        <div class="card-surface p-8 md:p-10">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">📚 O que você quer fazer hoje?</h2>
                    <p class="text-gray-600 mt-1">Escolha um fluxo e continue seus estudos com mais praticidade.</p>
                </div>
                <div class="inline-flex items-center px-3 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold">Modo estudo • Web</div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button id="btnPalavras" class="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-6 py-4 rounded-2xl hover:opacity-95 transition text-lg font-semibold shadow-lg shadow-purple-200 text-left">
                    <div class="text-xl">📖</div>
                    <div>Estudar Palavras</div>
                </button>
                <button id="btnFrases" class="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-2xl hover:opacity-95 transition text-lg font-semibold shadow-lg shadow-blue-200 text-left">
                    <div class="text-xl">💬</div>
                    <div>Estudar Frases</div>
                </button>
                <button id="btnTextoPersonalizado" class="bg-gradient-to-r from-amber-600 to-orange-500 text-white px-6 py-4 rounded-2xl hover:opacity-95 transition text-lg font-semibold shadow-lg shadow-amber-200 text-left">
                    <div class="text-xl">📝</div>
                    <div>Estude e gere seu texto</div>
                </button>
                <button id="btnRevisaoTexto" class="bg-gradient-to-r from-pink-600 to-rose-500 text-white px-6 py-4 rounded-2xl hover:opacity-95 transition text-lg font-semibold shadow-lg shadow-pink-200 text-left">
                    <div class="text-xl">📂</div>
                    <div>Revise texto já estudado</div>
                </button>
                <button id="btnAnalisadorPalavras" class="bg-gradient-to-r from-emerald-600 to-green-500 text-white px-6 py-4 rounded-2xl hover:opacity-95 transition text-lg font-semibold shadow-lg shadow-green-200 text-left">
                    <div class="text-xl">📊</div>
                    <div>Verificar Estudo de Palavras</div>
                </button>
                <button id="btnAnalisadorFrases" class="bg-gradient-to-r from-teal-600 to-sky-600 text-white px-6 py-4 rounded-2xl hover:opacity-95 transition text-lg font-semibold shadow-lg shadow-teal-200 text-left">
                    <div class="text-xl">📝</div>
                    <div>Verificar Estudo de Frases</div>
                </button>

            </div>
            
            <p class="text-center text-gray-500 text-sm mt-4">
                💡 Dica: Os arquivos PDF gerados pelo programa podem ser analisados na opção correspondente.
            </p>
        </div>
    `;

  const btnPalavras = document.getElementById('btnPalavras');
  const btnFrases = document.getElementById('btnFrases');
  const btnTextoPersonalizado = document.getElementById('btnTextoPersonalizado');
  const btnRevisaoTexto = document.getElementById('btnRevisaoTexto');
  const btnAnalisadorPalavras = document.getElementById('btnAnalisadorPalavras');
  const btnAnalisadorFrases = document.getElementById('btnAnalisadorFrases');
  // const btnProgresso = document.getElementById('btnProgresso');

  if (btnPalavras) btnPalavras.addEventListener('click', () => iniciarModo('palavras'));
  if (btnFrases) btnFrases.addEventListener('click', () => iniciarModo('frases'));
  if (btnTextoPersonalizado)
    btnTextoPersonalizado.addEventListener('click', () => iniciarModo('textoPersonalizado'));
  if (btnRevisaoTexto) btnRevisaoTexto.addEventListener('click', () => iniciarModo('revisaoTexto'));
  if (btnAnalisadorPalavras)
    btnAnalisadorPalavras.addEventListener('click', () => iniciarModo('analisadorPalavras'));
  if (btnAnalisadorFrases)
    btnAnalisadorFrases.addEventListener('click', () => iniciarModo('analisadorFrases'));
}

// Iniciar aplicação com o menu principal
renderizarMenu();
