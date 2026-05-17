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
        <div class="bg-white rounded-2xl shadow-xl p-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">📚 O que você quer fazer hoje?</h2>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button id="btnPalavras" class="bg-purple-600 text-white px-6 py-4 rounded-lg hover:bg-purple-700 transition text-lg font-semibold">
                    📖 Estudar Palavras
                </button>
                <button id="btnFrases" class="bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition text-lg font-semibold">
                    💬 Estudar Frases
                </button>
                <button id="btnAnalisadorPalavras" class="bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition text-lg font-semibold">
                    📊 Verificar Estudo de Palavras
                </button>
                <button id="btnAnalisadorFrases" class="bg-teal-600 text-white px-6 py-4 rounded-lg hover:bg-teal-700 transition text-lg font-semibold">
                    📝 Verificar Estudo de Frases
                </button>
                <button id="btnProgresso" class="bg-indigo-600 text-white px-6 py-4 rounded-lg hover:bg-indigo-700 transition text-lg font-semibold col-span-1 md:col-span-2">
                    📈 Analisar Progresso
                </button>
            </div>
            
            <p class="text-center text-gray-500 text-sm mt-4">
                💡 Dica: Os arquivos PDF gerados pelo programa podem ser analisados na opção correspondente.
            </p>
        </div>
    `;

  const btnPalavras = document.getElementById('btnPalavras');
  const btnFrases = document.getElementById('btnFrases');
  const btnAnalisadorPalavras = document.getElementById('btnAnalisadorPalavras');
  const btnAnalisadorFrases = document.getElementById('btnAnalisadorFrases');
  const btnProgresso = document.getElementById('btnProgresso');

  if (btnPalavras) btnPalavras.addEventListener('click', () => iniciarModo('palavras'));
  if (btnFrases) btnFrases.addEventListener('click', () => iniciarModo('frases'));
  if (btnAnalisadorPalavras)
    btnAnalisadorPalavras.addEventListener('click', () => iniciarModo('analisadorPalavras'));
  if (btnAnalisadorFrases)
    btnAnalisadorFrases.addEventListener('click', () => iniciarModo('analisadorFrases'));
  if (btnProgresso) btnProgresso.addEventListener('click', () => iniciarModo('progresso'));
}

// Iniciar aplicação com o menu principal
renderizarMenu();
