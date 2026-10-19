// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Mp3Encoder } from '@breezystack/lamejs';
import {
  ehDialogo,
  estimarDuracao,
  planejarAudio,
  separarFalante,
} from '../js/audio/export/plan.js';
import {
  Mp3Builder,
  aparar,
  nivelar,
  paraInt16,
  reamostrar,
  suavizarBordas,
} from '../js/audio/export/mp3.js';
import { KokoroMotor } from '../js/audio/export/engines.js';
import { _limparCacheAudio, gerarMp3, nomeArquivoMp3 } from '../js/audio/export/index.js';

beforeEach(() => _limparCacheAudio());

describe('planejamento do áudio', () => {
  test('separa falante e fala', () => {
    expect(separarFalante('Anna: Hi, Ben!')).toEqual({ falante: 'Anna', fala: 'Hi, Ben!' });
    expect(separarFalante('Just a sentence.')).toBeNull();
    expect(separarFalante('Note: this is not')).toEqual({ falante: 'Note', fala: 'this is not' });
  });

  test('reconhece diálogos (2+ falantes na maioria das linhas)', () => {
    expect(ehDialogo('Anna: Hi.\nBen: Hello.\nAnna: Bye.')).toBe(true);
    expect(ehDialogo('Note: one line.\nA normal sentence.\nAnother one.')).toBe(false);
    expect(ehDialogo('Time: 10:30. We met at noon.')).toBe(false);
  });

  test('palavras: repete cada uma e usa pausa menor entre as repetições', () => {
    const plano = planejarAudio(
      { tipo: 'palavras', itens: ['cat', 'dog'] },
      { repeticoes: 2, pausaMs: 1500 }
    );
    expect(plano).toEqual([
      { texto: 'cat', voz: 0, pausaDepoisMs: 500 },
      { texto: 'cat', voz: 0, pausaDepoisMs: 1500 },
      { texto: 'dog', voz: 0, pausaDepoisMs: 500 },
      { texto: 'dog', voz: 0, pausaDepoisMs: 1500 },
    ]);
  });

  test('numerar: fala o número de cada item, como na lista do PDF', () => {
    const plano = planejarAudio(
      { tipo: 'palavras', itens: ['cat', '  ', 'dog'] },
      { numerar: true, pausaMs: 900 }
    );
    // O número vai no mesmo trecho da 1ª leitura (uma chamada à voz a menos por item).
    expect(plano.map((s) => s.texto)).toEqual(['Number 1. cat', 'Number 2. dog']);
  });

  test('tradução falada depois do item (e das repetições)', () => {
    const plano = planejarAudio(
      { tipo: 'palavras', itens: ['window'] },
      { repeticoes: 2, pausaMs: 1500, traducoes: new Map([['window', 'janela']]) }
    );
    expect(plano.map((s) => [s.texto, s.pausaDepoisMs])).toEqual([
      ['window', 500],
      ['window', 600],
      ['janela', 1500],
    ]);
  });

  test('diálogo: uma voz por pessoa e sem ler o nome', () => {
    const plano = planejarAudio({
      tipo: 'texto',
      texto: 'Anna: Hi!\nBen: Hello!\nAnna: How are you?',
    });
    expect(plano.map((s) => [s.texto, s.voz])).toEqual([
      ['Hi!', 0],
      ['Hello!', 1],
      ['How are you?', 0],
    ]);
  });

  test('texto: agrupa frases do mesmo parágrafo; pausa maior entre parágrafos e após títulos', () => {
    const plano = planejarAudio({
      tipo: 'texto',
      texto: 'History\n\nFirst sentence. Second one.\n\nNew paragraph.',
    });
    expect(plano.map((s) => [s.texto, s.pausaDepoisMs])).toEqual([
      ['History', 900],
      ['First sentence. Second one.', 750],
      ['New paragraph.', 300],
    ]);
    expect(estimarDuracao(plano)).toBeGreaterThan(2);
  });
});

describe('MP3', () => {
  test('conversões de amostras', () => {
    expect(Array.from(paraInt16(new Float32Array([0, 1, -1, 2])))).toEqual([
      0, 32767, -32768, 32767,
    ]);
    expect(reamostrar(new Float32Array(48000), 48000, 24000)).toHaveLength(24000);
    expect(aparar(new Float32Array([0, 0, 0.5, 0.5, 0, 0]), 0.1).length).toBeLessThanOrEqual(6);
  });

  test('gera um arquivo MP3 válido com áudio e silêncio', async () => {
    const mp3 = new Mp3Builder(Mp3Encoder, { taxa: 24000 });
    const tom = new Float32Array(24000).map(
      (_, i) => Math.sin((2 * Math.PI * 440 * i) / 24000) * 0.3
    );
    mp3.adicionar(tom);
    mp3.silencio(500);
    const blob = mp3.finalizar();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(blob.type).toBe('audio/mpeg');
    expect(mp3.duracaoSegundos).toBeCloseTo(1.5, 2);
    expect(bytes.length).toBeGreaterThan(5000);
    // Todo quadro MP3 começa com 11 bits de sincronização (0xFFE).
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1] & 0xe0).toBe(0xe0);
  });

  test('gerarMp3 sintetiza cada trecho, reaproveita repetições e informa o progresso', async () => {
    const motor = {
      carregar: vi.fn(async (aoProgresso) => aoProgresso?.(1)),
      sintetizar: vi.fn(async () => ({ pcm: new Float32Array(4800).fill(0.2), taxa: 24000 })),
    };
    const progresso = [];
    const r = await gerarMp3(
      { tipo: 'palavras', titulo: 'Lição 1', itens: ['cat', 'dog'] },
      {
        motor,
        vozes: ['af_heart'],
        repeticoes: 3,
        pausaMs: 900,
        Mp3Encoder,
        aoProgresso: (p) => progresso.push(p.fase),
      }
    );
    expect(motor.sintetizar).toHaveBeenCalledTimes(2); // 6 trechos, 2 textos diferentes
    expect(r.trechos).toBe(6);
    expect(r.nome).toMatch(/^licao-1_.*\.mp3$/);
    expect(r.duracao).toBeGreaterThan(5);
    expect(progresso).toContain('gerando');
    expect(progresso.at(-1)).toBe('finalizando');
  });

  test('nivelar aproxima o volume das partes fortes e fracas, sem amplificar silêncio', () => {
    const taxa = 24000;
    const tom = (amp) =>
      Float32Array.from({ length: taxa }, (_, i) => Math.sin((2 * Math.PI * 220 * i) / taxa) * amp);
    const rmsDb = (a) => 10 * Math.log10(a.reduce((s, v) => s + v * v, 0) / a.length);
    // Começo forte, fim fraco e silêncio: como uma frase longa do Kokoro.
    const entrada = new Float32Array(taxa * 3);
    entrada.set(tom(0.5), 0);
    entrada.set(tom(0.03), taxa);
    const meio = (a, s) => a.subarray(taxa * (s + 0.3), taxa * (s + 0.7));
    const antes = rmsDb(meio(entrada, 0)) - rmsDb(meio(entrada, 1));
    const saida = nivelar(entrada, { taxa });
    const depois = rmsDb(meio(saida, 0)) - rmsDb(meio(saida, 1));
    expect(depois).toBeLessThan(antes - 12);
    expect(Math.max(...saida.map(Math.abs))).toBeLessThanOrEqual(0.89);
    expect(Math.max(...saida.subarray(taxa * 2.3).map(Math.abs))).toBe(0);
  });

  test('bordas suaves começam e terminam em zero', () => {
    const a = suavizarBordas(new Float32Array(2400).fill(0.5));
    expect(a[0]).toBe(0);
    expect(Math.abs(a.at(-1))).toBeLessThan(0.01);
    expect(a[1200]).toBe(0.5);
  });

  test('gerar de novo na mesma sessão reaproveita o áudio já sintetizado', async () => {
    const motor = {
      carregar: async () => {},
      sintetizar: vi.fn(async () => ({ pcm: new Float32Array(2400).fill(0.1), taxa: 24000 })),
    };
    const conteudo = { tipo: 'palavras', itens: ['cat', 'dog'] };
    await gerarMp3(conteudo, { motor, vozes: ['af_heart'], Mp3Encoder, pausaMs: 900 });
    await gerarMp3(conteudo, { motor, vozes: ['af_heart'], Mp3Encoder, pausaMs: 2500 });
    expect(motor.sintetizar).toHaveBeenCalledTimes(2);
    await gerarMp3(conteudo, { motor, vozes: ['af_heart'], Mp3Encoder, velocidade: 0.8 });
    expect(motor.sintetizar).toHaveBeenCalledTimes(4); // outra velocidade, outro áudio
  });

  test('diálogo usa a segunda voz para a segunda pessoa', async () => {
    const motor = {
      carregar: async () => {},
      sintetizar: vi.fn(async () => ({ pcm: new Float32Array(100), taxa: 24000 })),
    };
    await gerarMp3(
      { tipo: 'texto', texto: 'Anna: Hi.\nBen: Hello.' },
      { motor, vozes: ['af_heart', 'am_michael'], Mp3Encoder }
    );
    expect(motor.sintetizar.mock.calls.map((c) => c[1].voz)).toEqual(['af_heart', 'am_michael']);
  });

  test('pode ser cancelado e recusa conteúdo vazio', async () => {
    const motor = {
      carregar: async () => {},
      sintetizar: async () => ({ pcm: new Float32Array(10), taxa: 24000 }),
    };
    const controle = new AbortController();
    controle.abort();
    await expect(
      gerarMp3(
        { tipo: 'palavras', itens: ['a'] },
        { motor, vozes: ['v'], Mp3Encoder, signal: controle.signal }
      )
    ).rejects.toThrow('cancelada');
    await expect(
      gerarMp3({ tipo: 'palavras', itens: [] }, { motor, vozes: ['v'], Mp3Encoder })
    ).rejects.toThrow('conteúdo');
  });

  test('nome do arquivo', () => {
    expect(nomeArquivoMp3('Diálogo: Restaurante', new Date(2026, 9, 18, 9, 5))).toBe(
      'dialogo-restaurante_2026-10-18_09h05.mp3'
    );
  });
});

describe('motores de voz', () => {
  test('Kokoro: conversa com o worker, informa o download e repassa erros', async () => {
    class WorkerFalso {
      postMessage(msg) {
        setTimeout(() => {
          if (msg.tipo === 'carregar') {
            this.onmessage({
              data: { tipo: 'progresso', arquivo: 'model.onnx', carregado: 50, total: 100 },
            });
            this.onmessage({ data: { tipo: 'pronto', id: msg.id } });
          } else if (msg.texto === 'falha') {
            this.onmessage({ data: { tipo: 'erro', id: msg.id, mensagem: 'boom' } });
          } else {
            this.onmessage({
              data: { tipo: 'audio', id: msg.id, pcm: new Float32Array([0.1]), taxa: 24000 },
            });
          }
        }, 0);
      }
      terminate() {}
    }
    const motor = new KokoroMotor({ criarWorker: () => new WorkerFalso() });
    const progresso = [];
    await motor.carregar((p) => progresso.push(p));
    expect(progresso).toEqual([0.5]);
    const r = await motor.sintetizar('Hello', { voz: 'af_heart' });
    expect(r.taxa).toBe(24000);
    await expect(motor.sintetizar('falha', { voz: 'af_heart' })).rejects.toThrow('boom');
    motor.destruir();
  });
});
