import { beforeEach, describe, expect, test } from 'vitest';
import { limparPersistenciaLegada } from '../js/services/storage.js';

beforeEach(() => localStorage.clear());

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
});
