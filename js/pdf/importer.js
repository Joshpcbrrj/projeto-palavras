/**
 * Leitura de arquivos para revisão: PDF, TXT, MD e JSON.
 *
 * Ordem de interpretação:
 * 1. pacote de dados embutido (PDFs/JSON gerados pela versão 3) — fidelidade total;
 * 2. formatos das versões anteriores (lista numerada, texto personalizado);
 * 3. texto livre (tratado como um texto para leitura/estudo).
 */

import { APP, TIPOS } from '../config.js';
import { decodificarPacote, tituloPadrao, validarPacote } from './format.js';
import { interpretarLegado } from './legacy.js';
import { obterPdfJs } from './libs.js';
import { normalizarTexto } from '../text/extract.js';
import { lerBytesDoArquivo, lerTextoDoArquivo } from '../core/dom.js';

export const ORIGENS = Object.freeze({
  PACOTE: 'pacote',
  LEGADO: 'legado',
  TEXTO_LIVRE: 'texto-livre',
});

export class ErroImportacao extends Error {}

function extensao(nome) {
  return String(nome || '')
    .toLowerCase()
    .split('.')
    .pop();
}

function tituloDoArquivo(nome) {
  return String(nome || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')
    .trim();
}

/** Monta um material (pacote + informações da origem) a partir de dados parciais. */
function criarMaterial(dados, { nomeArquivo, origem }) {
  const pacote = validarPacote({ app: APP.id, ...dados });
  if (!pacote) return null;
  return { ...pacote, nomeArquivo, origem };
}

/**
 * Reconstrói o texto de um PDF agrupando os fragmentos por linha (posição vertical).
 * @param {object} pdf documento do pdf.js
 */
export async function extrairTextoPdf(pdf) {
  let texto = '';
  for (let numero = 1; numero <= pdf.numPages; numero++) {
    const pagina = await pdf.getPage(numero);
    const conteudo = await pagina.getTextContent();
    let ultimoY = null;
    let linha = '';
    for (const item of conteudo.items) {
      if (typeof item.str !== 'string') continue;
      const y = Math.round(item.transform[5]);
      if (ultimoY !== null && Math.abs(y - ultimoY) > 3) {
        if (linha.trim()) texto += linha.trim() + '\n';
        linha = item.str;
      } else {
        linha += (linha && item.str && !linha.endsWith(' ') ? ' ' : '') + item.str;
      }
      if (item.hasEOL) {
        if (linha.trim()) texto += linha.trim() + '\n';
        linha = '';
      }
      ultimoY = y;
    }
    if (linha.trim()) texto += linha.trim() + '\n';
    texto += '\n';
  }
  return texto;
}

/** Interpreta texto (de .txt ou extraído de PDF). */
export function interpretarTexto(texto, nomeArquivo) {
  const pacote = decodificarPacote(texto);
  if (pacote) return { ...pacote, nomeArquivo, origem: ORIGENS.PACOTE };

  const legado = interpretarLegado(texto);
  if (legado) {
    const material = criarMaterial(legado, { nomeArquivo, origem: ORIGENS.LEGADO });
    if (material) return material;
  }

  const limpo = normalizarTexto(texto);
  if (!limpo) throw new ErroImportacao(`"${nomeArquivo}" não contém texto legível.`);
  return criarMaterial(
    {
      tipo: TIPOS.TEXTO,
      titulo: tituloDoArquivo(nomeArquivo) || tituloPadrao(TIPOS.TEXTO),
      texto: limpo,
    },
    { nomeArquivo, origem: ORIGENS.TEXTO_LIVRE }
  );
}

/** Interpreta JSON exportado pelo app (v3) ou pelo analisador antigo. */
export function interpretarJSON(conteudo, nomeArquivo) {
  let dados;
  try {
    dados = JSON.parse(conteudo);
  } catch {
    throw new ErroImportacao(`"${nomeArquivo}" não é um JSON válido.`);
  }

  const lista = Array.isArray(dados?.materiais) ? dados.materiais : [dados];
  const materiais = lista
    .map((item) => validarPacote(item))
    .filter(Boolean)
    .map((p) => ({ ...p, nomeArquivo, origem: ORIGENS.PACOTE }));
  if (materiais.length) return materiais;

  // Formato do antigo "Verificar estudo": { itens: [...], tipoEstudo }
  if (Array.isArray(dados?.itens)) {
    const tipo = dados.tipoEstudo === TIPOS.FRASES ? TIPOS.FRASES : TIPOS.PALAVRAS;
    const material = criarMaterial(
      { tipo, titulo: tituloPadrao(tipo), itens: dados.itens },
      { nomeArquivo, origem: ORIGENS.LEGADO }
    );
    if (material) return [material];
  }

  if (dados?.dadosCompletos || dados?.progresso) {
    throw new ErroImportacao(
      `"${nomeArquivo}" é um backup de progresso. Importe-o na tela "Meu progresso".`
    );
  }
  throw new ErroImportacao(`"${nomeArquivo}" não tem um formato reconhecido.`);
}

/** Abre um PDF e devolve o material. */
export async function interpretarPdf(dadosBinarios, nomeArquivo, pdfjsLib) {
  const lib = pdfjsLib || (await obterPdfJs());
  let pdf;
  try {
    // Só precisamos do texto e das propriedades; os avisos sobre fontes não importam aqui.
    pdf = await lib.getDocument({ data: dadosBinarios, verbosity: 0 }).promise;
  } catch {
    throw new ErroImportacao(
      `Não foi possível abrir "${nomeArquivo}". O PDF pode estar corrompido.`
    );
  }
  try {
    const { info } = await pdf.getMetadata().catch(() => ({ info: {} }));
    const pacote = decodificarPacote(info?.Keywords) || decodificarPacote(info?.Subject);
    if (pacote) return { ...pacote, nomeArquivo, origem: ORIGENS.PACOTE };

    const texto = await extrairTextoPdf(pdf);
    if (!texto.trim()) {
      throw new ErroImportacao(
        `"${nomeArquivo}" não tem texto selecionável (pode ser um PDF digitalizado/imagem).`
      );
    }
    return interpretarTexto(texto, nomeArquivo);
  } finally {
    pdf.destroy?.();
  }
}

/**
 * Lê um arquivo selecionado pelo usuário.
 * @param {File} arquivo
 * @returns {Promise<object[]>} lista de materiais (um arquivo JSON pode conter vários)
 */
export async function lerArquivo(arquivo) {
  const nome = arquivo.name || 'arquivo';
  const ext = extensao(nome);

  if (ext === 'pdf' || arquivo.type === 'application/pdf') {
    const buffer = await lerBytesDoArquivo(arquivo);
    return [await interpretarPdf(new Uint8Array(buffer), nome)];
  }
  if (ext === 'json') {
    return interpretarJSON(await lerTextoDoArquivo(arquivo), nome);
  }
  if (['txt', 'md', 'text', 'markdown'].includes(ext) || arquivo.type.startsWith('text/')) {
    return [interpretarTexto(await lerTextoDoArquivo(arquivo), nome)];
  }
  throw new ErroImportacao(`Formato não suportado: "${nome}". Use PDF, TXT, MD ou JSON.`);
}
