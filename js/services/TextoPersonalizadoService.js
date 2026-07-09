(function (root, factory) {
  const service = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = service;
  }

  if (typeof root !== 'undefined') {
    root.TextoPersonalizadoService = service;
    root.criarConteudoPadrao = service.criarConteudoPadrao;
    root.extrairTextoImportado = service.extrairTextoImportado;
    root.extrairMetadados = service.extrairMetadados;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TextoPersonalizadoService = {
    criarConteudoPadrao({
      titulo,
      texto,
      idioma = 'pt-BR',
      tipo = 'texto-personalizado',
      criadoEm = new Date().toISOString(),
    }) {
      const tituloLimpo =
        (titulo || 'Texto personalizado').toString().trim() || 'Texto personalizado';
      const textoLimpo = (texto || '').toString().trim();

      return [
        '=== TEXTO PERSONALIZADO ===',
        `TITULO: ${tituloLimpo}`,
        `IDIOMA: ${idioma}`,
        `TIPO: ${tipo}`,
        `CRIADO_EM: ${criadoEm}`,
        '=== CONTEUDO ===',
        textoLimpo,
        '=== FIM CONTEUDO ===',
      ].join('\n');
    },

    extrairTextoImportado(conteudo) {
      if (!conteudo) return '';

      const texto = String(conteudo).replace(/\r/g, '').trim();
      const marcadorInicio = '=== CONTEUDO ===';
      const marcadorFim = '=== FIM CONTEUDO ===';

      const inicio = texto.indexOf(marcadorInicio);
      const fim = texto.indexOf(marcadorFim);

      if (inicio !== -1) {
        const trecho = texto.slice(inicio + marcadorInicio.length);
        if (fim !== -1 && fim > inicio) {
          return trecho.slice(0, fim - (inicio + marcadorInicio.length)).trim();
        }
        return trecho.trim();
      }

      return texto;
    },

    extrairMetadados(conteudo) {
      if (!conteudo) {
        return { titulo: 'Texto personalizado', idioma: 'pt-BR', tipo: 'texto-personalizado' };
      }

      const texto = String(conteudo).replace(/\r/g, '');
      const extrairCampo = (campo) => {
        const regex = new RegExp(`^${campo}: (.*)$`, 'm');
        const match = texto.match(regex);
        return match ? match[1].trim() : '';
      };

      return {
        titulo: extrairCampo('TITULO') || 'Texto personalizado',
        idioma: extrairCampo('IDIOMA') || 'pt-BR',
        tipo: extrairCampo('TIPO') || 'texto-personalizado',
        criadoEm: extrairCampo('CRIADO_EM') || '',
      };
    },
  };

  return TextoPersonalizadoService;
});
