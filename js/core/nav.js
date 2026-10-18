/**
 * Ponto único de navegação entre telas (preenchido em main.js).
 * Evita dependências circulares entre as telas e o roteador.
 */

export const ROTAS = Object.freeze({
  MENU: '',
  PALAVRAS: 'palavras',
  FRASES: 'frases',
  TEXTO: 'texto',
  REVISAR: 'revisar',
  PROGRESSO: 'progresso',
  CRIAR: 'criar',
  CONFIGURACOES: 'configuracoes',
});

let navegador = () => {};

export function definirNavegador(fn) {
  navegador = fn;
}

/** @param {string} rota @param {object} [parametros] dados entregues à próxima tela */
export function navegar(rota, parametros) {
  navegador(rota, parametros);
}
