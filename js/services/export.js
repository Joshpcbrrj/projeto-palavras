/**
 * Exportação de materiais de estudo em PDF, num só lugar para todas as telas:
 * monta o pacote, acrescenta a tradução para o português (no fim do arquivo),
 * gera o arquivo e registra no histórico e na agenda de revisões.
 */

import { TIPOS } from '../config.js';
import { obterMotorIA } from '../create/engine.js';
import { obterTradutor, traduzirItens, traduzirTexto } from '../create/translate.js';
import { criarPacote } from '../pdf/format.js';
import { exportarPdf, nomeArquivoPdf } from '../pdf/exporter.js';
import { contarPalavras } from '../text/extract.js';
import { progresso } from './progress.js';
import { settings } from './settings.js';

export const AVISO_SEM_TRADUTOR =
  'Sem tradutor disponível: configure a chave grátis do Gemini ou use o Chrome/Edge atualizado. O PDF saiu sem a tradução.';

function quantidade(pacote) {
  return pacote.tipo === TIPOS.TEXTO ? contarPalavras(pacote.texto) : pacote.itens.length;
}

const emPortugues = (idioma) => String(idioma || '').startsWith('pt');

/**
 * Acrescenta a tradução ao pacote. Traduções já conhecidas (de um PDF reaberto ou
 * de listas combinadas) são reaproveitadas: só o que falta é traduzido.
 * Nunca falha: se não der para traduzir, devolve o pacote como veio e um aviso.
 * @param {object} pacote
 * @param {object} [opcoes]
 * @param {Map<string, string>} [opcoes.conhecidas] item → tradução já existente
 * @returns {Promise<{pacote: object, aviso: string}>}
 */
export async function adicionarTraducao(pacote, { conhecidas = new Map(), ia, api, signal } = {}) {
  if (emPortugues(pacote.idioma)) return { pacote, aviso: '' };
  if (pacote.tipo === TIPOS.TEXTO ? pacote.traducao : pacote.traducao?.every(Boolean)) {
    return { pacote, aviso: '' };
  }
  const faltando =
    pacote.tipo === TIPOS.TEXTO ? [] : pacote.itens.filter((item) => !conhecidas.get(item));
  try {
    let traducao;
    if (pacote.tipo !== TIPOS.TEXTO && !faltando.length) {
      traducao = pacote.itens.map((item) => conhecidas.get(item));
    } else {
      const tradutor = await obterTradutor({ idioma: pacote.idioma, ia, api });
      if (!tradutor) return { pacote, aviso: AVISO_SEM_TRADUTOR };
      if (pacote.tipo === TIPOS.TEXTO) {
        traducao = await traduzirTexto(pacote.texto, tradutor, { signal });
      } else {
        const novas = await traduzirItens(faltando, tradutor, { signal });
        const mapa = new Map(conhecidas);
        faltando.forEach((item, k) => mapa.set(item, novas[k]));
        traducao = pacote.itens.map((item) => mapa.get(item) || '');
      }
    }
    return { pacote: criarPacote({ ...pacote, traducao }) || pacote, aviso: '' };
  } catch (erro) {
    if (erro?.name === 'AbortError') throw erro;
    console.error(erro);
    return {
      pacote,
      aviso: `Não foi possível traduzir (${erro?.message || 'erro desconhecido'}). O PDF saiu sem a tradução.`,
    };
  }
}

/** Traduções de um ou mais materiais, por item (para reaproveitar ao exportar de novo). */
export function traducoesConhecidas(...materiais) {
  const mapa = new Map();
  for (const m of materiais) {
    if (!m || !Array.isArray(m.traducao)) continue;
    m.itens.forEach((item, k) => m.traducao[k] && mapa.set(item, m.traducao[k]));
  }
  return mapa;
}

/** Nome-base comum ao PDF e ao MP3 do kit de estudo (sem extensão). */
export function nomeBaseKit(dados, data = new Date()) {
  return nomeArquivoPdf(dados, data).replace(/\.pdf$/, '');
}

/**
 * Gera e baixa o PDF de um material.
 * @param {object} dados campos de criarPacote ({ tipo, titulo, idioma, itens|texto, revisao, ... })
 * @param {object} [opcoes]
 * @param {boolean} [opcoes.traduzir] incluir a tradução no fim (padrão: preferência salva)
 * @param {Map<string, string>} [opcoes.conhecidas] traduções já existentes, por item
 * @param {string} [opcoes.nomeArquivo]
 * @param {(etapa: string) => void} [opcoes.aoEtapa]
 * @returns {Promise<{pacote: object, nome: string, aviso: string}>}
 */
export async function exportarMaterialPdf(
  dados,
  {
    traduzir = settings.get('incluirTraducao'),
    conhecidas,
    nomeArquivo,
    ia,
    api,
    aoEtapa,
    signal,
  } = {}
) {
  let pacote = criarPacote(dados);
  if (!pacote) throw new Error('Não há conteúdo para exportar.');
  let aviso = '';
  if (traduzir) {
    if (!emPortugues(pacote.idioma)) aoEtapa?.('Traduzindo…');
    ({ pacote, aviso } = await adicionarTraducao(pacote, {
      conhecidas,
      ia: ia === undefined ? obterMotorIA() : ia,
      api,
      signal,
    }));
  } else if (pacote.traducao) {
    pacote = criarPacote({ ...pacote, traducao: undefined });
  }
  aoEtapa?.('Gerando PDF…');
  const nome = await exportarPdf(pacote, { nomeArquivo });
  progresso().registrarArquivo('exportados', {
    nome,
    tipo: pacote.tipo,
    quantidade: quantidade(pacote),
  });
  if (pacote.revisao) progresso().salvarMaterial(pacote);
  return { pacote, nome, aviso };
}
