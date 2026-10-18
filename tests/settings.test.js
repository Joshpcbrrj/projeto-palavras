import { beforeEach, describe, expect, test } from 'vitest';
import { settings } from '../js/services/settings.js';

beforeEach(() => {
  localStorage.clear();
  settings._resetar();
});

describe('preferências', () => {
  test('usa valores padrão', () => {
    const prefs = settings.carregar();
    expect(prefs).toMatchObject({ tema: null, audioAutomatico: true, repeticoes: 1 });
    expect(settings.getTempo('palavras')).toBe(2);
    expect(settings.getTempo('frases')).toBe(3);
  });

  test('migra as chaves das versões anteriores', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('audioAutomatico', 'false');
    localStorage.setItem('audio_idioma', 'en-GB');
    const prefs = settings.carregar();
    expect(prefs).toMatchObject({ tema: 'dark', audioAutomatico: false, idioma: 'en-GB' });
  });

  test('salva alterações e voz por idioma', () => {
    settings.set('velocidadeFala', 1.2);
    settings.setVoz('en-US', 'voz-1');
    settings.setTempo('frases', 4);
    settings._resetar();
    expect(settings.get('velocidadeFala')).toBe(1.2);
    expect(settings.getVoz('en-US')).toBe('voz-1');
    expect(settings.getTempo('frases')).toBe(4);
    settings.setVoz('en-US', null);
    expect(settings.getVoz('en-US')).toBeNull();
  });

  test('ignora dados corrompidos ou inválidos', () => {
    localStorage.setItem('ap_preferencias', JSON.stringify({ idioma: 'xx', tema: 'roxo' }));
    expect(settings.carregar()).toMatchObject({ idioma: 'en-US', tema: null });
  });

  test('notifica ouvintes', () => {
    const mudancas = [];
    settings.aoMudar((chave, valor) => mudancas.push([chave, valor]));
    settings.set('tema', 'light');
    expect(mudancas).toEqual([['tema', 'light']]);
  });
});
