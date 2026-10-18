/**
 * Progresso do usuário: sessões de estudo, palavras mais estudadas,
 * arquivos exportados/revisados e a agenda de revisões.
 *
 * Os dados ficam no localStorage (chave "progresso_estudo") e os dados da
 * versão 2.x são migrados automaticamente na primeira leitura.
 */

import { APP, TIPOS } from '../config.js';
import { lerData } from '../core/utils.js';
import { statusRevisao, validarPacote } from '../pdf/format.js';
import { storage } from './storage.js';

const CHAVE = 'progresso_estudo';
const VERSAO = 3;
const LIMITE_SESSOES = 500;
const LIMITE_ARQUIVOS = 100;

function dadosIniciais() {
  return {
    versao: VERSAO,
    sessoes: [],
    repeticoes: {},
    totais: {
      sessoes: 0,
      palavras: 0,
      frases: 0,
      textos: 0,
      segundos: { palavras: 0, frases: 0, texto: 0 },
    },
    arquivos: { exportados: [], revisados: [] },
    materiais: {},
    primeiroEstudo: null,
    ultimoEstudo: null,
  };
}

/** Converte os dados da versão 2.x (formato antigo) para a versão 3. */
export function migrarV2(antigo) {
  const dados = dadosIniciais();
  if (!antigo || typeof antigo !== 'object') return dados;
  const numero = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  dados.totais.sessoes = numero(antigo.totalEstudos);
  dados.totais.palavras = numero(antigo.totalPalavrasEstudadas);
  dados.totais.frases = numero(antigo.totalFrasesEstudadas);
  dados.totais.segundos.palavras = numero(antigo.tempoPalavras);
  dados.totais.segundos.frases = numero(antigo.tempoFrases);
  dados.repeticoes = { ...(antigo.palavrasRepeticoes || {}) };
  dados.sessoes = (antigo.historicoSessoes || []).map((s) => ({
    data: s.data,
    tipo: s.tipo,
    quantidade: numero(s.quantidade),
    segundos: numero(s.tempo),
    idioma: antigo.idioma?.codigo,
  }));
  const arquivo = (a) => ({
    nome: a.nome,
    tipo: a.tipo,
    quantidade: numero(a.quantidade),
    data: a.data,
  });
  dados.arquivos.exportados = (antigo.historicoArquivosExportados || []).map(arquivo);
  dados.arquivos.revisados = (antigo.historicoArquivosRevisados || []).map(arquivo);
  dados.primeiroEstudo = antigo.primeiroEstudo || null;
  dados.ultimoEstudo = antigo.ultimoEstudo || null;
  return dados;
}

/**
 * Ao reabrir um PDF antigo, a agenda pode já ter uma revisão mais adiantada
 * (feita depois que o PDF foi gerado). Prevalece a data mais distante.
 */
export function revisaoMaisRecente(nova, existente) {
  if (!nova) return existente || null;
  if (!existente) return nova;
  return (lerData(existente.revisarEm) || 0) > (lerData(nova.revisarEm) || 0) ? existente : nova;
}

/** Revisão efetiva de um material, considerando o que já está na agenda. */
export function revisaoEfetiva(pacote) {
  return revisaoMaisRecente(pacote?.revisao, progresso().dados.materiais[pacote?.id]?.revisao);
}

function normalizar(dados) {
  const base = dadosIniciais();
  return {
    ...base,
    ...dados,
    totais: {
      ...base.totais,
      ...dados.totais,
      segundos: { ...base.totais.segundos, ...dados.totais?.segundos },
    },
    arquivos: { ...base.arquivos, ...dados.arquivos },
    materiais: { ...(dados.materiais || {}) },
    repeticoes: { ...(dados.repeticoes || {}) },
    sessoes: Array.isArray(dados.sessoes) ? dados.sessoes : [],
  };
}

export class ProgressService {
  constructor({ chave = CHAVE } = {}) {
    this.chave = chave;
    this.dados = this._carregar();
  }

  _carregar() {
    const salvo = storage.lerJSON(this.chave);
    if (!salvo) return dadosIniciais();
    if (salvo.versao === VERSAO) return normalizar(salvo);
    const migrado = migrarV2(salvo);
    storage.salvarJSON(this.chave, migrado);
    return migrado;
  }

  salvar() {
    storage.salvarJSON(this.chave, this.dados);
  }

  /**
   * Registra uma sessão de estudo concluída (ou interrompida e salva).
   * @param {{tipo: string, itens?: string[], quantidade?: number, segundos?: number, idioma?: string, titulo?: string}} sessao
   */
  registrarSessao({ tipo, itens = [], quantidade, segundos = 0, idioma, titulo }) {
    const agora = new Date().toISOString();
    const qtd = quantidade ?? itens.length;
    const seg = Math.max(0, Math.round(segundos));
    const totais = this.dados.totais;

    totais.sessoes++;
    if (tipo === TIPOS.PALAVRAS) {
      totais.palavras += qtd;
      totais.segundos.palavras += seg;
      for (const item of itens) {
        const chave = String(item).toLocaleLowerCase();
        this.dados.repeticoes[chave] = (this.dados.repeticoes[chave] || 0) + 1;
      }
    } else if (tipo === TIPOS.FRASES) {
      totais.frases += qtd;
      totais.segundos.frases += seg;
    } else if (tipo === TIPOS.TEXTO) {
      totais.textos++;
      totais.segundos.texto += seg;
    }

    this.dados.sessoes.push({ data: agora, tipo, quantidade: qtd, segundos: seg, idioma, titulo });
    this.dados.sessoes = this.dados.sessoes.slice(-LIMITE_SESSOES);
    this.dados.primeiroEstudo ??= agora;
    this.dados.ultimoEstudo = agora;
    this.salvar();
  }

  registrarArquivo(lista, { nome, tipo, quantidade }) {
    const arquivos = this.dados.arquivos[lista];
    arquivos.push({ nome, tipo, quantidade, data: new Date().toISOString() });
    this.dados.arquivos[lista] = arquivos.slice(-LIMITE_ARQUIVOS);
    this.salvar();
  }

  /** Guarda (ou atualiza) um material na agenda de revisões. */
  salvarMaterial(pacote) {
    if (!pacote?.id) return;
    const existente = this.dados.materiais[pacote.id];
    this.dados.materiais[pacote.id] = {
      id: pacote.id,
      tipo: pacote.tipo,
      titulo: pacote.titulo,
      idioma: pacote.idioma,
      quantidade: pacote.tipo === TIPOS.TEXTO ? undefined : pacote.itens?.length,
      revisao: revisaoMaisRecente(pacote.revisao, existente?.revisao),
      criadoEm: existente?.criadoEm || pacote.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    this.salvar();
  }

  removerMaterial(id) {
    delete this.dados.materiais[id];
    this.salvar();
  }

  /** Materiais com revisão marcada, dos mais urgentes para os mais distantes. */
  agenda(hoje = new Date()) {
    return Object.values(this.dados.materiais)
      .filter((m) => lerData(m.revisao?.revisarEm))
      .map((m) => ({ ...m, status: statusRevisao(m.revisao, hoje) }))
      .sort((a, b) => lerData(a.revisao.revisarEm) - lerData(b.revisao.revisarEm));
  }

  revisoesPendentes(hoje = new Date()) {
    return this.agenda(hoje).filter((m) => m.status.situacao !== 'futura');
  }

  estatisticas() {
    const { totais, repeticoes } = this.dados;
    const segundosTotal = totais.segundos.palavras + totais.segundos.frases + totais.segundos.texto;
    const maisEstudadas = Object.entries(repeticoes)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([palavra, vezes]) => ({ palavra, vezes }));

    return {
      sessoes: totais.sessoes,
      palavras: totais.palavras,
      frases: totais.frases,
      textos: totais.textos,
      palavrasUnicas: Object.keys(repeticoes).length,
      segundos: { ...totais.segundos, total: segundosTotal },
      maisEstudadas,
      exportados: this.dados.arquivos.exportados.length,
      revisados: this.dados.arquivos.revisados.length,
      primeiroEstudo: this.dados.primeiroEstudo,
      ultimoEstudo: this.dados.ultimoEstudo,
      ultimasSessoes: this.dados.sessoes.slice(-30).reverse(),
      diasSeguidos: this.diasSeguidos(),
    };
  }

  /** Quantos dias consecutivos (até hoje ou ontem) tiveram estudo. */
  diasSeguidos(hoje = new Date()) {
    const dias = new Set(this.dados.sessoes.map((s) => new Date(s.data).toDateString()));
    let contagem = 0;
    const cursor = new Date(hoje);
    if (!dias.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
    while (dias.has(cursor.toDateString())) {
      contagem++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return contagem;
  }

  exportarJSON() {
    return {
      app: APP.id,
      tipoArquivo: 'progresso',
      versao: VERSAO,
      exportadoEm: new Date().toISOString(),
      progresso: this.dados,
    };
  }

  /** Importa um backup (formato v3 ou o JSON exportado pela versão 2.x). */
  importarJSON(texto) {
    let dados;
    try {
      dados = JSON.parse(texto);
    } catch {
      throw new Error('O arquivo não é um JSON válido.');
    }
    if (dados?.progresso?.versao === VERSAO) {
      this.dados = normalizar(dados.progresso);
    } else if (dados?.dadosCompletos) {
      this.dados = migrarV2({ ...dados.dadosCompletos, idioma: dados.idioma });
    } else if (validarPacote(dados)) {
      throw new Error('Este arquivo é um material de estudo. Abra-o em "Revisar arquivo".');
    } else {
      throw new Error('Formato de backup não reconhecido.');
    }
    this.salvar();
    return this.dados.totais.sessoes;
  }

  reiniciar() {
    this.dados = dadosIniciais();
    this.salvar();
  }
}

let instancia = null;
/** Instância compartilhada pelas telas. */
export function progresso() {
  instancia ??= new ProgressService();
  return instancia;
}

/** Somente para testes. */
export function _resetarProgresso() {
  instancia = null;
}
