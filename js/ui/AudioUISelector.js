/**
 * AudioUISelector.js
 * Interface do seletor de idioma para áudio
 */

const AudioUISelector = {
  /**
   * Renderiza o seletor de idioma
   */
  renderizarSeletor() {
    if (typeof AudioIdiomas === 'undefined') {
      console.warn('AudioIdiomas não disponível');
      return '<p class="text-gray-500">Carregando idiomas...</p>';
    }

    const idiomas = AudioIdiomas.idiomas;
    const idiomaAtual = AudioIdiomas.idiomaAtual;
    const idiomasArray = Object.entries(idiomas);

    return `
            <div class="audio-selector mb-4">
                <label class="block text-gray-700 font-bold mb-2">🌐 Idioma da pronúncia:</label>
                <div class="flex flex-wrap gap-2">
                    ${idiomasArray
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
                      .join('')}
                </div>
            </div>
        `;
  },

  /**
   * Conecta os eventos do seletor de idioma
   */
  conectarEventosSeletor() {
    if (typeof AudioIdiomas === 'undefined') {
      console.warn('AudioIdiomas não disponível');
      return;
    }

    document.querySelectorAll('.idioma-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idioma = btn.dataset.idioma;
        AudioIdiomas.salvarIdioma(idioma);

        // Atualiza UI dos botões
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

        // Feedback visual com a bandeira do idioma selecionado
        const info = AudioIdiomas.idiomas[idioma];
        if (info && AudioPlayer && AudioPlayer.falar) {
          AudioPlayer.falar(`Idioma alterado para ${info.nome}`);
        }
      });
    });
  },
};
