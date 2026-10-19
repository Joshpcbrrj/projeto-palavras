/**
 * Exportação de materiais de estudo em PDF, num só lugar para todas as telas:
 * monta o pacote, acrescenta o glossário com tradução (se pedido), gera o
 * arquivo e registra no histórico e na agenda de revisões.
 */

import { TIPOS } from '../config.js';
import { obterMotorIA } from '../create/engine.js';
import { montarGlossario, obterTradutor } from '../create/glossary.js';
import { criarPacote } from '../pdf/format.js';
import { exportarPdf, nomeArquivoPdf } from '../pdf/exporter.js';
import { progresso } from './progress.js';
import { settings } from './settings.js';

export const AVISO_SEM_TRADUTOR =
  'Sem tradutor disponível: configure a chave grátis do Gemini ou use o Chrome/Edge atualizado. O PDF saiu sem tradução.';

function quantidade(pacote) {
  return pacote.tipo === TIPOS.TEXTO
    ? pacote.texto.split(/\s+/).filter(Boolean).length
    : pacote.itens.length;
}

/** O que ainda falta traduzir (traduções já existentes, como as de PDFs combinados, são mantidas). */
function faltaTraduzir(pacote) {
  const existentes = pacote.glossario || [];
  if (pacote.tipo === TIPOS.TEXTO) return existentes.length ? null : pacote;
  const traduzidos = new Set(existentes.map((g) => g.termo.toLowerCase()));
  const itens = pacote.itens.filter((i) => !traduzidos.has(i.toLowerCase()));
  return itens.length ? { ...pacote, itens } : null;
}

/**
 * Acrescenta ao pacote o glossário com tradução para o português.
 * Nunca falha: se não der para traduzir, devolve o pacote como veio e um aviso.
 * @returns {Promise<{pacote: object, aviso: string}>}
 */
export async function adicionarGlossario(pacote, { ia, api, signal } = {}) {
  const pendente = faltaTraduzir(pacote);
  if (!pendente) return { pacote, aviso: '' };
  try {
    const tradutor = await obterTradutor({ idioma: pacote.idioma, ia, api });
    if (!tradutor) {
      // Material em português não precisa de tradução.
      return { pacote, aviso: pacote.idioma?.startsWith('pt') ? '' : AVISO_SEM_TRADUTOR };
    }
    const novos = await montarGlossario(pendente, tradutor, { signal });
    const glossario = [...(pacote.glossario || []), ...novos];
    return { pacote: criarPacote({ ...pacote, glossario }) || pacote, aviso: '' };
  } catch (erro) {
    if (erro?.name === 'AbortError') throw erro;
    console.error(erro);
    return {
      pacote,
      aviso: `Não foi possível traduzir (${erro?.message || 'erro desconhecido'}). O PDF saiu sem tradução.`,
    };
  }
}

/**
 * Traduções para falar no MP3 (item → tradução). Usa o glossário que o material já
 * tiver e traduz só o que faltar.
 * @returns {Promise<{traducoes: Map<string, string>, aviso: string}>}
 */
export async function obterTraducoesAudio(conteudo, { ia, api, signal } = {}) {
  const base = criarPacote({ ...conteudo, revisao: null });
  if (!base) return { traducoes: new Map(), aviso: '' };
  const { pacote, aviso } = await adicionarGlossario(base, {
    ia: ia === undefined ? obterMotorIA() : ia,
    api,
    signal,
  });
  const traducoes = new Map(
    (pacote.glossario || []).map((g) => [g.termo.toLowerCase(), g.traducao])
  );
  return { traducoes, aviso: aviso.replace('O PDF saiu sem tradução.', 'O MP3 sai sem tradução.') };
}

/** Nome-base comum ao PDF e ao MP3 do kit de estudo (sem extensão). */
export function nomeBaseKit(dados, data = new Date()) {
  return nomeArquivoPdf(dados, data).replace(/\.pdf$/, '');
}

/**
 * Gera e baixa o PDF de um material.
 * @param {object} dados campos de criarPacote ({ tipo, titulo, idioma, itens|texto, revisao, ... })
 * @param {object} [opcoes]
 * @param {boolean} [opcoes.traduzir] incluir glossário com tradução (padrão: preferência salva)
 * @param {string} [opcoes.nomeArquivo]
 * @returns {Promise<{pacote: object, nome: string, aviso: string}>}
 */
export async function exportarMaterialPdf(
  dados,
  { traduzir = settings.get('incluirTraducao'), nomeArquivo, ia, api, signal } = {}
) {
  let pacote = criarPacote(dados);
  if (!pacote) throw new Error('Não há conteúdo para exportar.');
  let aviso = '';
  if (traduzir) {
    ({ pacote, aviso } = await adicionarGlossario(pacote, {
      ia: ia === undefined ? obterMotorIA() : ia,
      api,
      signal,
    }));
  }
  const nome = await exportarPdf(pacote, { nomeArquivo });
  progresso().registrarArquivo('exportados', {
    nome,
    tipo: pacote.tipo,
    quantidade: quantidade(pacote),
  });
  if (pacote.revisao) progresso().salvarMaterial(pacote);
  return { pacote, nome, aviso };
}
