/**
 * Motor de voz que gera áudio de verdade (a Web Speech API só reproduz, não permite gravar):
 * Kokoro, grátis, roda no navegador, vozes inglesas neurais (download único de ≈ 90 MB,
 * ou ≈ 330 MB na versão para placa de vídeo, bem mais rápida).
 */

/** Usa a placa de vídeo (WebGPU) quando disponível; senão, o processador (WebAssembly). */
export async function escolherDispositivo(gpu = globalThis.navigator?.gpu) {
  try {
    return gpu && (await gpu.requestAdapter()) ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

/** Motor Kokoro executado em um Web Worker. */
export class KokoroMotor {
  constructor({ criarWorker } = {}) {
    this.criarWorker =
      criarWorker ||
      (() => new Worker(new URL('./kokoro-worker.js', import.meta.url), { type: 'module' }));
    this.worker = null;
    this.pendentes = new Map();
    this.proximoId = 1;
    this.carregado = null;
  }

  _enviar(mensagem) {
    const id = this.proximoId++;
    return new Promise((resolve, reject) => {
      this.pendentes.set(id, { resolve, reject });
      this.worker.postMessage({ ...mensagem, id });
    });
  }

  /** Baixa (se necessário) e carrega o modelo. `aoProgresso(0..1)` informa o download. */
  carregar(aoProgresso) {
    if (this.carregado) return this.carregado;
    this.worker = this.criarWorker();
    const arquivos = new Map();
    this.worker.onmessage = ({ data }) => {
      if (data.tipo === 'progresso') {
        arquivos.set(data.arquivo, {
          carregado: data.carregado,
          total: data.total || data.carregado,
        });
        const soma = [...arquivos.values()].reduce(
          (a, f) => ({ c: a.c + f.carregado, t: a.t + f.total }),
          { c: 0, t: 0 }
        );
        aoProgresso?.(soma.t ? soma.c / soma.t : 0);
        return;
      }
      const pendente = this.pendentes.get(data.id);
      if (!pendente) return;
      this.pendentes.delete(data.id);
      if (data.tipo === 'erro') pendente.reject(new Error(data.mensagem));
      else pendente.resolve(data);
    };
    this.worker.onerror = (evento) => {
      const erro = new Error(evento.message || 'Falha no motor de voz Kokoro.');
      this.pendentes.forEach((p) => p.reject(erro));
      this.pendentes.clear();
    };
    this.carregado = escolherDispositivo()
      .then((dispositivo) => {
        this.dispositivo = dispositivo;
        return this._enviar({ tipo: 'carregar', dispositivo });
      })
      .catch((erro) => {
        this.destruir();
        throw new Error(`Não foi possível carregar a voz Kokoro. ${erro.message}`, { cause: erro });
      });
    return this.carregado;
  }

  /** @returns {Promise<{pcm: Float32Array, taxa: number}>} */
  async sintetizar(texto, { voz, velocidade = 1 } = {}) {
    const resposta = await this._enviar({ tipo: 'gerar', texto, voz, velocidade });
    return { pcm: resposta.pcm, taxa: resposta.taxa };
  }

  destruir() {
    this.worker?.terminate();
    this.worker = null;
    this.carregado = null;
    this.pendentes.clear();
  }
}
