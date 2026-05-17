/**
 * tests/loadingmanager.test.js
 * Testes para o LoadingManager
 */

// Mock do DOM
document.body.innerHTML = `
    <button id="testButton">Clique aqui</button>
`;

const LoadingManager = {
  start(button, loadingText = '⏳ Carregando...') {
    if (!button) return null;

    const originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    button.classList.add('opacity-50', 'cursor-not-allowed');

    return originalText;
  },

  stop(button, originalText) {
    if (!button) return;

    button.textContent = originalText;
    button.disabled = false;
    button.classList.remove('opacity-50', 'cursor-not-allowed');
  },

  async execute(button, fn, loadingText = '⏳ Processando...') {
    const originalText = this.start(button, loadingText);
    try {
      return await fn();
    } finally {
      this.stop(button, originalText);
    }
  },
};

describe('LoadingManager', () => {
  let button;

  beforeEach(() => {
    button = document.getElementById('testButton');
    button.textContent = 'Clique aqui';
    button.disabled = false;
    button.classList.remove('opacity-50', 'cursor-not-allowed');
  });

  describe('start()', () => {
    test('deve alterar o texto do botão', () => {
      const original = LoadingManager.start(button, 'Carregando...');

      expect(button.textContent).toBe('Carregando...');
      expect(original).toBe('Clique aqui');
    });

    test('deve desabilitar o botão', () => {
      LoadingManager.start(button);

      expect(button.disabled).toBe(true);
    });

    test('deve adicionar classes de loading', () => {
      LoadingManager.start(button);

      expect(button.classList.contains('opacity-50')).toBe(true);
      expect(button.classList.contains('cursor-not-allowed')).toBe(true);
    });

    test('deve retornar null se botão não existe', () => {
      const resultado = LoadingManager.start(null);

      expect(resultado).toBe(null);
    });

    test('deve usar texto padrão se não especificado', () => {
      LoadingManager.start(button);

      expect(button.textContent).toBe('⏳ Carregando...');
    });
  });

  describe('stop()', () => {
    test('deve restaurar o texto original', () => {
      LoadingManager.start(button, 'Processando...');
      LoadingManager.stop(button, 'Clique aqui');

      expect(button.textContent).toBe('Clique aqui');
    });

    test('deve reabilitar o botão', () => {
      LoadingManager.start(button);
      LoadingManager.stop(button, 'Clique aqui');

      expect(button.disabled).toBe(false);
    });

    test('deve remover classes de loading', () => {
      LoadingManager.start(button);
      LoadingManager.stop(button, 'Clique aqui');

      expect(button.classList.contains('opacity-50')).toBe(false);
      expect(button.classList.contains('cursor-not-allowed')).toBe(false);
    });

    test('não deve fazer nada se botão não existe', () => {
      expect(() => LoadingManager.stop(null, 'texto')).not.toThrow();
    });
  });

  describe('execute()', () => {
    test('deve executar a função e restaurar o botão', async () => {
      const fn = jest.fn().mockResolvedValue('resultado');

      const resultado = await LoadingManager.execute(button, fn, 'Processando...');

      expect(button.textContent).toBe('Clique aqui');
      expect(button.disabled).toBe(false);
      expect(resultado).toBe('resultado');
    });

    test('deve restaurar o botão mesmo se a função falhar', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Falha'));

      await expect(LoadingManager.execute(button, fn)).rejects.toThrow();

      expect(button.textContent).toBe('Clique aqui');
      expect(button.disabled).toBe(false);
    });

    test('deve passar o loadingText correto', async () => {
      const fn = jest.fn().mockResolvedValue('ok');

      await LoadingManager.execute(button, fn, 'Custom loading...');

      expect(button.textContent).toHaveBeenCalled;
    });
  });
});
