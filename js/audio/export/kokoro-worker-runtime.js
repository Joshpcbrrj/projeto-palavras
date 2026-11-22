const MODELO = 'onnx-community/Kokoro-82M-v1.0-ONNX';

/** Registra o protocolo do worker com uma implementação de TTS injetável. */
export function iniciarWorkerKokoro(scope, KokoroTTS) {
  let tts = null;

  scope.onmessage = async ({ data }) => {
    try {
      if (data.tipo === 'carregar') {
        // WebGPU usa fp32; WebAssembly usa o modelo quantizado menor.
        const gpu = data.dispositivo === 'webgpu';
        tts ??= await KokoroTTS.from_pretrained(MODELO, {
          dtype: gpu ? 'fp32' : 'q8',
          device: gpu ? 'webgpu' : 'wasm',
          progress_callback: (p) => {
            if (p.status === 'progress') {
              scope.postMessage({
                tipo: 'progresso',
                arquivo: p.file,
                carregado: p.loaded,
                total: p.total,
              });
            }
          },
        });
        scope.postMessage({ tipo: 'pronto', id: data.id });
      } else if (data.tipo === 'gerar') {
        const audio = await tts.generate(data.texto, {
          voice: data.voz,
          speed: data.velocidade ?? 1,
        });
        const pcm = audio.audio;
        scope.postMessage({ tipo: 'audio', id: data.id, pcm, taxa: audio.sampling_rate }, [
          pcm.buffer,
        ]);
      }
    } catch (erro) {
      scope.postMessage({ tipo: 'erro', id: data.id, mensagem: erro?.message || String(erro) });
    }
  };
}
