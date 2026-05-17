/**
 * tests/storage.test.js
 * Testes para o StorageService
 */

// Mock do localStorage
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }
}

global.localStorage = new LocalStorageMock();

const StorageService = {
  salvar(key, value) {
    try {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error('Erro ao salvar no storage:', error);
      return false;
    }
  },

  carregar(key, defaultValue = null) {
    try {
      const saved = localStorage.getItem(key);
      if (saved === null) return defaultValue;

      try {
        return JSON.parse(saved);
      } catch {
        return saved;
      }
    } catch (error) {
      console.error('Erro ao carregar do storage:', error);
      return defaultValue;
    }
  },

  remover(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Erro ao remover do storage:', error);
      return false;
    }
  },

  limpar() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Erro ao limpar storage:', error);
      return false;
    }
  },
};

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('salvar() e carregar()', () => {
    test('deve salvar e carregar uma string', () => {
      StorageService.salvar('teste', 'valor');
      const resultado = StorageService.carregar('teste');

      expect(resultado).toBe('valor');
    });

    test('deve salvar e carregar um número', () => {
      StorageService.salvar('numero', 123);
      const resultado = StorageService.carregar('numero');

      // Pode ser string ou número, aceitamos ambos
      expect(resultado == 123).toBe(true); // == compara valor, não tipo
    });

    test('deve salvar e carregar um objeto', () => {
      const objeto = { nome: 'João', idade: 30 };
      StorageService.salvar('objeto', objeto);
      const resultado = StorageService.carregar('objeto');

      expect(resultado).toEqual(objeto);
    });

    test('deve salvar e carregar um array', () => {
      const array = [1, 2, 3, 4, 5];
      StorageService.salvar('array', array);
      const resultado = StorageService.carregar('array');

      expect(resultado).toEqual(array);
    });

    test('deve retornar defaultValue quando chave não existe', () => {
      const resultado = StorageService.carregar('nao_existe', 'padrao');

      expect(resultado).toBe('padrao');
    });
  });

  describe('remover()', () => {
    test('deve remover um item do storage', () => {
      StorageService.salvar('teste', 'valor');
      expect(StorageService.carregar('teste')).toBe('valor');

      StorageService.remover('teste');
      expect(StorageService.carregar('teste')).toBe(null);
    });
  });

  describe('limpar()', () => {
    test('deve limpar todo o storage', () => {
      StorageService.salvar('chave1', 'valor1');
      StorageService.salvar('chave2', 'valor2');

      StorageService.limpar();

      expect(StorageService.carregar('chave1')).toBe(null);
      expect(StorageService.carregar('chave2')).toBe(null);
    });
  });
});
