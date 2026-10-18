/**
 * Geração dos PDFs de estudo (palavras, frases e textos).
 *
 * Cada PDF tem um layout legível para impressão e, nas propriedades do
 * documento, o pacote de dados que permite ao app reabri-lo para revisão.
 */

import { APP, IDIOMAS, TIPOS, nomeTipo } from '../config.js';
import { carimboArquivo, formatarDataBR, slug } from '../core/utils.js';
import { codificarPacote } from './format.js';
import { obterJsPDF } from './libs.js';
import { criarRasterizador } from './raster.js';

const A4 = { largura: 210, altura: 297 };
const MARGEM = 18;
const LARGURA_UTIL = A4.largura - MARGEM * 2;
const RODAPE = 14;
const MM_POR_PT = 25.4 / 72;

const COR = {
  primaria: [109, 40, 217],
  primariaClara: [237, 233, 254],
  texto: [17, 24, 39],
  suave: [100, 116, 139],
  linha: [226, 232, 240],
  fundo: [248, 250, 252],
  branco: [255, 255, 255],
};

const SUBSTITUICOES = [
  [/[\u2018\u2019\u201A\u2032]/g, "'"],
  [/[\u201C\u201D\u201E\u2033]/g, '"'],
  [/[\u2013\u2014\u2212]/g, '-'],
  [/…/g, '...'],
  [/[\u2022\u25CF]/g, '·'],
  [/[\u00A0\u2007\u202F]/g, ' '],
  [/[\u200B-\u200D\uFEFF]/g, ''],
];

// Caracteres que as fontes padrão do PDF (Latin-1) não conseguem desenhar.
const FORA_DO_LATIN1 = /[^\t\n\r\x20-\x7E\xA0-\xFF]/;
const FORA_DO_LATIN1_GLOBAL = new RegExp(FORA_DO_LATIN1.source, 'g');

/** Adapta o texto às fontes padrão do PDF (Latin-1). */
export function paraLatin1(texto) {
  let resultado = String(texto ?? '');
  for (const [regex, troca] of SUBSTITUICOES) resultado = resultado.replace(regex, troca);
  return resultado;
}

export function cabeEmLatin1(texto) {
  return !FORA_DO_LATIN1.test(paraLatin1(texto));
}

export function nomeArquivoPdf(pacote, data = new Date()) {
  const prefixo = {
    [TIPOS.PALAVRAS]: 'palavras',
    [TIPOS.FRASES]: 'frases',
    [TIPOS.TEXTO]: 'texto',
  }[pacote.tipo];
  return `${prefixo}_${slug(pacote.titulo, 30)}_${carimboArquivo(data)}.pdf`;
}

class Escritor {
  constructor(doc, rasterizar) {
    this.doc = doc;
    this.rasterizar = rasterizar;
    this.y = MARGEM;
  }

  get limite() {
    return A4.altura - MARGEM - RODAPE;
  }

  novaPagina() {
    this.doc.addPage();
    this.y = MARGEM;
  }

  garantirEspaco(altura) {
    if (this.y + altura > this.limite) this.novaPagina();
  }

  fonte({ tamanho = 11, negrito = false, cor = COR.texto } = {}) {
    this.doc.setFont('helvetica', negrito ? 'bold' : 'normal');
    this.doc.setFontSize(tamanho);
    this.doc.setTextColor(...cor);
  }

  /**
   * Prepara um bloco de texto com quebra de linha, devolvendo a altura (mm)
   * e uma função para desenhá-lo. Usa imagem quando o texto não cabe em Latin-1.
   */
  bloco(
    texto,
    {
      tamanho = 11,
      negrito = false,
      cor = COR.texto,
      largura = LARGURA_UTIL,
      alturaLinha = 1.4,
    } = {}
  ) {
    const doc = this.doc;
    if (!cabeEmLatin1(texto) && this.rasterizar) {
      const img = this.rasterizar(texto, {
        tamanhoPt: tamanho,
        larguraMm: largura,
        cor,
        negrito,
        alturaLinha,
      });
      return {
        altura: img.alturaMm,
        desenhar: (x, y) => doc.addImage(img.imagem, 'PNG', x, y, img.larguraMm, img.alturaMm),
      };
    }
    this.fonte({ tamanho, negrito, cor });
    const linhas = doc.splitTextToSize(
      paraLatin1(texto).replace(FORA_DO_LATIN1_GLOBAL, '?'),
      largura
    );
    const passo = tamanho * MM_POR_PT * alturaLinha;
    return {
      altura: linhas.length * passo,
      desenhar: (x, y) => {
        this.fonte({ tamanho, negrito, cor });
        linhas.forEach((linha, i) => doc.text(linha, x, y + i * passo, { baseline: 'top' }));
      },
    };
  }
}

function desenharCabecalho(esc, pacote, hoje) {
  const { doc } = esc;
  const idioma = IDIOMAS[pacote.idioma];

  doc.setFillColor(...COR.primaria);
  doc.rect(0, 0, A4.largura, 34, 'F');

  // O título ocupa uma única linha no cabeçalho; títulos longos são abreviados.
  const textoTitulo =
    pacote.titulo.length > 48 ? `${pacote.titulo.slice(0, 47).trimEnd()}…` : pacote.titulo;
  const titulo = esc.bloco(textoTitulo, {
    tamanho: 20,
    negrito: true,
    cor: COR.branco,
    alturaLinha: 1.2,
  });
  titulo.desenhar(MARGEM, 9);

  const tipo = nomeTipo(pacote.tipo, { plural: pacote.tipo !== TIPOS.TEXTO, maiuscula: true });
  esc.fonte({ tamanho: 10, cor: [221, 214, 254] });
  doc.text(
    `${tipo} · ${idioma?.nome || pacote.idioma}`,
    MARGEM,
    9 + Math.min(titulo.altura, 9) + 3,
    {
      baseline: 'top',
    }
  );

  // Faixa de informações
  esc.y = 42;
  const quantidade =
    pacote.tipo === TIPOS.TEXTO
      ? `${pacote.texto.split(/\s+/).filter(Boolean).length} palavras`
      : `${pacote.itens.length} ${nomeTipo(pacote.tipo)}`;
  const info = [
    ['Gerado em', formatarDataBR(hoje)],
    ['Conteúdo', quantidade],
    ['Revisar em', pacote.revisao ? formatarDataBR(pacote.revisao.revisarEm) : '—'],
  ];
  doc.setFillColor(...COR.fundo);
  doc.setDrawColor(...COR.linha);
  doc.roundedRect(MARGEM, esc.y, LARGURA_UTIL, 15, 2.5, 2.5, 'FD');
  const larguraColuna = LARGURA_UTIL / info.length;
  info.forEach(([rotulo, valor], i) => {
    const x = MARGEM + 5 + i * larguraColuna;
    esc.fonte({ tamanho: 7.5, cor: COR.suave });
    doc.text(rotulo.toUpperCase(), x, esc.y + 3.5, { baseline: 'top' });
    esc.fonte({ tamanho: 10.5, negrito: true, cor: COR.texto });
    doc.text(paraLatin1(valor), x, esc.y + 8, { baseline: 'top' });
  });
  esc.y += 23;
}

function desenharPalavras(esc, itens) {
  const { doc } = esc;
  const colunas = 3;
  const larguraColuna = LARGURA_UTIL / colunas;
  const larguraTexto = larguraColuna - 12;
  let i = 0;
  while (i < itens.length) {
    const linha = itens.slice(i, i + colunas).map((item, k) => ({
      numero: i + k + 1,
      bloco: esc.bloco(item, { tamanho: 11.5, largura: larguraTexto, alturaLinha: 1.25 }),
    }));
    const altura = Math.max(...linha.map((c) => c.bloco.altura)) + 3.2;
    esc.garantirEspaco(altura);
    if ((i / colunas) % 2 === 0) {
      doc.setFillColor(...COR.fundo);
      doc.rect(MARGEM, esc.y - 1.2, LARGURA_UTIL, altura, 'F');
    }
    linha.forEach((celula, k) => {
      const x = MARGEM + k * larguraColuna + 2;
      esc.fonte({ tamanho: 9, negrito: true, cor: COR.primaria });
      doc.text(`${celula.numero}.`, x + 7, esc.y + 0.4, { baseline: 'top', align: 'right' });
      celula.bloco.desenhar(x + 9, esc.y);
    });
    esc.y += altura;
    i += colunas;
  }
}

function desenharFrases(esc, itens) {
  const { doc } = esc;
  itens.forEach((item, i) => {
    const bloco = esc.bloco(item, { tamanho: 12, largura: LARGURA_UTIL - 12, alturaLinha: 1.4 });
    const altura = bloco.altura + 5;
    esc.garantirEspaco(altura);
    doc.setFillColor(...COR.primariaClara);
    doc.circle(MARGEM + 3.6, esc.y + 2.4, 3.6, 'F');
    esc.fonte({ tamanho: 8.5, negrito: true, cor: COR.primaria });
    doc.text(String(i + 1), MARGEM + 3.6, esc.y + 2.4, { baseline: 'middle', align: 'center' });
    bloco.desenhar(MARGEM + 11, esc.y);
    esc.y += altura;
    if (i < itens.length - 1) {
      doc.setDrawColor(...COR.linha);
      doc.line(MARGEM + 11, esc.y - 2.5, MARGEM + LARGURA_UTIL, esc.y - 2.5);
    }
  });
}

function desenharTexto(esc, texto) {
  const paragrafos = String(texto).replace(/\r/g, '').split(/\n/);
  for (const paragrafo of paragrafos) {
    if (!paragrafo.trim()) {
      esc.y += 3;
      continue;
    }
    // Parágrafos longos são divididos linha a linha para quebrar páginas corretamente.
    const bloco = esc.bloco(paragrafo, { tamanho: 11.5, alturaLinha: 1.55 });
    if (bloco.altura <= esc.limite - MARGEM) {
      esc.garantirEspaco(bloco.altura);
      bloco.desenhar(MARGEM, esc.y);
      esc.y += bloco.altura + 2.5;
      continue;
    }
    const frases = paragrafo.match(/[^.!?。！？]+[.!?。！？]*\s*/gu) || [paragrafo];
    for (const frase of frases) {
      const parte = esc.bloco(frase, { tamanho: 11.5, alturaLinha: 1.55 });
      esc.garantirEspaco(parte.altura);
      parte.desenhar(MARGEM, esc.y);
      esc.y += parte.altura;
    }
    esc.y += 2.5;
  }
}

function desenharDicaRevisao(esc) {
  const { doc } = esc;
  const altura = 16;
  esc.y += 4;
  esc.garantirEspaco(altura);
  doc.setFillColor(...COR.primariaClara);
  doc.roundedRect(MARGEM, esc.y, LARGURA_UTIL, altura, 2.5, 2.5, 'F');
  esc.fonte({ tamanho: 9.5, negrito: true, cor: COR.primaria });
  doc.text('Como revisar este arquivo', MARGEM + 5, esc.y + 4, { baseline: 'top' });
  esc.fonte({ tamanho: 9, cor: COR.texto });
  doc.text(
    paraLatin1(`Abra o ${APP.nome}, escolha "Revisar arquivo" e selecione este PDF.`),
    MARGEM + 5,
    esc.y + 9.2,
    { baseline: 'top' }
  );
  esc.y += altura;
}

function desenharRodapes(doc, hoje) {
  const total = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= total; pagina++) {
    doc.setPage(pagina);
    const y = A4.altura - MARGEM + 4;
    doc.setDrawColor(...COR.linha);
    doc.line(MARGEM, y - 4, A4.largura - MARGEM, y - 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COR.suave);
    doc.text(`${APP.nome} · ${formatarDataBR(hoje)}`, MARGEM, y, { baseline: 'top' });
    doc.text(`Página ${pagina} de ${total}`, A4.largura - MARGEM, y, {
      baseline: 'top',
      align: 'right',
    });
  }
}

/**
 * Gera o documento PDF de um pacote.
 * @param {object} pacote pacote validado (ver format.js)
 * @param {object} [opcoes]
 * @param {Function} [opcoes.jsPDF] construtor do jsPDF (injetável para testes)
 * @param {Function|null} [opcoes.rasterizar] renderizador de texto em imagem
 * @param {Date} [opcoes.hoje]
 */
export function gerarDocumentoPdf(
  pacote,
  { jsPDF, rasterizar = criarRasterizador(), hoje = new Date() } = {}
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const esc = new Escritor(doc, rasterizar);

  desenharCabecalho(esc, pacote, hoje);
  if (pacote.tipo === TIPOS.PALAVRAS) desenharPalavras(esc, pacote.itens);
  else if (pacote.tipo === TIPOS.FRASES) desenharFrases(esc, pacote.itens);
  else desenharTexto(esc, pacote.texto);
  desenharDicaRevisao(esc);
  desenharRodapes(doc, hoje);

  doc.setProperties({
    title: paraLatin1(pacote.titulo),
    subject: `${APP.nome} - ${nomeTipo(pacote.tipo, { plural: pacote.tipo !== TIPOS.TEXTO })}`,
    author: APP.nome,
    creator: `${APP.nome} ${APP.versao}`,
    keywords: codificarPacote(pacote),
  });
  return doc;
}

/** Gera e baixa o PDF. Retorna o nome do arquivo. */
export async function exportarPdf(pacote) {
  const jsPDF = await obterJsPDF();
  const hoje = new Date();
  const doc = gerarDocumentoPdf(pacote, { jsPDF, hoje });
  const nome = nomeArquivoPdf(pacote, hoje);
  doc.save(nome);
  return nome;
}
