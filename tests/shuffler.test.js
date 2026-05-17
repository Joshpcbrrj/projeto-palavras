/**
 * tests/shuffler.test.js
 * Testes para o ShufflerService
 */

const ShufflerService = {
  shuffle(itens) {
    const arr = [...itens];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  shuffledCopy(itens) {
    return this.shuffle(itens);
  },
};

describe('ShufflerService', () => {
  describe('shuffle()', () => {
    test('deve retornar array com o mesmo tamanho', () => {
      const original = [1, 2, 3, 4, 5];
      const resultado = ShufflerService.shuffle(original);

      expect(resultado.length).toBe(original.length);
    });

    test('deve conter os mesmos elementos', () => {
      const original = [1, 2, 3, 4, 5];
      const resultado = ShufflerService.shuffle(original);

      expect(resultado.sort()).toEqual(original.sort());
    });

    test('não deve modificar o array original', () => {
      const original = [1, 2, 3, 4, 5];
      const copia = [...original];

      ShufflerService.shuffle(original);

      expect(original).toEqual(copia);
    });

    test('deve retornar array vazio para entrada vazia', () => {
      expect(ShufflerService.shuffle([])).toEqual([]);
    });

    test('deve retornar array com um elemento para entrada de um elemento', () => {
      expect(ShufflerService.shuffle([1])).toEqual([1]);
    });
  });
});
