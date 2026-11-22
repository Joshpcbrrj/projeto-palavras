import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { limparPersistenciaLegada } from '../js/services/storage.js';

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('limpeza dos dados de versões anteriores', () => {
  test('remove somente as chaves próprias do app', () => {
    localStorage.setItem('ap_preferencias', '{"tema":"dark"}');
    localStorage.setItem('progresso_estudo', '{"sessoes":[]}');
    localStorage.setItem('ap_rascunho_texto', '{"texto":"privado"}');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('audio_idioma', 'en-US');

    limparPersistenciaLegada();

    expect(localStorage.getItem('ap_preferencias')).toBeNull();
    expect(localStorage.getItem('progresso_estudo')).toBeNull();
    expect(localStorage.getItem('ap_rascunho_texto')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('audio_idioma')).toBe('en-US');
  });

  test('avisa se o navegador bloquear o armazenamento local', () => {
    const erro = new Error('bloqueado');
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('localStorage', {
      removeItem: vi.fn(() => {
        throw erro;
      }),
    });

    expect(() => limparPersistenciaLegada()).not.toThrow();
    expect(aviso).toHaveBeenCalledWith('Não foi possível limpar os dados locais antigos:', erro);
  });
});
