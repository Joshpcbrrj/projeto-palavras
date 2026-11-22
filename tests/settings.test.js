import { beforeEach, describe, expect, test } from 'vitest';
import { settings } from '../js/services/settings.js';

beforeEach(() => {
  localStorage.clear();
  settings._resetar();
});

describe('preferências temporárias da sessão', () => {
  test('usa valores padrão', () => {
    const prefs = settings.carregar();
    expect(prefs).toMatchObject({ tema: null, audioAutomatico: true, repeticoes: 1 });
    expect(settings.getTempo('palavras')).toBe(2);
    expect(settings.getTempo('frases')).toBe(3);
  });

  test('mantém alterações durante a página, mas começa de novo após recarregar', () => {
    settings.set('velocidadeFala', 1.2);
    settings.setVoz('en-US', 'voz-1');
    settings.setTempo('frases', 4);
    expect(localStorage.length).toBe(0);

    settings._resetar();
    expect(settings.get('velocidadeFala')).toBe(0.9);
    expect(settings.getVoz('en-US')).toBeNull();
    expect(settings.getTempo('frases')).toBe(3);
  });

  test('define e remove a voz preferida em memória', () => {
    settings.setVoz('en-US', 'voz-1');
    expect(settings.getVoz('en-US')).toBe('voz-1');
    settings.setVoz('en-US', null);
    expect(settings.getVoz('en-US')).toBeNull();
  });

  test('notifica ouvintes', () => {
    const mudancas = [];
    settings.aoMudar((chave, valor) => mudancas.push([chave, valor]));
    settings.set('tema', 'light');
    expect(mudancas).toEqual([['tema', 'light']]);
  });
});
