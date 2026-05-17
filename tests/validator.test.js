/**
 * tests/validator.test.js
 * Testes para o ValidatorService
 */

const ValidatorService = {
  isItemValido(item) {
    if (!item || typeof item !== 'string') return false;

    const itemLower = item.toLowerCase().trim();

    const padroesInvalidos = [
      'minhas frases estudadas',
      'minhas palavras estudadas',
      'data:',
      'total de frases',
      'total de palavras',
      'tempo por frase',
      'tempo por palavra',
      'página',
      'tempo total',
      'minutos',
      'segundos',
    ];

    for (const padrao of padroesInvalidos) {
      if (itemLower.includes(padrao)) {
        return false;
      }
    }

    if (/^\d+$/.test(item.trim())) return false;
    if (item.length < 5) return false;

    return true;
  },

  filtrarValidos(itens) {
    return itens.filter((item) => this.isItemValido(item));
  },
};

describe('ValidatorService', () => {
  describe('isItemValido()', () => {
    test('deve retornar true para palavra válida com 5+ letras', () => {
      expect(ValidatorService.isItemValido('carro')).toBe(true);
      expect(ValidatorService.isItemValido('programação')).toBe(true);
      expect(ValidatorService.isItemValido('JavaScript')).toBe(true);
      expect(ValidatorService.isItemValido('escola')).toBe(true);
    });

    test('deve retornar false para palavra muito curta (menos de 5 letras)', () => {
      expect(ValidatorService.isItemValido('casa')).toBe(false); // 4 letras
      expect(ValidatorService.isItemValido('cão')).toBe(false);
      expect(ValidatorService.isItemValido('sol')).toBe(false);
      expect(ValidatorService.isItemValido('mar')).toBe(false);
    });

    test('deve retornar false para item vazio', () => {
      expect(ValidatorService.isItemValido('')).toBe(false);
      expect(ValidatorService.isItemValido(null)).toBe(false);
      expect(ValidatorService.isItemValido(undefined)).toBe(false);
    });

    test('deve retornar false para metadados', () => {
      expect(ValidatorService.isItemValido('Minhas palavras estudadas')).toBe(false);
      expect(ValidatorService.isItemValido('Data: 17/05/2026')).toBe(false);
      expect(ValidatorService.isItemValido('Total de frases: 10')).toBe(false);
      expect(ValidatorService.isItemValido('Tempo por palavra: 2 segundos')).toBe(false);
      expect(ValidatorService.isItemValido('Página 1')).toBe(false);
    });

    test('deve retornar false para números isolados', () => {
      expect(ValidatorService.isItemValido('123')).toBe(false);
      expect(ValidatorService.isItemValido('1')).toBe(false);
      expect(ValidatorService.isItemValido('0')).toBe(false);
    });
  });

  describe('filtrarValidos()', () => {
    test('deve remover itens inválidos da lista (palavras com menos de 5 letras)', () => {
      const itens = [
        'carro', // 5 letras ✅
        'casa', // 4 letras ❌
        'programação', // 11 letras ✅
        'sol', // 3 letras ❌
        'JavaScript', // 10 letras ✅
        'Minhas palavras estudadas', // metadado ❌
        'escola', // 6 letras ✅
      ];

      const resultado = ValidatorService.filtrarValidos(itens);

      expect(resultado).toEqual(['carro', 'programação', 'JavaScript', 'escola']);
      expect(resultado.length).toBe(4);
    });

    test('deve retornar array vazio se todos são inválidos', () => {
      const itens = ['casa', 'sol', 'mar', 'Data: 17/05/2026', '123'];

      const resultado = ValidatorService.filtrarValidos(itens);

      expect(resultado).toEqual([]);
    });
  });
});
