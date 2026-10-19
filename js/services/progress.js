/**
 * Progresso do usuário: sessões de estudo, palavras mais estudadas, materiais
 * criados, arquivos exportados/revisados e a agenda de revisões.
 *
 * Os dados ficam no localStorage (chave "progresso_estudo") e os dados da
 * versão 2.x são migrados automaticamente na primeira leitura.
 *
 * Backup em vários aparelhos: cada navegador tem uma `origem` (identificação) e
 * guarda os próprios contadores em `totais`/`repeticoes`; os de outros aparelhos,
 * trazidos por backups, ficam em `outrasOrigens`. Ao juntar, os contadores de cada
 * origem são combinados pelo maior valor (nunca somados), então importar o mesmo
 * backup de novo, ou juntar nos dois sentidos, não conta nada em dobro. Os números
 * exibidos são a soma de todas as origens.
 */

import { APP, TIPOS } from '../config.js';
import { dataISO, diferencaDias, gerarId, lerData } from '../core/utils.js';
import { statusRevisao, validarPacote } from '../pdf/format.js';
import { storage } from './storage.js';

const CHAVE = 'progresso_estudo';
const VERSAO = 3;
const LIMITE_SESSOES = 500;
const LIMITE_ARQUIVOS = 100;
/** Depois de quantos dias sem backup o app lembra de fazer um. */
export const DIAS_LEMBRETE_BACKUP = 14;

function totaisIniciais() {
  return {
    sessoes: 0,
    palavras: 0,
    frases: 0,
    textos: 0,
    segundos: { palavras: 0, frases: 0, texto: 0 },
    // Materiais gerados no app.
    criados: { textos: 0, pdfs: 0, mp3: 0, kits: 0 },
  };
}

function dadosIniciais() {
  return {
    versao: VERSAO,
    origem: gerarId(),
    sessoes: [],
    repeticoes: {},
    totais: totaisIniciais(),
    outrasOrigens: {},
    arquivos: { exportados: [], revisados: [] },
    materiais: {},
    primeiroEstudo: null,
    ultimoEstudo: null,
    ultimoBackup: null,
  };
}

/**
 * Identificação de dados que ainda não tinham origem (versões anteriores):
 * derivada da data do primeiro estudo, para que um backup antigo deste mesmo
 * navegador seja reconhecido como a mesma origem (e não conte em dobro).
 */
function origemLegada(dados) {
  return dados?.primeiroEstudo ? `legado:${dados.primeiroEstudo}` : gerarId();
}

function numero(v) {
  return Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0;
}

/** Completa os totais com os campos que faltam (dados antigos ou incompletos). */
function normalizarTotais(t = {}) {
  const base = totaisIniciais();
  return {
    sessoes: numero(t.sessoes),
    palavras: numero(t.palavras),
    frases: numero(t.frases),
    textos: numero(t.textos),
    segundos: Object.fromEntries(
      Object.keys(base.segundos).map((k) => [k, numero(t.segundos?.[k])])
    ),
    criados: Object.fromEntries(Object.keys(base.criados).map((k) => [k, numero(t.criados?.[k])])),
  };
}

/** Combina dois conjuntos de contadores da mesma origem: fica o maior de cada um. */
function maiorTotais(a, b) {
  const x = normalizarTotais(a);
  const y = normalizarTotais(b);
  const maior = (p, q) =>
    Object.fromEntries(
      Object.keys(p).map((k) =>
        typeof p[k] === 'object' ? [k, maior(p[k], q[k])] : [k, Math.max(p[k], q[k])]
      )
    );
  return maior(x, y);
}

function maiorRepeticoes(a = {}, b = {}) {
  const resultado = { ...a };
  for (const [palavra, vezes] of Object.entries(b)) {
    resultado[palavra] = Math.max(resultado[palavra] || 0, numero(vezes));
  }
  return resultado;
}

/** Soma os contadores de várias origens (para exibir). */
function somarTotais(lista) {
  const soma = (p, q) =>
    Object.fromEntries(
      Object.keys(p).map((k) =>
        typeof p[k] === 'object' ? [k, soma(p[k], q[k])] : [k, p[k] + q[k]]
      )
    );
  return lista.map(normalizarTotais).reduce(soma, totaisIniciais());
}

/** Une listas sem repetir itens iguais, em ordem de data, até o limite. */
function unirPorChave(a = [], b = [], chave, limite) {
  const mapa = new Map();
  for (const item of [...a, ...b]) mapa.set(chave(item), item);
  return [...mapa.values()]
    .sort((x, y) => String(x.data).localeCompare(String(y.data)))
    .slice(-limite);
}

const menorData = (a, b) => (!a ? b || null : !b ? a : a < b ? a : b);
const maiorData = (a, b) => (!a ? b || null : !b ? a : a > b ? a : b);

/** Converte os dados da versão 2.x (formato antigo) para a versão 3. */
export function migrarV2(antigo) {
  const dados = dadosIniciais();
  if (!antigo || typeof antigo !== 'object') return dados;
  dados.origem = origemLegada(antigo);

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
  const outras = {};
  for (const [id, o] of Object.entries(dados.outrasOrigens || {})) {
    outras[id] = { totais: normalizarTotais(o?.totais), repeticoes: { ...(o?.repeticoes || {}) } };
  }
  return {
    ...base,
    ...dados,
    origem: typeof dados.origem === 'string' && dados.origem ? dados.origem : origemLegada(dados),
    totais: normalizarTotais(dados.totais),
    outrasOrigens: outras,
    arquivos: {
      exportados: Array.isArray(dados.arquivos?.exportados) ? dados.arquivos.exportados : [],
      revisados: Array.isArray(dados.arquivos?.revisados) ? dados.arquivos.revisados : [],
    },
    materiais: { ...(dados.materiais || {}) },
    repeticoes: { ...(dados.repeticoes || {}) },
    sessoes: Array.isArray(dados.sessoes) ? dados.sessoes : [],
  };
}

/** Lê o conteúdo de um arquivo de backup (v3 ou da versão 2.x) como dados normalizados. */
function lerBackup(texto) {
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (dados?.progresso?.versao === VERSAO) return normalizar(dados.progresso);
  if (dados?.dadosCompletos) return migrarV2({ ...dados.dadosCompletos, idioma: dados.idioma });
  if (validarPacote(dados)) {
    throw new Error('Este arquivo é um material de estudo. Abra-o em "Revisar arquivo".');
  }
  throw new Error('Formato de backup não reconhecido.');
}

export class ProgressService {
  constructor({ chave = CHAVE } = {}) {
    this.chave = chave;
    this.dados = this._carregar();
  }

  _carregar() {
    const salvo = storage.lerJSON(this.chave);
    if (!salvo) return dadosIniciais();
    if (salvo.versao === VERSAO) {
      const dados = normalizar(salvo);
      if (!salvo.origem) storage.salvarJSON(this.chave, dados); // fixa a origem de vez
      return dados;
    }
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
    // O histórico guarda só os últimos; o contador guarda o total.
    if (lista === 'exportados') this.dados.totais.criados.pdfs++;
    this.salvar();
  }

  /**
   * Conta um material criado no app.
   * @param {'textos'|'mp3'|'kits'} tipo (PDFs são contados em registrarArquivo)
   */
  contarCriado(tipo) {
    if (!(tipo in this.dados.totais.criados)) return;
    this.dados.totais.criados[tipo]++;
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

  /** Contadores deste navegador somados aos de outros aparelhos (vindos de backups). */
  _totaisGerais() {
    const outras = Object.values(this.dados.outrasOrigens);
    const repeticoes = { ...this.dados.repeticoes };
    for (const o of outras) {
      for (const [palavra, vezes] of Object.entries(o.repeticoes)) {
        repeticoes[palavra] = (repeticoes[palavra] || 0) + vezes;
      }
    }
    return {
      totais: somarTotais([this.dados.totais, ...outras.map((o) => o.totais)]),
      repeticoes,
    };
  }

  estatisticas() {
    const { totais, repeticoes } = this._totaisGerais();
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
      criados: totais.criados,
      exportados: Math.max(totais.criados.pdfs, this.dados.arquivos.exportados.length),
      revisados: this.dados.arquivos.revisados.length,
      aparelhos: 1 + Object.keys(this.dados.outrasOrigens).length,
      ultimoBackup: this.dados.ultimoBackup,
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

  /** Há algo para guardar num backup? */
  get temProgresso() {
    const { totais } = this._totaisGerais();
    return (
      totais.sessoes > 0 ||
      Object.values(totais.criados).some(Boolean) ||
      Object.keys(this.dados.materiais).length > 0
    );
  }

  /** Lembrar do backup: há progresso e nenhum backup nos últimos 14 dias. */
  precisaBackup(hoje = new Date()) {
    if (!this.temProgresso) return false;
    const ultimo = this.dados.ultimoBackup ? new Date(this.dados.ultimoBackup) : null;
    return !ultimo || diferencaDias(ultimo, hoje) >= DIAS_LEMBRETE_BACKUP;
  }

  /** Nome do arquivo de backup (com a data, para achar fácil na pasta). */
  nomeArquivoBackup(hoje = new Date()) {
    return `progresso-aprendendo-palavras_${dataISO(hoje)}.json`;
  }

  /** Conteúdo do backup. Marca a data do backup (para o lembrete). */
  exportarJSON() {
    this.dados.ultimoBackup = new Date().toISOString();
    this.salvar();
    return {
      app: APP.id,
      tipoArquivo: 'progresso',
      versao: VERSAO,
      exportadoEm: this.dados.ultimoBackup,
      progresso: this.dados,
    };
  }

  /**
   * Importa um backup (formato v3 ou o JSON exportado pela versão 2.x).
   * - `juntar` (padrão): soma o progresso do arquivo ao deste navegador, sem contar em dobro;
   * - `substituir`: troca o progresso deste navegador pelo do arquivo.
   * @returns {number} total de sessões depois da importação
   */
  importarJSON(texto, { modo = 'juntar' } = {}) {
    const outro = lerBackup(texto);
    if (modo === 'substituir') {
      const ultimoBackup = this.dados.ultimoBackup;
      // Mantém a identificação deste navegador; o arquivo entra como outra origem.
      this.dados = { ...dadosIniciais(), origem: this.dados.origem, ultimoBackup };
    }
    this._juntar(outro);
    this.salvar();
    return this.estatisticas().sessoes;
  }

  _juntar(outro) {
    const d = this.dados;
    const contribuicoes = [
      [outro.origem, { totais: outro.totais, repeticoes: outro.repeticoes }],
      ...Object.entries(outro.outrasOrigens),
    ];
    for (const [id, c] of contribuicoes) {
      if (id === d.origem) {
        d.totais = maiorTotais(d.totais, c.totais);
        d.repeticoes = maiorRepeticoes(d.repeticoes, c.repeticoes);
      } else {
        const atual = d.outrasOrigens[id];
        d.outrasOrigens[id] = {
          totais: maiorTotais(atual?.totais, c.totais),
          repeticoes: maiorRepeticoes(atual?.repeticoes, c.repeticoes),
        };
      }
    }
    const chaveSessao = (s) => `${s.data}|${s.tipo}|${s.quantidade}|${s.titulo || ''}`;
    d.sessoes = unirPorChave(d.sessoes, outro.sessoes, chaveSessao, LIMITE_SESSOES);
    for (const lista of ['exportados', 'revisados']) {
      d.arquivos[lista] = unirPorChave(
        d.arquivos[lista],
        outro.arquivos[lista],
        (a) => `${a.nome}|${a.data}`,
        LIMITE_ARQUIVOS
      );
    }
    for (const [id, material] of Object.entries(outro.materiais)) {
      const atual = d.materiais[id];
      const maisNovo =
        !atual || String(material.atualizadoEm) > String(atual.atualizadoEm) ? material : atual;
      d.materiais[id] = {
        ...maisNovo,
        revisao: revisaoMaisRecente(material.revisao, atual?.revisao),
      };
    }
    d.primeiroEstudo = menorData(d.primeiroEstudo, outro.primeiroEstudo);
    d.ultimoEstudo = maiorData(d.ultimoEstudo, outro.ultimoEstudo);
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
