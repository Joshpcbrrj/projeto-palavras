/**
 * tests/errorhandler.test.js
 * Testes para o ErrorHandler
 */

// Mock do Toast
global.Toast = {
  show: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
};

const ErrorHandler = {
  show(message, type = 'error') {
    console.error(`[${type.toUpperCase()}]`, message);

    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show(message, type);
    } else {
      const prefix = type === 'error' ? '❌ ' : type === 'success' ? '✅ ' : '⚠️ ';
      console.log(prefix + message);
    }
  },

  log(error, context) {
    console.error(`[${context}]`, error.message || error);
    if (error.stack) {
      console.debug(error.stack);
    }
  },

  success(message) {
    this.show(message, 'success');
  },

  warning(message) {
    this.show(message, 'warning');
  },

  info(message) {
    this.show(message, 'info');
  },

  wrap(fn, context) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.log(error, context);
        this.show(`Erro: ${error.message}`);
        return null;
      }
    };
  },
};

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    console.log = jest.fn();
    console.debug = jest.fn();
  });

  describe('show()', () => {
    test('deve mostrar mensagem de erro', () => {
      ErrorHandler.show('Mensagem de erro');

      expect(console.error).toHaveBeenCalledWith('[ERROR]', 'Mensagem de erro');
    });

    test('deve mostrar mensagem de sucesso', () => {
      ErrorHandler.success('Operação concluída');

      expect(console.error).toHaveBeenCalledWith('[SUCCESS]', 'Operação concluída');
    });

    test('deve mostrar mensagem de aviso', () => {
      ErrorHandler.warning('Cuidado!');

      expect(console.error).toHaveBeenCalledWith('[WARNING]', 'Cuidado!');
    });

    test('deve mostrar mensagem informativa', () => {
      ErrorHandler.info('Informação importante');

      expect(console.error).toHaveBeenCalledWith('[INFO]', 'Informação importante');
    });

    test('deve usar Toast.show se disponível', () => {
      ErrorHandler.show('Mensagem com toast', 'error');

      expect(Toast.show).toHaveBeenCalledWith('Mensagem com toast', 'error');
    });
  });

  describe('log()', () => {
    test('deve logar um erro com contexto', () => {
      const error = new Error('Falha na conexão');
      ErrorHandler.log(error, 'DatabaseModule');

      expect(console.error).toHaveBeenCalledWith('[DatabaseModule]', 'Falha na conexão');
    });

    test('deve logar uma string de erro', () => {
      ErrorHandler.log('Erro simples', 'AuthModule');

      expect(console.error).toHaveBeenCalledWith('[AuthModule]', 'Erro simples');
    });

    test('deve logar o stack trace se disponível', () => {
      const error = new Error('Erro com stack');
      error.stack = 'stack trace aqui';
      ErrorHandler.log(error, 'TestModule');

      expect(console.debug).toHaveBeenCalledWith('stack trace aqui');
    });
  });

  describe('wrap()', () => {
    test('deve executar função com sucesso', async () => {
      const fn = jest.fn().mockResolvedValue('resultado');
      const wrapped = ErrorHandler.wrap(fn, 'TestContext');

      const resultado = await wrapped();

      expect(fn).toHaveBeenCalled();
      expect(resultado).toBe('resultado');
    });

    test('deve capturar erro e retornar null', async () => {
      const error = new Error('Falha na execução');
      const fn = jest.fn().mockRejectedValue(error);
      const wrapped = ErrorHandler.wrap(fn, 'TestContext');

      const resultado = await wrapped();

      expect(resultado).toBe(null);
      expect(console.error).toHaveBeenCalled();
    });

    test('deve passar os argumentos corretamente', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      const wrapped = ErrorHandler.wrap(fn, 'TestContext');

      await wrapped('arg1', 'arg2', 123);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });
  });
});
