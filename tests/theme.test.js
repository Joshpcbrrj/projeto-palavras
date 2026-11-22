import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { aplicarTemaEscolhido, iniciarTema, temaAtual } from '../js/ui/theme.js';
import { settings } from '../js/services/settings.js';

let mediaQuery;

beforeEach(() => {
  settings._resetar();
  document.body.innerHTML = '<meta name="theme-color" content=""><button id="btnTema"></button>';
  mediaQuery = {
    matches: true,
    addEventListener: vi.fn(),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQuery)
  );
});

afterEach(() => {
  settings._resetar();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('tema visual', () => {
  test('segue o tema do sistema e atualiza controles e cor do navegador', () => {
    expect(temaAtual()).toBe('dark');
    iniciarTema();

    const botao = document.getElementById('btnTema');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.querySelector('meta[name="theme-color"]').content).toBe('#0f172a');
    expect(botao.getAttribute('aria-pressed')).toBe('true');
    expect(botao.getAttribute('aria-label')).toBe('Ativar modo claro');

    mediaQuery.addEventListener.mock.calls[0][1]();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  test('preferência manual persiste apenas na sessão e o botão alterna o tema', () => {
    mediaQuery.matches = false;
    iniciarTema();
    aplicarTemaEscolhido('dark');
    expect(settings.get('tema')).toBe('dark');

    mediaQuery.addEventListener.mock.calls[0][1]();
    expect(document.documentElement.dataset.theme).toBe('dark');

    document.getElementById('btnTema').click();
    expect(temaAtual()).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.getElementById('btnTema').getAttribute('aria-pressed')).toBe('false');
  });

  test('valor inválido limpa a preferência e retoma o tema do sistema', () => {
    mediaQuery.matches = true;
    aplicarTemaEscolhido('automatico');
    expect(settings.get('tema')).toBeNull();
    expect(temaAtual()).toBe('dark');
  });
});
