/**
 * Web Worker do Kokoro (voz neural que roda no navegador). A síntese é pesada,
 * então fica fora da thread principal para a interface não travar.
 *
 * A URL precisa ser igual a CDN.kokoro em js/config.js (um teste verifica isso).
 */
import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';

const MODELO = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let tts = null;

self.onmessage = async ({ data }) => {
  try {
    if (data.tipo === 'carregar') {
      // Com placa de vídeo (WebGPU) a síntese é muitas vezes mais rápida; a biblioteca
      // recomenda fp32 nesse caso. Sem WebGPU, usa a versão quantizada (menor) em WebAssembly.
      const gpu = data.dispositivo === 'webgpu';
      tts ??= await KokoroTTS.from_pretrained(MODELO, {
        dtype: gpu ? 'fp32' : 'q8',
        device: gpu ? 'webgpu' : 'wasm',
        progress_callback: (p) => {
          if (p.status === 'progress') {
            self.postMessage({
              tipo: 'progresso',
              arquivo: p.file,
              carregado: p.loaded,
              total: p.total,
            });
          }
        },
      });
      self.postMessage({ tipo: 'pronto', id: data.id });
    } else if (data.tipo === 'gerar') {
      const audio = await tts.generate(data.texto, {
        voice: data.voz,
        speed: data.velocidade ?? 1,
      });
      const pcm = audio.audio;
      self.postMessage({ tipo: 'audio', id: data.id, pcm, taxa: audio.sampling_rate }, [
        pcm.buffer,
      ]);
    }
  } catch (erro) {
    self.postMessage({ tipo: 'erro', id: data.id, mensagem: erro?.message || String(erro) });
  }
};
