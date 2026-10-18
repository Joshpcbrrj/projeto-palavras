/**
 * Exportação de áudio em MP3: planeja os trechos, sintetiza cada um com o motor
 * escolhido e junta tudo, com pausas, em um único arquivo.
 */

import { carimboArquivo, slug } from '../../core/utils.js';
import { KokoroMotor } from './engines.js';
import { Mp3Builder, TAXA_PADRAO, aparar, obterEncoderMp3, reamostrar } from './mp3.js';
import { planejarAudio } from './plan.js';

let kokoroCompartilhado = null;

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
 * @param {Function} [opcoes.Mp3Encoder] (injetável para testes)
 * @param {(info: {fase: string, atual?: number, total?: number, progresso?: number}) => void} [opcoes.aoProgresso]
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
    Mp3Encoder,
    aoProgresso,
    signal,
  }
) {
  const segmentos = planejarAudio(conteudo, { repeticoes, pausaMs, numerar });
  if (!segmentos.length) throw new Error('Não há conteúdo para gerar o áudio.');

  aoProgresso?.({ fase: 'carregando', progresso: 0 });
  await motor.carregar((progresso) => aoProgresso?.({ fase: 'carregando', progresso }));
  const Encoder = Mp3Encoder || (await obterEncoderMp3());
  const mp3 = new Mp3Builder(Encoder, { taxa: TAXA_PADRAO });

  // Repetições do mesmo texto reaproveitam o áudio já sintetizado.
  const cache = new Map();
  mp3.silencio(300);
  for (const [i, segmento] of segmentos.entries()) {
    if (signal?.aborted) throw new DOMException('Exportação cancelada.', 'AbortError');
    aoProgresso?.({ fase: 'gerando', atual: i + 1, total: segmentos.length });
    const voz = vozes[segmento.voz] || vozes[0];
    const chave = `${voz}|${segmento.texto}`;
    if (!cache.has(chave)) {
      const { pcm, taxa } = await motor.sintetizar(segmento.texto, { voz, velocidade, signal });
      cache.set(chave, aparar(reamostrar(pcm, taxa, TAXA_PADRAO)));
      if (cache.size > 50) cache.delete(cache.keys().next().value);
    }
    mp3.adicionar(cache.get(chave));
    mp3.silencio(segmento.pausaDepoisMs);
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
