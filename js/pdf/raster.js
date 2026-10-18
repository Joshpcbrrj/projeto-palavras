/**
 * Renderiza texto em imagem (canvas) para incluir em PDFs.
 *
 * As fontes padrão do jsPDF só cobrem o alfabeto latino (Latin-1). Para idiomas
 * como russo, japonês, chinês e coreano, o texto é desenhado com as fontes do
 * sistema em um canvas e inserido como imagem — sem precisar baixar fontes
 * enormes. Os dados exatos continuam no pacote embutido, então a revisão no app
 * não depende dessa imagem.
 */

const ESCALA = 4; // pixels por ponto tipográfico (nitidez na impressão)
const PT_POR_MM = 72 / 25.4;

function quebrarLinhas(ctx, texto, larguraMax) {
  const linhas = [];
  for (const paragrafo of String(texto).split('\n')) {
    // Idiomas sem espaço (CJK) são quebrados por caractere.
    const tokens = /\s/.test(paragrafo) ? paragrafo.split(/(\s+)/) : Array.from(paragrafo);
    let atual = '';
    for (const token of tokens) {
      const tentativa = atual + token;
      if (ctx.measureText(tentativa).width <= larguraMax || !atual) {
        atual = tentativa;
      } else {
        linhas.push(atual.trimEnd());
        atual = token.trimStart();
      }
    }
    linhas.push(atual.trimEnd());
  }
  return linhas;
}

/**
 * @returns {null | ((texto: string, opcoes: object) => {imagem: string, larguraMm: number, alturaMm: number})}
 */
export function criarRasterizador() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext?.('2d');
  if (!ctx || typeof canvas.toDataURL !== 'function') return null;

  return (
    texto,
    {
      tamanhoPt = 11,
      larguraMm = 170,
      cor = [17, 24, 39],
      negrito = false,
      alturaLinha = 1.35,
    } = {}
  ) => {
    const fonte = `${negrito ? '700 ' : ''}${tamanhoPt * ESCALA}px "Noto Sans", "Segoe UI", "Hiragino Sans", "Microsoft YaHei", "Malgun Gothic", system-ui, sans-serif`;
    ctx.font = fonte;
    const larguraPx = Math.ceil(larguraMm * PT_POR_MM * ESCALA);
    const linhas = quebrarLinhas(ctx, texto, larguraPx);
    const alturaLinhaPx = tamanhoPt * ESCALA * alturaLinha;

    canvas.width = larguraPx;
    canvas.height = Math.ceil(alturaLinhaPx * linhas.length);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = fonte;
    ctx.fillStyle = `rgb(${cor.join(',')})`;
    ctx.textBaseline = 'middle';
    linhas.forEach((linha, i) => ctx.fillText(linha, 0, alturaLinhaPx * (i + 0.5)));

    return {
      imagem: canvas.toDataURL('image/png'),
      larguraMm,
      alturaMm: canvas.height / ESCALA / PT_POR_MM,
    };
  };
}
