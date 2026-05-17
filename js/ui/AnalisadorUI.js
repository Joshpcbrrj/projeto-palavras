/**
 * AnalisadorUI.js
 * Interface do analisador de estudo (upload e resultados)
 */

const AnalisadorUI = {
  /**
   * Renderiza a tela de upload de arquivos
   * @param {Object} analisador - Instância do AnalisadorEstudo
   * @param {string} tipo - 'palavras' ou 'frases'
   * @param {Function} onProcessar - Callback ao processar arquivos
   * @param {Function} onVoltar - Callback para voltar ao menu
   */
  renderizarUpload(analisador, tipo, onProcessar, onVoltar) {
    const appDiv = document.getElementById('app');
    const tipoTexto = tipo === 'frases' ? 'Frases' : 'Palavras';
    const corTema = tipo === 'frases' ? 'teal' : 'green';
    const stats = analisador.getEstatisticas();

    appDiv.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">📊 Verificar ${tipoTexto}</h2>
                <p class="text-gray-600 mb-4">Faça upload de arquivos de texto (.txt) ou PDF (.pdf) que contenham ${tipoTexto.toLowerCase()} para contar ${tipoTexto.toLowerCase()} únicas estudadas.</p>
                
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                    <input type="file" id="fileInput" accept=".txt,.pdf" class="hidden" multiple>
                    <button id="btnUpload" class="bg-${corTema}-500 text-white px-6 py-3 rounded-lg hover:bg-${corTema}-600 transition">
                        📁 Selecionar Arquivos
                    </button>
                    <p class="text-gray-500 mt-2">Suporta arquivos .txt e .pdf</p>
                    <p class="text-gray-400 text-sm mt-1">📌 Arquivos PDF devem ser do tipo "Minhas ${tipoTexto} Estudadas"</p>
                </div>
                
                <div class="flex gap-4 mb-6">
                    <button id="btnImportar" class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition flex-1">
                        📥 Importar Dados (JSON)
                    </button>
                    <button id="btnExportar" class="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition flex-1">
                        📤 Exportar Dados (JSON)
                    </button>
                </div>
                
                <div id="previewArea" class="hidden">
                    <h3 class="font-bold text-gray-700 mb-2">Arquivos selecionados:</h3>
                    <div id="listaArquivos" class="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto"></div>
                    <div class="flex gap-4 mt-4">
                        <button id="btnProcessar" class="bg-${corTema}-500 text-white px-6 py-3 rounded-lg hover:bg-${corTema}-600 transition">✅ Processar Arquivos</button>
                        <button id="btnCancelar" class="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition">❌ Cancelar</button>
                    </div>
                </div>
                
                <div id="infoArea" class="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p class="text-blue-800">📊 Estatísticas atuais:</p>
                    <p class="text-blue-800 font-bold text-xl">${tipoTexto} únicas: ${stats.totalItensUnicos}</p>
                    <p class="text-blue-800">Arquivos processados: ${stats.totalArquivos}</p>
                </div>
                
                <div class="flex gap-4 mt-6">
                    <button id="btnVoltar" class="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition">← Voltar ao Menu</button>
                </div>
            </div>
        `;

    // Retorna os elementos para conectar eventos
    return {
      btnUpload: document.getElementById('btnUpload'),
      fileInput: document.getElementById('fileInput'),
      previewArea: document.getElementById('previewArea'),
      listaArquivos: document.getElementById('listaArquivos'),
      btnProcessar: document.getElementById('btnProcessar'),
      btnCancelar: document.getElementById('btnCancelar'),
      btnImportar: document.getElementById('btnImportar'),
      btnExportar: document.getElementById('btnExportar'),
      btnVoltar: document.getElementById('btnVoltar'),
    };
  },

  /**
   * Renderiza a tela de resultado da análise
   * @param {Object} analisador - Instância do AnalisadorEstudo
   * @param {string} tipo - 'palavras' ou 'frases'
   * @param {Object} handlers - Handlers para os botões
   */
  renderizarResultado(analisador, tipo, handlers) {
    const appDiv = document.getElementById('app');
    const stats = analisador.getEstatisticas();
    const itens = analisador.getPalavrasUnicas();
    const tipoTexto = tipo === 'frases' ? 'frases' : 'palavras';
    const corTema = tipo === 'frases' ? 'teal' : 'green';

    appDiv.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">📊 Resultado da Análise</h2>
                
                <div class="bg-green-50 p-4 rounded-lg mb-6">
                    <p class="text-green-800 font-bold text-3xl text-center">${stats.totalItensUnicos}</p>
                    <p class="text-green-800 text-center">${tipoTexto} únicas no total</p>
                    <p class="text-green-800 text-center mt-2">📁 ${stats.totalArquivos} arquivo(s) processado(s)</p>
                    <p class="text-green-800 text-center mt-1">📌 Tipo: ${tipo === 'frases' ? 'Frases' : 'Palavras'}</p>
                </div>
                
                <div class="mb-6">
                    <h3 class="font-bold text-gray-700 mb-2">📋 Histórico de uploads:</h3>
                    <div class="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                        ${stats.historico
                          .map(
                            (h) => `
                            <div class="py-1 border-b border-gray-200">
                                ${h.tipo === 'PDF' ? '📄' : '📃'} ${h.nome} - ${h.itensNoArquivo} ${tipoTexto} (${h.itensNovos} novas)
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
                
                <div class="flex flex-wrap gap-4 justify-center mb-6">
                    <button id="btnExibirItens" class="bg-${corTema}-500 text-white px-6 py-3 rounded-lg hover:bg-${corTema}-600 transition">📖 Exibir ${tipoTexto} (${itens.length})</button>
                    <button id="btnRevisarEstudo" class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition">🔄 Revisar Estudo</button>
                    <button id="btnExportarPDF" class="bg-purple-500 text-white px-6 py-3 rounded-lg hover:bg-purple-600 transition">📄 Exportar Relatório PDF</button>
                    <button id="btnExportarJSON" class="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition">💾 Exportar JSON</button>
                    <button id="btnNovoUpload" class="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 transition">➕ Novo Upload</button>
                    <button id="btnReiniciar" class="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition">🗑️ Reiniciar Estudo</button>
                </div>
                
                <div id="itensArea" class="hidden mt-6">
                    <h3 class="font-bold text-gray-700 mb-3">📖 Todas as ${tipoTexto} únicas (${itens.length}):</h3>
                    <div class="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto columns-2 md:columns-3">
                        ${itens
                          .map(
                            (p, i) => `
                            <div class="text-gray-600 py-1 break-inside-avoid">${i + 1}. ${p}</div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
                
                <div class="flex gap-4 mt-6">
                    <button id="btnVoltarMenu" class="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition">← Voltar ao Menu</button>
                </div>
            </div>
        `;

    // Configura eventos usando os handlers fornecidos
    document.getElementById('btnExibirItens')?.addEventListener('click', handlers.onExibirItens);
    document
      .getElementById('btnRevisarEstudo')
      ?.addEventListener('click', handlers.onRevisarEstudo);
    document.getElementById('btnExportarPDF')?.addEventListener('click', handlers.onExportarPDF);
    document.getElementById('btnExportarJSON')?.addEventListener('click', handlers.onExportarJSON);
    document.getElementById('btnNovoUpload')?.addEventListener('click', handlers.onNovoUpload);
    document.getElementById('btnReiniciar')?.addEventListener('click', handlers.onReiniciar);
    document.getElementById('btnVoltarMenu')?.addEventListener('click', handlers.onVoltarMenu);

    // Retorna referência para o elemento de itens (para toggle)
    return {
      itensArea: document.getElementById('itensArea'),
      btnExibirItens: document.getElementById('btnExibirItens'),
    };
  },

  /**
   * Alterna a exibição da lista de itens
   */
  toggleExibirItens(itensArea, btnExibirItens, totalItens) {
    if (itensArea.classList.contains('hidden')) {
      itensArea.classList.remove('hidden');
      btnExibirItens.textContent = `📖 Ocultar Itens (${totalItens})`;
    } else {
      itensArea.classList.add('hidden');
      btnExibirItens.textContent = `📖 Exibir Itens (${totalItens})`;
    }
  },
};
