/**
 * IA que roda no próprio navegador (WebLLM + WebGPU).
 *
 * Gratuita e privada: o modelo é baixado uma única vez, fica guardado no
 * navegador e gera os textos sem enviar nada para servidores. Exige um navegador
 * com WebGPU (Chrome/Edge no computador e Android recentes, Safari 26+).
 */

import { CDN, MODELOS_IA, MODELO_IA_PADRAO } from '../config.js';

let bibliotecaPromessa = null;
function biblioteca() {
  bibliotecaPromessa ??= import(/* @vite-ignore */ CDN.webllm);
  return bibliotecaPromessa;
}

/**
 * Verifica se o navegador consegue rodar a IA local.
 * @returns {Promise<{suportado: boolean, f16: boolean, motivo?: string}>}
 */
export async function verificarSuporte(gpu = globalThis.navigator?.gpu) {
  if (!gpu) {
    return {
      suportado: false,
      f16: false,
      motivo:
        'Este navegador não oferece WebGPU, necessário para a IA local. Use o Chrome ou o Edge atualizados no computador (ou Chrome no Android).',
    };
  }
  try {
    const adaptador = await gpu.requestAdapter();
    if (!adaptador) {
      return {
        suportado: false,
        f16: false,
        motivo: 'Nenhuma placa de vídeo compatível com WebGPU foi encontrada neste aparelho.',
      };
    }
    return { suportado: true, f16: adaptador.features?.has?.('shader-f16') ?? false };
  } catch {
    return {
      suportado: false,
      f16: false,
      motivo: 'Não foi possível acessar a placa de vídeo (WebGPU).',
    };
  }
}

/** Identificador completo do modelo no WebLLM. */
export function idModelo(chave = MODELO_IA_PADRAO, f16 = true) {
  const base = (MODELOS_IA[chave] || MODELOS_IA[MODELO_IA_PADRAO]).id;
  return `${base}-${f16 ? 'q4f16_1' : 'q4f32_1'}-MLC`;
}

class LocalLLM {
  constructor() {
    this.motor = null;
    this.modeloCarregado = null;
    this.carregando = null;
    this.suporte = null;
  }

  async obterSuporte() {
    this.suporte ??= await verificarSuporte();
    return this.suporte;
  }

  get pronto() {
    return Boolean(this.motor);
  }

  /** O modelo já foi baixado antes (está no cache do navegador)? */
  async estaBaixado(chave) {
    const { f16, suportado } = await this.obterSuporte();
    if (!suportado) return false;
    const { hasModelInCache } = await biblioteca();
    return hasModelInCache(idModelo(chave, f16));
  }

  /**
   * Baixa (se necessário) e carrega o modelo.
   * @param {string} chave chave de MODELOS_IA
   * @param {{aoProgresso?: (info: {progresso: number, texto: string}) => void}} [opcoes]
   */
  async carregar(chave, { aoProgresso } = {}) {
    const suporte = await this.obterSuporte();
    if (!suporte.suportado) throw new Error(suporte.motivo);
    const id = idModelo(chave, suporte.f16);
    if (this.modeloCarregado === id && this.motor) return;
    if (this.carregando) return this.carregando;

    this.carregando = (async () => {
      try {
        const { CreateWebWorkerMLCEngine } = await biblioteca();
        if (this.motor) await this.descarregar();
        const worker = new Worker(new URL('./llm-worker.js', import.meta.url), { type: 'module' });
        this.motor = await CreateWebWorkerMLCEngine(worker, id, {
          initProgressCallback: (r) =>
            aoProgresso?.({ progresso: r.progress ?? 0, texto: r.text || '' }),
        });
        this.worker = worker;
        this.modeloCarregado = id;
      } catch (erro) {
        this.motor = null;
        this.modeloCarregado = null;
        throw new Error(`Não foi possível carregar a IA local. ${traduzirErro(erro)}`, {
          cause: erro,
        });
      } finally {
        this.carregando = null;
      }
    })();
    return this.carregando;
  }

  /**
   * Gera um texto. Chama `aoTexto(textoParcial)` conforme o texto vai sendo escrito.
   * @returns {Promise<string>}
   */
  async gerar({ mensagens, maxTokens = 800, temperatura = 0.7, aoTexto, signal }) {
    if (!this.motor) throw new Error('A IA local ainda não foi carregada.');
    const fluxo = await this.motor.chat.completions.create({
      messages: mensagens,
      stream: true,
      temperature: temperatura,
      top_p: 0.9,
      frequency_penalty: 0.3,
      max_tokens: maxTokens,
    });
    let texto = '';
    for await (const parte of fluxo) {
      if (signal?.aborted) {
        this.motor.interruptGenerate();
        break;
      }
      texto += parte.choices?.[0]?.delta?.content || '';
      aoTexto?.(texto);
    }
    return texto;
  }

  async descarregar() {
    try {
      await this.motor?.unload?.();
    } catch {
      /* ignora */
    }
    this.worker?.terminate();
    this.motor = null;
    this.worker = null;
    this.modeloCarregado = null;
  }

  /** Apaga o modelo do armazenamento do navegador. */
  async remover(chave) {
    const { f16 } = await this.obterSuporte();
    const id = idModelo(chave, f16);
    if (this.modeloCarregado === id) await this.descarregar();
    const { deleteModelAllInfoInCache } = await biblioteca();
    await deleteModelAllInfoInCache(id);
  }
}

function traduzirErro(erro) {
  const mensagem = String(erro?.message || erro);
  if (/quota|storage|QuotaExceeded/i.test(mensagem))
    return 'Não há espaço suficiente no navegador para guardar o modelo.';
  if (/fetch|network|Failed to fetch/i.test(mensagem))
    return 'Verifique sua conexão com a internet (necessária no primeiro download).';
  if (/device|lost|memory|OOM/i.test(mensagem))
    return 'A placa de vídeo ficou sem memória. Tente o modelo "Leve".';
  return mensagem;
}

/** Instância compartilhada (o modelo carregado fica disponível entre as telas). */
export const ia = new LocalLLM();
