/**
 * ProgressoUI.js
 * Interface para exibição do progresso do usuário
 * Componentes visuais reutilizáveis
 */

const ProgressoUI = {
  /**
   * Renderiza um card de estatística
   * @param {string} titulo - Título do card
   * @param {string|number} valor - Valor a ser exibido
   * @param {string} cor - Classe de cor (purple, blue, green, teal, yellow)
   * @param {string} icone - Emoji ou ícone
   * @returns {string} HTML do card
   */
  renderizarCard(titulo, valor, cor = 'purple', icone = '📊') {
    const cores = {
      purple: 'bg-purple-100 text-purple-600',
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      teal: 'bg-teal-100 text-teal-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      red: 'bg-red-100 text-red-600',
    };

    const corClasse = cores[cor] || cores.purple;

    return `
            <div class="${corClasse} rounded-lg p-4 text-center">
                <div class="text-2xl mb-1">${icone}</div>
                <div class="text-3xl font-bold">${valor}</div>
                <div class="text-sm mt-1">${titulo}</div>
            </div>
        `;
  },

  /**
   * Renderiza a barra de progresso
   * @param {number} atual - Valor atual
   * @param {number} total - Valor máximo
   * @param {string} label - Rótulo
   * @returns {string} HTML da barra de progresso
   */
  renderizarBarraProgresso(atual, total, label) {
    const percentual = total > 0 ? ((atual / total) * 100).toFixed(1) : 0;

    return `
            <div class="mb-4">
                <div class="flex justify-between text-sm mb-1">
                    <span>${label}</span>
                    <span>${atual} / ${total} (${percentual}%)</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-purple-600 h-2.5 rounded-full" style="width: ${percentual}%"></div>
                </div>
            </div>
        `;
  },

  /**
   * Renderiza a tabela de histórico de sessões
   * @param {Array} sessoes - Lista de sessões
   * @returns {string} HTML da tabela
   */
  renderizarTabelaHistorico(sessoes) {
    if (!sessoes || sessoes.length === 0) {
      return `
                <div class="text-center text-gray-500 py-8">
                    📭 Nenhuma sessão de estudo registrada ainda.
                    <br>Complete um estudo para ver seu progresso!
                </div>
            `;
    }

    return `
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
                    ${sessoes
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
                            <td class="text-center p-2">${Math.floor(sessao.tempo / 60)}min ${sessao.tempo % 60}s</td>
                        </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>
        `;
  },

  /**
   * Renderiza o resumo de tempo de estudo
   * @param {Object} tempo - Objeto com informações de tempo
   * @param {number} mediaPorSessao - Média de itens por sessão
   * @returns {string} HTML do resumo de tempo
   */
  renderizarResumoTempo(tempo, mediaPorSessao) {
    return `
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-sm text-yellow-800">⏱️ Tempo total de estudo</div>
                    <div class="text-2xl font-bold text-yellow-800">${tempo.formatado}</div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-yellow-800">📊 Média por sessão</div>
                    <div class="text-lg font-bold text-yellow-800">${mediaPorSessao} itens</div>
                </div>
            </div>
        `;
  },

  /**
   * Renderiza as datas importantes
   * @param {string} primeiroEstudo - Data do primeiro estudo
   * @param {string} ultimoEstudo - Data do último estudo
   * @returns {string} HTML das datas
   */
  renderizarDatas(primeiroEstudo, ultimoEstudo) {
    return `
            <div class="bg-gray-50 p-3 rounded-lg">
                <div class="text-xs text-gray-500">Primeiro estudo</div>
                <div class="font-medium">${primeiroEstudo ? new Date(primeiroEstudo).toLocaleDateString('pt-BR') : '—'}</div>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg">
                <div class="text-xs text-gray-500">Último estudo</div>
                <div class="font-medium">${ultimoEstudo ? new Date(ultimoEstudo).toLocaleDateString('pt-BR') : '—'}</div>
            </div>
        `;
  },

  /**
   * Renderiza os botões de ação
   * @returns {string} HTML dos botões
   */
  renderizarBotoesAcao() {
    return `
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
        `;
  },

  /**
   * Renderiza o cabeçalho da página de progresso
   * @returns {string} HTML do cabeçalho
   */
  renderizarCabecalho() {
    return `
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">📈 Meu Progresso</h2>
            </div>
        `;
  },

  /**
   * Mostra uma mensagem de loading
   * @returns {string} HTML de loading
   */
  renderizarLoading() {
    return `
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <div class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <p class="mt-4 text-gray-600">Carregando estatísticas...</p>
                </div>
            </div>
        `;
  },

  /**
   * Mostra uma mensagem de erro
   * @param {string} mensagem - Mensagem de erro
   * @returns {string} HTML de erro
   */
  renderizarErro(mensagem) {
    return `
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">❌</div>
                    <p class="text-red-600">${mensagem}</p>
                    <button id="btnTentarNovamente" class="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition">
                        Tentar novamente
                    </button>
                </div>
            </div>
        `;
  },
};
