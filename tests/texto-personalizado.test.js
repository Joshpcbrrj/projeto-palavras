const {
  criarConteudoPadrao,
  extrairTextoImportado,
} = require('../js/services/TextoPersonalizadoService.js');

describe('TextoPersonalizadoService', () => {
  test('deve criar um conteúdo padronizado para exportação em PDF', () => {
    const resultado = criarConteudoPadrao({
      titulo: 'Texto de estudo',
      texto: 'Hello world',
      idioma: 'en-US',
      tipo: 'texto-personalizado',
    });

    expect(resultado).toContain('=== TEXTO PERSONALIZADO ===');
    expect(resultado).toContain('IDIOMA: en-US');
    expect(resultado).toContain('Hello world');
  });

  test('deve extrair o texto real do conteúdo padronizado', () => {
    const entrada = `=== TEXTO PERSONALIZADO ===\nIDIOMA: pt-BR\n=== CONTEUDO ===\nOlá mundo`;

    expect(extrairTextoImportado(entrada)).toBe('Olá mundo');
  });
});
