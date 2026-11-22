// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';
import { iniciarWorkerKokoro } from '../js/audio/export/kokoro-worker-runtime.js';

function criarWorkerFake(KokoroTTS) {
  const scope = { onmessage: null, postMessage: vi.fn() };
  iniciarWorkerKokoro(scope, KokoroTTS);
  return scope;
}

describe('protocolo do worker Kokoro', () => {
  test('carrega uma vez, encaminha progresso e transfere o áudio gerado', async () => {
    const pcm = new Float32Array([0.1, -0.1]);
    const tts = {
      generate: vi.fn().mockResolvedValue({ audio: pcm, sampling_rate: 24000 }),
    };
    const KokoroTTS = {
      from_pretrained: vi.fn(async (_modelo, opcoes) => {
        opcoes.progress_callback({
          status: 'progress',
          file: 'model.onnx',
          loaded: 25,
          total: 100,
        });
        opcoes.progress_callback({ status: 'ready' });
        return tts;
      }),
    };
    const scope = criarWorkerFake(KokoroTTS);

    await scope.onmessage({ data: { tipo: 'carregar', id: 1, dispositivo: 'wasm' } });
    await scope.onmessage({ data: { tipo: 'carregar', id: 2, dispositivo: 'wasm' } });
    await scope.onmessage({
      data: { tipo: 'gerar', id: 3, texto: 'Hello', voz: 'af_heart', velocidade: 0.8 },
    });

    expect(KokoroTTS.from_pretrained).toHaveBeenCalledOnce();
    expect(KokoroTTS.from_pretrained).toHaveBeenCalledWith(
      'onnx-community/Kokoro-82M-v1.0-ONNX',
      expect.objectContaining({ dtype: 'q8', device: 'wasm' })
    );
    expect(scope.postMessage.mock.calls.map(([mensagem]) => mensagem.tipo)).toEqual([
      'progresso',
      'pronto',
      'pronto',
      'audio',
    ]);
    expect(scope.postMessage).toHaveBeenCalledWith({ tipo: 'audio', id: 3, pcm, taxa: 24000 }, [
      pcm.buffer,
    ]);
    expect(tts.generate).toHaveBeenCalledWith('Hello', { voice: 'af_heart', speed: 0.8 });
  });

  test('usa WebGPU quando solicitado e valor padrão de velocidade', async () => {
    const pcm = new Float32Array([0.2]);
    const tts = { generate: vi.fn().mockResolvedValue({ audio: pcm, sampling_rate: 24000 }) };
    const KokoroTTS = {
      from_pretrained: vi.fn().mockResolvedValue(tts),
    };
    const scope = criarWorkerFake(KokoroTTS);
    await scope.onmessage({ data: { tipo: 'carregar', id: 4, dispositivo: 'webgpu' } });
    await scope.onmessage({ data: { tipo: 'gerar', id: 5, texto: 'Hi' } });

    expect(KokoroTTS.from_pretrained).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ dtype: 'fp32', device: 'webgpu' })
    );
    expect(tts.generate).toHaveBeenCalledWith('Hi', { voice: undefined, speed: 1 });
  });

  test('encaminha erros de inicialização e síntese para o chamador', async () => {
    const KokoroTTS = {
      from_pretrained: vi.fn().mockRejectedValue(new Error('modelo indisponível')),
    };
    const scope = criarWorkerFake(KokoroTTS);
    await scope.onmessage({ data: { tipo: 'carregar', id: 6, dispositivo: 'wasm' } });
    expect(scope.postMessage).toHaveBeenLastCalledWith({
      tipo: 'erro',
      id: 6,
      mensagem: 'modelo indisponível',
    });

    const outraScope = criarWorkerFake({
      from_pretrained: vi.fn().mockResolvedValue({
        generate: vi.fn().mockRejectedValue('falha textual'),
      }),
    });
    await outraScope.onmessage({ data: { tipo: 'carregar', id: 7, dispositivo: 'wasm' } });
    await outraScope.onmessage({ data: { tipo: 'gerar', id: 8, texto: 'Hi' } });
    expect(outraScope.postMessage).toHaveBeenLastCalledWith({
      tipo: 'erro',
      id: 8,
      mensagem: 'falha textual',
    });
    await outraScope.onmessage({ data: { tipo: 'ignorado', id: 9 } });
    expect(outraScope.postMessage).toHaveBeenCalledTimes(2);
  });
});
