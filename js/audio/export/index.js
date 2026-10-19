/**
 * Exportação de áudio em MP3: planeja os trechos, sintetiza cada um com o motor
 * escolhido e junta tudo, com pausas, em um único arquivo.
 */

import { carimboArquivo, slug } from '../../core/utils.js';
import { KokoroMotor } from './engines.js';
import { Mp3Builder, TAXA_PADRAO, obterEncoderMp3, prepararTrecho } from './mp3.js';
import { planejarAudio } from './plan.js';

let kokoroCompartilhado = null;

/**
 * Áudio já sintetizado nesta sessão (voz|velocidade|texto → amostras prontas).
 * Gerar de novo com outra pausa, ou o kit depois do MP3, reaproveita tudo.
 * Limite de ≈ 40 MB (cerca de 7 minutos de voz).
 */
const LIMITE_CACHE_AMOSTRAS = 10_000_000;
const cacheSessao = new Map();
let amostrasEmCache = 0;

function guardarNoCache(chave, amostras) {
  cacheSessao.set(chave, amostras);
  amostrasEmCache += amostras.length;
  for (const [antiga, valor] of cacheSessao) {
    if (amostrasEmCache <= LIMITE_CACHE_AMOSTRAS || antiga === chave) break;
    cacheSessao.delete(antiga);
    amostrasEmCache -= valor.length;
  }
}

/** Somente para testes. */
export function _limparCacheAudio() {
  cacheSessao.clear();
  amostrasEmCache = 0;
}

/** Motor de voz compartilhado (o modelo é carregado uma vez por sessão). */
export function criarMotor() {
  kokoroCompartilhado ??= new KokoroMotor();
  return kokoroCompartilhado;
}

export function nomeArquivoMp3(titulo, data = new Date()) {
  return `${slug(titulo, 40)}_${carimboArquivo(data)}.mp3`;
}

/**
 * Gera o MP3.
 * @param {object} conteudo { tipo, itens?, texto?, titulo }
 * @param {object} opcoes
 * @param {object} opcoes.motor instância com carregar() e sintetizar()
 * @param {string[]} opcoes.vozes [voz principal, segunda voz para diálogos]
 * @param {number} [opcoes.velocidade]
 * @param {number} [opcoes.repeticoes]
 * @param {number} [opcoes.pausaMs]
 * @param {boolean} [opcoes.numerar] falar o número de cada item
 * @param {Map<string, string>} [opcoes.traducoes] tradução falada depois de cada item
 * @param {Function} [opcoes.Mp3Encoder] (injetável para testes)
 * @param {(info: {fase: string, atual?: number, total?: number, progresso?: number}) => void} [opcoes.aoProgresso]
 * @param {(pcm: Float32Array, taxa: number, pausaMs: number) => void} [opcoes.aoTrecho] recebe cada
 *   trecho assim que fica pronto (para ouvir enquanto o MP3 é gerado)
 * @param {AbortSignal} [opcoes.signal]
 * @returns {Promise<{blob: Blob, nome: string, duracao: number, trechos: number}>}
 */
export async function gerarMp3(
  conteudo,
  {
    motor,
    vozes,
    velocidade = 1,
    repeticoes = 1,
    pausaMs = 900,
    numerar = false,
    traducoes,
    Mp3Encoder,
    aoProgresso,
    aoTrecho,
    signal,
  }
) {
  const segmentos = planejarAudio(conteudo, { repeticoes, pausaMs, numerar, traducoes });
  if (!segmentos.length) throw new Error('Não há conteúdo para gerar o áudio.');

  aoProgresso?.({ fase: 'carregando', progresso: 0 });
  await motor.carregar((progresso) => aoProgresso?.({ fase: 'carregando', progresso }));
  const Encoder = Mp3Encoder || (await obterEncoderMp3());
  const mp3 = new Mp3Builder(Encoder, { taxa: TAXA_PADRAO });

  // Repetições (e gerações anteriores nesta sessão) reaproveitam o áudio já sintetizado.
  mp3.silencio(300);
  for (const [i, segmento] of segmentos.entries()) {
    if (signal?.aborted) throw new DOMException('Exportação cancelada.', 'AbortError');
    aoProgresso?.({ fase: 'gerando', atual: i + 1, total: segmentos.length });
    const voz = vozes[segmento.voz] || vozes[0];
    const chave = `${voz}|${velocidade}|${segmento.texto}`;
    let amostras = cacheSessao.get(chave);
    if (!amostras) {
      const { pcm, taxa } = await motor.sintetizar(segmento.texto, { voz, velocidade, signal });
      amostras = prepararTrecho(pcm, taxa, TAXA_PADRAO);
      guardarNoCache(chave, amostras);
    }
    mp3.adicionar(amostras);
    mp3.silencio(segmento.pausaDepoisMs);
    aoTrecho?.(amostras, TAXA_PADRAO, segmento.pausaDepoisMs);
  }

  aoProgresso?.({ fase: 'finalizando' });
  const blob = mp3.finalizar();
  return {
    blob,
    nome: nomeArquivoMp3(conteudo.titulo || 'audio'),
    duracao: mp3.duracaoSegundos,
    trechos: segmentos.length,
  };
}
