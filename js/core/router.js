/**
 * Roteador simples baseado no hash da URL (#/palavras, #/texto...).
 *
 * Cada tela é um objeto com `montar(raiz)` e, opcionalmente, `desmontar()`
 * (para parar áudio e timers) e `podeSair()` (para perguntar antes de sair,
 * por exemplo, se há progresso não salvo). O botão "voltar" do navegador
 * funciona normalmente.
 */

export function criarRouter({ raiz, rotas, aoNavegar = () => {} }) {
  let telaAtual = null;
  let rotaAtual = null;
  let rotaEmTroca = null;
  let parametrosPendentes = null;
  let ignorarProximo = false;

  function lerRota() {
    const rota = location.hash.replace(/^#\/?/, '').split('?')[0];
    return rotas[rota] ? rota : '';
  }

  async function trocar(rota) {
    rotaEmTroca = rota;
    try {
      if (telaAtual?.podeSair && !(await telaAtual.podeSair())) {
        ignorarProximo = true;
        location.hash = `#/${rotaAtual}`;
        return;
      }
    } finally {
      rotaEmTroca = null;
    }
    telaAtual?.desmontar?.();
    const parametros = parametrosPendentes || {};
    parametrosPendentes = null;
    rotaAtual = rota;
    telaAtual = rotas[rota](parametros);
    raiz.replaceChildren();
    raiz.scrollIntoView?.({ block: 'start' });
    window.scrollTo?.({ top: 0 });
    telaAtual.montar(raiz);
    aoNavegar(rota);
  }

  window.addEventListener('hashchange', () => {
    if (ignorarProximo) {
      ignorarProximo = false;
      return;
    }
    // Ignora eventos repetidos para a rota já exibida ou que já está sendo aberta.
    const rota = lerRota();
    if (rota === rotaAtual || rota === rotaEmTroca) return;
    trocar(rota);
  });

  return {
    iniciar() {
      return trocar(lerRota());
    },
    /** Navega para uma rota, opcionalmente passando dados para a próxima tela. */
    navegar(rota, parametros) {
      parametrosPendentes = parametros || null;
      const destino = `#/${rota}`;
      if (location.hash === destino || (rota === '' && !location.hash)) {
        trocar(rota);
      } else {
        location.hash = destino;
      }
    },
    get rotaAtual() {
      return rotaAtual;
    },
  };
}
