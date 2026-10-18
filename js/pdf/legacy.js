/**
 * Leitura dos formatos gerados pelas versões anteriores do app (v1/v2).
 *
 * Esses PDFs não tinham o pacote de dados embutido, então os itens são
 * reconstruídos a partir do texto extraído:
 * - listas numeradas ("1. casa  2. carro ...") com o bloco "=== METADADOS DO ESTUDO ===";
 * - textos personalizados entre "=== CONTEUDO ===" e "=== FIM CONTEUDO ===".
 */

import { IDIOMAS, TIPOS } from '../config.js';
import { criarRevisao, tituloPadrao } from './format.js';
import { lerData } from '../core/utils.js';

const BLOCO_METADADOS = /=== METADADOS DO ESTUDO ===([\s\S]*?)=== FIM METADADOS ===/i;
const BLOCO_REVISAO = /=== REVIS[AÃ]O \(offline\) ===([\s\S]*?)=== FIM REVIS[AÃ]O ===/i;

const LINHAS_CABECALHO = [
  /^(minhas\s+)?(palavras|frases)\s+estudadas$/i,
  /^relat[oó]rio de (palavras|frases) estudadas$/i,
  /^data:\s/i,
  /^total( de \w+)?:\s/i,
  /^tempo( total| por \w+)?:\s/i,
  /^total de arquivos analisados:/i,
  /^p[aá]gina \d+( de \d+)?$/i,
  /^aprendendo palavras\b.*$/i,
];

/** Lê os campos "CHAVE: valor" de um bloco de texto. */
export function lerCampos(texto) {
  const campos = {};
  for (const linha of String(texto || '').split('\n')) {
    const m = linha.match(/^\s*([A-Z_]+):\s*(.*)$/);
    if (m) campos[m[1]] = m[2].trim();
  }
  return campos;
}

/** Junta linhas quebradas pela largura da página, preservando fins de frase e parágrafos. */
export function refluirTexto(texto) {
  const linhas = String(texto || '')
    .split('\n')
    .map((l) => l.trim());
  const paragrafos = [];
  let atual = '';
  for (const linha of linhas) {
    if (!linha) {
      if (atual) paragrafos.push(atual);
      atual = '';
      continue;
    }
    atual = atual ? `${atual} ${linha}` : linha;
    if (/[.!?:。！？]["'”’»)]*$/u.test(linha) && linha.length < 60) {
      // Linha curta terminando em pontuação costuma ser fim de parágrafo/título.
      paragrafos.push(atual);
      atual = '';
    }
  }
  if (atual) paragrafos.push(atual);
  return paragrafos.join('\n');
}

/**
 * Extrai itens de uma lista numerada sequencial (1., 2., 3., ...).
 * Exige numeração sequencial para não confundir "em 2020. Depois" com um item.
 */
export function extrairItensNumerados(texto) {
  const linhas = String(texto || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !LINHAS_CABECALHO.some((r) => r.test(l)));
  const corpo = linhas.join(' ');

  const regex = /(?:^|\s)(\d{1,4})\.\s+/g;
  const marcos = [];
  let esperado = 1;
  let m;
  while ((m = regex.exec(corpo)) !== null) {
    if (Number(m[1]) === esperado) {
      marcos.push({ marcador: m.index, conteudo: m.index + m[0].length });
      esperado++;
    }
  }

  return marcos
    .map((marco, i) => corpo.slice(marco.conteudo, marcos[i + 1]?.marcador ?? corpo.length))
    .map((item) =>
      item
        .replace(/\s+/g, ' ')
        .replace(/[.;]+$/, '')
        .trim()
    )
    .filter(Boolean);
}

function idiomaValido(codigo) {
  return IDIOMAS[codigo] ? codigo : undefined;
}

function revisaoLegada(dataBR) {
  const data = lerData(dataBR);
  return data ? criarRevisao({ revisarEm: data }) : null;
}

/**
 * Interpreta o texto extraído de um arquivo antigo.
 * @returns {object|null} dados no formato de pacote (sem `app`), ou null se não reconhecer.
 */
export function interpretarLegado(textoExtraido) {
  const texto = String(textoExtraido || '').replace(/\r/g, '');

  // Texto personalizado (v2)
  const inicioConteudo = texto.indexOf('=== CONTEUDO ===');
  if (inicioConteudo !== -1) {
    const cabecalho = texto.slice(0, inicioConteudo);
    const campos = lerCampos(cabecalho);
    const fim = texto.indexOf('=== FIM CONTEUDO ===', inicioConteudo);
    const conteudo = texto
      .slice(inicioConteudo + '=== CONTEUDO ==='.length, fim === -1 ? undefined : fim)
      .trim();
    const revisao = texto.match(BLOCO_REVISAO);
    return {
      tipo: TIPOS.TEXTO,
      titulo: campos.TITULO || tituloPadrao(TIPOS.TEXTO),
      idioma: idiomaValido(campos.IDIOMA),
      texto: refluirTexto(conteudo),
      revisao: revisao ? revisaoLegada(lerCampos(revisao[1]).DATA_REVISAR) : null,
      criadoEm: campos.CRIADO_EM || undefined,
    };
  }

  // Lista de palavras/frases (v1/v2)
  const metadados = texto.match(BLOCO_METADADOS);
  const campos = metadados ? lerCampos(metadados[1]) : {};
  let tipo = campos.TIPO === TIPOS.FRASES || campos.TIPO === TIPOS.PALAVRAS ? campos.TIPO : null;
  if (!tipo) {
    const titulo = texto.match(/(palavras|frases)\s+estudadas/i);
    if (!titulo) return null;
    tipo = titulo[1].toLowerCase() === 'frases' ? TIPOS.FRASES : TIPOS.PALAVRAS;
  }

  const corpo = metadados ? texto.replace(BLOCO_METADADOS, '') : texto;
  const itens = extrairItensNumerados(corpo);
  if (!itens.length) return null;

  return {
    tipo,
    titulo: tituloPadrao(tipo),
    idioma: idiomaValido(campos.IDIOMA),
    itens,
    revisao: null,
    criadoEm: campos.DATA || undefined,
  };
}
