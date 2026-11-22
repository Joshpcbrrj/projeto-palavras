const CHAVES_ANTIGAS = ['ap_preferencias', 'progresso_estudo', 'ap_rascunho_texto'];

/** Remove dados pessoais gravados por versões anteriores deste app. */
export function limparPersistenciaLegada() {
  try {
    const armazenamento = globalThis.localStorage;
    CHAVES_ANTIGAS.forEach((chave) => armazenamento?.removeItem(chave));
  } catch (erro) {
    console.warn('Não foi possível limpar os dados locais antigos:', erro);
  }
}
