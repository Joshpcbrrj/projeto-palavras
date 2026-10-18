/**
 * Formato de dados embutido nos PDFs (e arquivos JSON) gerados pelo app.
 *
 * Todo PDF exportado guarda, nas propriedades do documento (campo "Keywords"),
 * um pacote com os dados exatos do estudo. Assim o app consegue reabrir o
 * arquivo com fidelidade total — sem depender da extração de texto do PDF,
 * que pode quebrar linhas, acentos ou a ordem dos itens.
 *
 * Pacote (versão 3):
 * {
 *   app: 'aprendendo-palavras', versao: 3, id, tipo: 'palavras'|'frases'|'texto',
 *   titulo, idioma, criadoEm, itens?: string[], texto?: string,
 *   revisao: { etapa, intervaloDias, revisarEm: 'AAAA-MM-DD', historico: string[] }
 * }
 */

import { APP, ETAPAS_REVISAO, IDIOMAS, IDIOMA_PADRAO, NIVEIS, TIPOS } from '../config.js';
import { dataISO, diferencaDias, gerarId, lerData, somarDias } from '../core/utils.js';

export const VERSAO_PACOTE = 3;
export const MARCADOR = `${APP.id}:v${VERSAO_PACOTE}:`;

const TIPOS_VALIDOS = new Set(Object.values(TIPOS));

/** Cria a informação de revisão para uma etapa (0 = primeiro estudo). */
export function criarRevisao({
  etapa = 0,
  intervaloDias,
  revisarEm,
  historico = [],
  hoje = new Date(),
} = {}) {
  const etapaValida = Math.max(0, Math.min(Number(etapa) || 0, ETAPAS_REVISAO.length - 1));
  const intervalo =
    Number(intervaloDias) > 0 ? Math.round(intervaloDias) : ETAPAS_REVISAO[etapaValida];
  const data = lerData(revisarEm) || somarDias(hoje, intervalo);
  return {
    etapa: etapaValida,
    intervaloDias: intervalo,
    revisarEm: dataISO(data),
    historico: historico.filter(Boolean).slice(-20),
  };
}

/**
 * Calcula a próxima revisão depois de concluir uma revisão hoje.
 * Avança uma etapa no calendário de revisão espaçada.
 */
export function proximaRevisao(revisaoAtual, hoje = new Date()) {
  if (!revisaoAtual) return criarRevisao({ hoje });
  const etapa = Math.min((revisaoAtual.etapa ?? 0) + 1, ETAPAS_REVISAO.length - 1);
  return criarRevisao({
    etapa,
    historico: [...(revisaoAtual.historico || []), dataISO(hoje)],
    hoje,
  });
}

/**
 * Situação de uma revisão em relação a hoje.
 * @returns {{situacao: 'sem-data'|'futura'|'hoje'|'atrasada', dias: number, texto: string}}
 */
export function statusRevisao(revisao, hoje = new Date()) {
  const data = lerData(revisao?.revisarEm);
  if (!data) return { situacao: 'sem-data', dias: 0, texto: 'Sem data de revisão' };
  const dias = diferencaDias(hoje, data);
  if (dias > 0) {
    return {
      situacao: 'futura',
      dias,
      texto: dias === 1 ? 'Revisar amanhã' : `Revisar em ${dias} dias`,
    };
  }
  if (dias === 0) return { situacao: 'hoje', dias: 0, texto: 'Revisar hoje' };
  const atraso = -dias;
  return {
    situacao: 'atrasada',
    dias: atraso,
    texto: atraso === 1 ? 'Revisão atrasada há 1 dia' : `Revisão atrasada há ${atraso} dias`,
  };
}

/** Normaliza e valida um pacote. Retorna null se for inválido. */
export function validarPacote(dados) {
  if (!dados || typeof dados !== 'object') return null;
  if (dados.app !== APP.id) return null;
  if (!TIPOS_VALIDOS.has(dados.tipo)) return null;

  const pacote = {
    app: APP.id,
    versao: Number(dados.versao) || VERSAO_PACOTE,
    id: typeof dados.id === 'string' && dados.id ? dados.id : gerarId(),
    tipo: dados.tipo,
    titulo: String(dados.titulo || tituloPadrao(dados.tipo)).slice(0, 200),
    idioma: IDIOMAS[dados.idioma] ? dados.idioma : IDIOMA_PADRAO,
    criadoEm: typeof dados.criadoEm === 'string' ? dados.criadoEm : new Date().toISOString(),
    revisao: dados.revisao ? criarRevisao(dados.revisao) : null,
  };

  const fonte = validarFonte(dados.fonte);
  if (fonte) pacote.fonte = fonte;
  if (NIVEIS[dados.nivel]) pacote.nivel = dados.nivel;
  const glossario = validarGlossario(dados.glossario);
  if (glossario.length) pacote.glossario = glossario;

  if (pacote.tipo === TIPOS.TEXTO) {
    pacote.texto = String(dados.texto || '');
    if (!pacote.texto.trim()) return null;
  } else {
    pacote.itens = Array.isArray(dados.itens)
      ? dados.itens.map((i) => String(i).trim()).filter(Boolean)
      : [];
    if (!pacote.itens.length) return null;
  }
  return pacote;
}

/** Glossário com tradução: lista de { termo, traducao }. */
function validarGlossario(glossario) {
  if (!Array.isArray(glossario)) return [];
  return glossario
    .map((g) => ({
      termo: String(g?.termo ?? '')
        .trim()
        .slice(0, 200),
      traducao: String(g?.traducao ?? '')
        .trim()
        .slice(0, 200),
    }))
    .filter((g) => g.termo && g.traducao)
    .slice(0, 500);
}

/** Fonte do conteúdo (ex.: artigo da Wikipédia), necessária para a atribuição exigida pela licença. */
function validarFonte(fonte) {
  if (!fonte || typeof fonte !== 'object') return null;
  const url = String(fonte.url || '');
  if (url && !/^https:\/\//.test(url)) return null;
  const limpo = {
    nome: String(fonte.nome || '').slice(0, 80),
    titulo: String(fonte.titulo || '').slice(0, 200),
    url: url.slice(0, 500),
    licenca: String(fonte.licenca || '').slice(0, 40),
  };
  return limpo.nome || limpo.url ? limpo : null;
}

export function tituloPadrao(tipo) {
  if (tipo === TIPOS.FRASES) return 'Frases estudadas';
  if (tipo === TIPOS.TEXTO) return 'Texto de estudo';
  return 'Palavras estudadas';
}

/** Cria um pacote novo a partir dos dados de um estudo. */
export function criarPacote({
  tipo,
  titulo,
  idioma,
  itens,
  texto,
  revisao,
  id,
  criadoEm,
  fonte,
  nivel,
  glossario,
}) {
  return validarPacote({
    app: APP.id,
    versao: VERSAO_PACOTE,
    id: id || gerarId(),
    tipo,
    titulo: titulo || tituloPadrao(tipo),
    idioma,
    criadoEm: criadoEm || new Date().toISOString(),
    itens,
    texto,
    fonte,
    nivel,
    glossario,
    // `null` significa "não agendar"; sem o campo, agenda a primeira revisão.
    revisao: revisao === undefined ? criarRevisao() : revisao,
  });
}

function utf8ParaBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  const bloco = 0x8000;
  for (let i = 0; i < bytes.length; i += bloco) {
    binario += String.fromCharCode(...bytes.subarray(i, i + bloco));
  }
  return btoa(binario);
}

function base64ParaUtf8(base64) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Codifica o pacote em texto ASCII seguro para as propriedades do PDF. */
export function codificarPacote(pacote) {
  return MARCADOR + utf8ParaBase64(JSON.stringify(pacote));
}

/** Procura e decodifica um pacote dentro de um texto qualquer. Retorna null se não houver. */
export function decodificarPacote(texto) {
  if (!texto) return null;
  const conteudo = String(texto);
  const inicio = conteudo.indexOf(MARCADOR);
  if (inicio === -1) return null;
  const base64 = conteudo.slice(inicio + MARCADOR.length).match(/^[A-Za-z0-9+/=]+/)?.[0];
  if (!base64) return null;
  try {
    return validarPacote(JSON.parse(base64ParaUtf8(base64)));
  } catch {
    return null;
  }
}
