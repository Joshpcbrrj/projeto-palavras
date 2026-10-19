/**
 * Passo a passo da chave do Gemini e o painel da IA.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { GeminiMotor } from '../js/create/gemini.js';
import { settings } from '../js/services/settings.js';
import { montarPainelIA } from '../js/ui/aiPanel.js';
import { extrairChave } from '../js/ui/guiaChave.js';

const CHAVE = `AIza${'A1b2C3d4E5'.repeat(3)}_-x9z`; // 39 caracteres

describe('extrairChave', () => {
  test('aceita a chave pura e tira sobras comuns ao colar', () => {
    expect(CHAVE).toHaveLength(39);
    expect(extrairChave(CHAVE)).toEqual({ chave: CHAVE, erro: '' });
    expect(extrairChave(`  "${CHAVE}"  `).chave).toBe(CHAVE);
    expect(extrairChave(`GEMINI_API_KEY=${CHAVE}`).chave).toBe(CHAVE);
  });

  test('explica o problema quando o texto não parece uma chave', () => {
    expect(extrairChave('').erro).toMatch(/Cole a chave/);
    expect(extrairChave('minha chave').erro).toMatch(/AIza/);
  });
});

describe('painel da IA', () => {
  let container;
  beforeEach(() => {
    localStorage.clear();
    settings._resetar();
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    container.remove();
  });

  test('sem chave, mostra o passo a passo aberto com os 4 passos e o link do AI Studio', () => {
    montarPainelIA(container);
    const guia = container.querySelector('.guia-chave');
    expect(guia.open).toBe(true);
    expect(container.querySelectorAll('.guia-passo')).toHaveLength(4);
    expect(container.querySelector('a[href^="https://aistudio.google.com"]')).not.toBeNull();
  });

  test('texto inválido mostra o erro junto do campo, sem chamar o Google', () => {
    const testar = vi.spyOn(GeminiMotor.prototype, 'testar');
    montarPainelIA(container);
    container.querySelector('#chaveGeminiPainel').value = 'não é chave';
    container.querySelector('[data-salvar-chave]').click();
    const erro = container.querySelector('#erroChaveGemini');
    expect(erro.hidden).toBe(false);
    expect(erro.textContent).toMatch(/AIza/);
    expect(testar).not.toHaveBeenCalled();
  });

  test('chave recusada pelo Google: mantém o campo e mostra o motivo', async () => {
    vi.spyOn(GeminiMotor.prototype, 'testar').mockRejectedValue(
      new Error('Chave do Gemini inválida.')
    );
    montarPainelIA(container);
    container.querySelector('#chaveGeminiPainel').value = CHAVE;
    container.querySelector('[data-salvar-chave]').click();
    await vi.waitFor(() => expect(container.querySelector('#erroChaveGemini').hidden).toBe(false));
    expect(container.querySelector('#erroChaveGemini').textContent).toContain('inválida');
    expect(container.querySelector('#chaveGeminiPainel').value).toBe(CHAVE);
    expect(settings.get('chaveGemini')).toBe('');
  });

  test('chave válida (mesmo colada com sobras) é salva e o painel mostra "IA pronta"', async () => {
    vi.spyOn(GeminiMotor.prototype, 'testar').mockResolvedValue(true);
    const aoMudar = vi.fn();
    montarPainelIA(container, { aoMudar });
    container.querySelector('#chaveGeminiPainel').value = ` "${CHAVE}" `;
    container.querySelector('[data-salvar-chave]').click();
    await vi.waitFor(() => expect(settings.get('chaveGemini')).toBe(CHAVE));
    expect(container.textContent).toContain('IA pronta');
    expect(container.querySelector('.guia-chave')).toBeNull();
    expect(aoMudar).toHaveBeenLastCalledWith(true);
  });
});
