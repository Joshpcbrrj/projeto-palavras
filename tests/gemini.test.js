// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GeminiMotor, paraFormatoGemini, textoDoEvento } from '../js/create/gemini.js';
import { obterMotorIA } from '../js/create/engine.js';
import { settings } from '../js/services/settings.js';

/** Resposta HTTP com corpo em streaming (Server-Sent Events), como a do Gemini. */
function respostaSSE(eventos, { pedacos = 3 } = {}) {
  const texto = eventos.map((e) => `data: ${JSON.stringify(e)}\r\n\r\n`).join('');
  const bytes = new TextEncoder().encode(texto);
  const tamanho = Math.ceil(bytes.length / pedacos);
  const corpo = new ReadableStream({
    start(controle) {
      for (let i = 0; i < bytes.length; i += tamanho) controle.enqueue(bytes.slice(i, i + tamanho));
      controle.close();
    },
  });
  return { ok: true, status: 200, body: corpo };
}

const evento = (texto, extra = {}) => ({
  candidates: [{ content: { parts: [{ text: texto, ...extra }] } }],
});

describe('formato do Gemini', () => {
  test('separa a instrução de sistema e converte os papéis', () => {
    const r = paraFormatoGemini([
      { role: 'system', content: 'Be a teacher.' },
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ]);
    expect(r.systemInstruction).toEqual({ parts: [{ text: 'Be a teacher.' }] });
    expect(r.contents.map((c) => c.role)).toEqual(['user', 'model']);
  });

  test('ignora partes de "pensamento" do modelo', () => {
    expect(textoDoEvento(evento('pensando...', { thought: true }))).toBe('');
    expect(textoDoEvento(evento('Olá'))).toBe('Olá');
    expect(textoDoEvento({})).toBe('');
  });
});

describe('GeminiMotor', () => {
  test('gera em streaming, mesmo com eventos partidos entre pedaços', async () => {
    const fetchFn = vi.fn(async () =>
      respostaSSE([evento('Anna: Hi!'), evento('\nBen: Hello!')], { pedacos: 7 })
    );
    const parciais = [];
    const motor = new GeminiMotor({ chave: 'AIza-teste', fetchFn });
    const texto = await motor.gerar({
      mensagens: [
        { role: 'system', content: 's' },
        { role: 'user', content: 'u' },
      ],
      maxTokens: 300,
      temperatura: 0.8,
      aoTexto: (t) => parciais.push(t),
    });
    expect(texto).toBe('Anna: Hi!\nBen: Hello!');
    expect(parciais.at(-1)).toBe(texto);

    const [url, opcoes] = fetchFn.mock.calls[0];
    expect(url).toContain(':streamGenerateContent?alt=sse');
    expect(opcoes.headers['x-goog-api-key']).toBe('AIza-teste');
    const corpo = JSON.parse(opcoes.body);
    expect(corpo.generationConfig).toMatchObject({ temperature: 0.8, maxOutputTokens: 2048 });
    expect(corpo.systemInstruction.parts[0].text).toBe('s');
  });

  test('mensagens claras para os erros comuns', async () => {
    const erro =
      (status, corpo = {}) =>
      async () => ({ ok: false, status, json: async () => corpo });
    const chaveInvalida = { error: { details: [{ reason: 'API_KEY_INVALID' }] } };
    await expect(
      new GeminiMotor({ chave: 'x', fetchFn: erro(400, chaveInvalida) }).gerar({ mensagens: [] })
    ).rejects.toThrow('Chave do Gemini inválida');
    await expect(
      new GeminiMotor({ chave: 'x', fetchFn: erro(429) }).gerar({ mensagens: [] })
    ).rejects.toThrow('limite gratuito');
    await expect(
      new GeminiMotor({ chave: 'x', fetchFn: erro(503) }).gerar({ mensagens: [] })
    ).rejects.toThrow('instável');
    await expect(new GeminiMotor({ chave: '' }).gerar({ mensagens: [] })).rejects.toThrow(
      'chave gratuita'
    );
    const offline = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(
      new GeminiMotor({ chave: 'x', fetchFn: offline }).gerar({ mensagens: [] })
    ).rejects.toThrow('Sem conexão');
  });

  test('testar() confirma que a chave funciona', async () => {
    const motor = new GeminiMotor({ chave: 'x', fetchFn: async () => respostaSSE([evento('OK')]) });
    await expect(motor.testar()).resolves.toBe(true);
  });
});

describe('escolha do motor de IA', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear?.();
    settings._resetar();
  });

  test('a IA só fica disponível depois de configurar a chave', () => {
    expect(obterMotorIA()).toBeNull();
    settings.set('chaveGemini', 'AIza-teste');
    expect(obterMotorIA()).toBeInstanceOf(GeminiMotor);
  });
});
