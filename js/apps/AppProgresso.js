/**
 * AppProgresso.js
 * Aplicativo para análise de progresso do usuário
 * Exibe estatísticas e histórico de estudos
 * Versão 2.2 - Remove frases únicas (mantém apenas palavras únicas)
 */

class AppProgresso {
  constructor() {
    this.progressService = new ProgressService();
  }

  renderizar() {
    const appDiv = document.getElementById('app');
    const stats = this.progressService.getEstatisticas();

    appDiv.innerHTML = `
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">📈 Meu Progresso</h2>
                
                <!-- Idioma atual -->
                <div class="bg-indigo-50 p-3 rounded-lg mb-6 text-center">
                    <div class="text-sm text-indigo-600">🌐 Idioma do progresso</div>
                    <div class="text-xl font-bold text-indigo-700">
                        ${stats.idioma?.bandeira || '🌐'} ${stats.idioma?.nome || 'Português (Brasil)'}
                    </div>
                    <div class="text-xs text-gray-500">Código: ${stats.idioma?.codigo || 'pt-BR'}</div>
                </div>
                
                <!-- Resumo principal - Primeira linha -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-purple-100 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-purple-600">${stats.totalEstudos}</div>
                        <div class="text-sm text-gray-600">Sessões de Estudo</div>
                    </div>
                    <div class="bg-blue-100 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-blue-600">${stats.totalPalavrasEstudadas + stats.totalFrasesEstudadas}</div>
                        <div class="text-sm text-gray-600">Total Estudado</div>
                        <div class="text-xs text-gray-500">📖 ${stats.totalPalavrasEstudadas} palavras | 💬 ${stats.totalFrasesEstudadas} frases</div>
                    </div>
                    <div class="bg-green-100 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-green-600">${stats.totalPalavrasUnicas || 0}</div>
                        <div class="text-sm text-gray-600">Palavras Únicas</div>
                    </div>
                    <div class="bg-teal-100 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-teal-600">${stats.totalArquivosExportados || 0}</div>
                        <div class="text-sm text-gray-600">Arquivos Exportados</div>
                        <div class="text-xs text-gray-500">📑 PDFs gerados</div>
                    </div>
                </div>
                
                <!-- Arquivos revisados -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="bg-indigo-100 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-indigo-600">${stats.totalArquivosRevisados || 0}</div>
                        <div class="text-sm text-gray-600">Arquivos Revisados</div>
                        <div class="text-xs text-gray-500">📄 PDFs analisados</div>
                    </div>
                    <div class="bg-orange-100 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-orange-600">${stats.totalArquivosExportados || 0}</div>
                        <div class="text-sm text-gray-600">Arquivos Exportados</div>
                        <div class="text-xs text-gray-500">📑 PDFs gerados</div>
                    </div>
                </div>
                
                <!-- Tempo separado por tipo de estudo -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="bg-purple-100 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-purple-600">📖</div>
                        <div class="text-xl font-bold text-purple-600">${stats.tempoPalavras?.formatado || '0h 0min'}</div>
                        <div class="text-sm text-gray-600">Tempo estudando Palavras</div>
                        <div class="text-xs text-gray-500">${stats.tempoPalavras?.segundos || 0} segundos</div>
                    </div>
                    <div class="bg-blue-100 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-blue-600">💬</div>
                        <div class="text-xl font-bold text-blue-600">${stats.tempoFrases?.formatado || '0h 0min'}</div>
                        <div class="text-sm text-gray-600">Tempo estudando Frases</div>
                        <div class="text-xs text-gray-500">${stats.tempoFrases?.segundos || 0} segundos</div>
                    </div>
                </div>
                
                <!-- Palavra mais estudada -->
                ${
                  stats.palavraMaisEstudada?.palavra
                    ? `
                <div class="bg-yellow-50 p-4 rounded-lg mb-6">
                    <div class="text-center">
                        <div class="text-sm text-yellow-800">🏆 Palavra mais estudada</div>
                        <div class="text-2xl font-bold text-yellow-800">"${stats.palavraMaisEstudada.palavra}"</div>
                        <div class="text-xs text-yellow-600">${stats.palavraMaisEstudada.vezes} vezes</div>
                    </div>
                </div>
                `
                    : ''
                }
                
                <!-- Totais de leitura (com repetições) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div class="bg-pink-100 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-pink-600">${stats.totalPalavrasLidas || 0}</div>
                        <div class="text-sm text-gray-600">Palavras Lidas (total)</div>
                        <div class="text-xs text-gray-500">Inclui repetições</div>
                    </div>
                    <div class="bg-cyan-100 rounded-lg p-4 text-center">
                        <div class="text-3xl font-bold text-cyan-600">${stats.totalFrasesLidas || 0}</div>
                        <div class="text-sm text-gray-600">Frases Lidas (total)</div>
                        <div class="text-xs text-gray-500">Inclui repetições</div>
                    </div>
                </div>
                
                <!-- Palavras mais repetidas -->
                ${
                  stats.palavrasMaisRepetidas && stats.palavrasMaisRepetidas.length > 0
                    ? `
                <div class="mb-6">
                    <h3 class="font-bold text-gray-700 mb-3">📊 Top 5 palavras mais estudadas</h3>
                    <div class="bg-gray-50 rounded-lg p-3">
                        ${stats.palavrasMaisRepetidas
                          .slice(0, 5)
                          .map(
                            (p, i) => `
                            <div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                <span class="font-medium">${i + 1}. ${p.palavra}</span>
                                <span class="text-purple-600 font-bold">${p.vezes} vez${p.vezes !== 1 ? 'es' : ''}</span>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
                `
                    : ''
                }
                
                <!-- Tempo total de estudo -->
                <div class="bg-yellow-50 p-4 rounded-lg mb-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-sm text-yellow-800">⏱️ Tempo total de estudo</div>
                            <div class="text-2xl font-bold text-yellow-800">${stats.tempoTotal?.formatado || '0h 0min 0s'}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-yellow-800">📊 Média por sessão</div>
                            <div class="text-lg font-bold text-yellow-800">${stats.mediaPorSessao} itens</div>
                        </div>
                    </div>
                </div>
                
                <!-- Datas importantes -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <div class="text-xs text-gray-500">Primeiro estudo</div>
                        <div class="font-medium">${stats.primeiroEstudo ? new Date(stats.primeiroEstudo).toLocaleDateString('pt-BR') : '—'}</div>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <div class="text-xs text-gray-500">Último estudo</div>
                        <div class="font-medium">${stats.ultimoEstudo ? new Date(stats.ultimoEstudo).toLocaleDateString('pt-BR') : '—'}</div>
                    </div>
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <div class="text-xs text-gray-500">Última revisão</div>
                        <div class="font-medium">${stats.ultimaRevisao ? new Date(stats.ultimaRevisao).toLocaleDateString('pt-BR') : '—'}</div>
                    </div>
                </div>
                
                <!-- Histórico de arquivos revisados -->
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-bold text-gray-700">📋 Últimos arquivos revisados (10)</h3>
                    </div>
                    <div class="bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                        ${
                          stats.ultimosArquivosRevisados &&
                          stats.ultimosArquivosRevisados.length > 0
                            ? `
                            <table class="w-full text-sm">
                                <thead class="sticky top-0 bg-gray-100">
                                    <tr>
                                        <th class="text-left p-2">Data</th>
                                        <th class="text-left p-2">Arquivo</th>
                                        <th class="text-center p-2">Itens</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${stats.ultimosArquivosRevisados
                                      .map(
                                        (arquivo) => `
                                        <tr class="border-b border-gray-200 hover:bg-gray-100">
                                            <td class="p-2">${new Date(arquivo.data).toLocaleDateString('pt-BR')} ${new Date(arquivo.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td class="p-2">
                                                <span class="px-2 py-1 rounded text-xs ${arquivo.tipo === 'palavras' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                                                    ${arquivo.tipo === 'palavras' ? '📖 Palavras' : '💬 Frases'}
                                                </span>
                                                <span class="ml-2 text-gray-600">${arquivo.nome.substring(0, 30)}...</span>
                                            </td>
                                            <td class="text-center p-2 font-medium">${arquivo.quantidade}</td>
                                        </tr>
                                    `
                                      )
                                      .join('')}
                                </tbody>
                            </table>
                        `
                            : `
                            <div class="text-center text-gray-500 py-4">
                                📭 Nenhum arquivo revisado ainda.
                                <br>Use "Verificar Estudo" para analisar PDFs!
                            </div>
                        `
                        }
                    </div>
                </div>
                
                <!-- Histórico de arquivos exportados -->
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-bold text-gray-700">📑 Últimos arquivos exportados (10)</h3>
                    </div>
                    <div class="bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                        ${
                          stats.ultimosArquivosExportados &&
                          stats.ultimosArquivosExportados.length > 0
                            ? `
                            <table class="w-full text-sm">
                                <thead class="sticky top-0 bg-gray-100">
                                    <tr>
                                        <th class="text-left p-2">Data</th>
                                        <th class="text-left p-2">Arquivo</th>
                                        <th class="text-center p-2">Itens</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${stats.ultimosArquivosExportados
                                      .map(
                                        (arquivo) => `
                                        <tr class="border-b border-gray-200 hover:bg-gray-100">
                                            <td class="p-2">${new Date(arquivo.data).toLocaleDateString('pt-BR')} ${new Date(arquivo.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td class="p-2">
                                                <span class="px-2 py-1 rounded text-xs ${arquivo.tipo === 'palavras' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                                                    ${arquivo.tipo === 'palavras' ? '📖 Palavras' : '💬 Frases'}
                                                </span>
                                                <span class="ml-2 text-gray-600">${arquivo.nome.substring(0, 30)}...</span>
                                            </td>
                                            <td class="text-center p-2 font-medium">${arquivo.quantidade}</td>
                                        </tr>
                                    `
                                      )
                                      .join('')}
                                </tbody>
                            </table>
                        `
                            : `
                            <div class="text-center text-gray-500 py-4">
                                📭 Nenhum arquivo exportado ainda.
                                <br>Complete um estudo e exporte PDF!
                            </div>
                        `
                        }
                    </div>
                </div>
                
                <!-- Histórico de sessões de estudo -->
                <div class="mb-6">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="font-bold text-gray-700">📋 Histórico de sessões (últimas 20)</h3>
                        <button id="btnExportarHistorico" class="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition">
                            💾 Exportar JSON
                        </button>
                    </div>
                    <div class="bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                        ${
                          stats.ultimasSessoes.length > 0
                            ? `
                            <table class="w-full text-sm">
                                <thead class="sticky top-0 bg-gray-100">
                                    <tr>
                                        <th class="text-left p-2">Data</th>
                                        <th class="text-left p-2">Tipo</th>
                                        <th class="text-center p-2">Quantidade</th>
                                        <th class="text-center p-2">Tempo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${stats.ultimasSessoes
                                      .map(
                                        (sessao) => `
                                        <tr class="border-b border-gray-200 hover:bg-gray-100">
                                            <td class="p-2">${new Date(sessao.data).toLocaleDateString('pt-BR')} ${new Date(sessao.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td class="p-2">
                                                <span class="px-2 py-1 rounded text-xs ${sessao.tipo === 'palavras' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                                                    ${sessao.tipo === 'palavras' ? '📖 Palavras' : '💬 Frases'}
                                                </span>
                                            </td>
                                            <td class="text-center p-2 font-medium">${sessao.quantidade}</td>
                                            <td class="text-center p-2">${Math.floor(sessao.tempo / 60)}min ${sessao.tempo % 60}s} ）
                                    </tr>
                                    `
                                      )
                                      .join('')}
                                </tbody>
                            </table>
                        `
                            : `
                            <div class="text-center text-gray-500 py-8">
                                📭 Nenhuma sessão de estudo registrada ainda.
                                <br>Complete um estudo para ver seu progresso!
                            </div>
                        `
                        }
                    </div>
                </div>
                
                <!-- Botões de ação -->
                <div class="flex flex-wrap gap-4 justify-center">
                    <button id="btnExportarJSON" class="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition">
                        📤 Exportar Progresso (JSON)
                    </button>
                    <button id="btnImportarJSON" class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition">
                        📥 Importar Progresso (JSON)
                    </button>
                    <button id="btnReiniciar" class="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition">
                        🗑️ Reiniciar Progresso
                    </button>
                    <button id="btnVoltar" class="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition">
                        ← Voltar ao Menu
                    </button>
                </div>
            </div>
        `;

    this.configurarEventos();
  }

  configurarEventos() {
    document.getElementById('btnExportarJSON')?.addEventListener('click', () => {
      this.progressService.exportarParaArquivo();
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.success('Progresso exportado com sucesso!');
      } else {
        alert('✅ Progresso exportado com sucesso!');
      }
    });

    document.getElementById('btnImportarJSON')?.addEventListener('click', () => {
      this.importarProgresso();
    });

    document.getElementById('btnReiniciar')?.addEventListener('click', () => {
      if (this.progressService.reiniciar()) {
        if (typeof ErrorHandler !== 'undefined') {
          ErrorHandler.success('Progresso reiniciado com sucesso!');
        } else {
          alert('✅ Progresso reiniciado com sucesso!');
        }
        this.renderizar();
      }
    });

    document.getElementById('btnVoltar')?.addEventListener('click', () => {
      if (typeof renderizarMenu === 'function') {
        renderizarMenu();
      }
    });

    document.getElementById('btnExportarHistorico')?.addEventListener('click', () => {
      this.progressService.exportarParaArquivo();
      if (typeof ErrorHandler !== 'undefined') {
        ErrorHandler.success('Histórico exportado com sucesso!');
      } else {
        alert('✅ Histórico exportado com sucesso!');
      }
    });
  }

  importarProgresso() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const arquivo = e.target.files[0];
      if (arquivo) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const resultado = this.progressService.importarDeJSON(event.target.result);
          if (typeof ErrorHandler !== 'undefined') {
            if (resultado.sucesso) {
              ErrorHandler.success(resultado.mensagem);
            } else {
              ErrorHandler.error(resultado.mensagem);
            }
          } else {
            alert(resultado.mensagem);
          }
          if (resultado.sucesso) {
            this.renderizar();
          }
        };
        reader.readAsText(arquivo, 'UTF-8');
      }
    };
    input.click();
  }
}
