import { afterEach, describe, expect, test, vi } from 'vitest';
import { criarRasterizador } from '../js/pdf/raster.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function prepararCanvas({ contexto = true } = {}) {
  const chamadas = [];
  const ctx = {
    font: '',
    fillStyle: '',
    textBaseline: '',
    measureText: (texto) => ({ width: [...texto].length * 10 }),
    clearRect: vi.fn(),
    fillText: vi.fn((texto, x, y) => chamadas.push({ texto, x, y })),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: contexto ? vi.fn(() => ctx) : vi.fn(() => null),
    toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
  };
  const criarElemento = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((nome) =>
    nome === 'canvas' ? canvas : criarElemento(nome)
  );
  return { canvas, chamadas, ctx };
}

describe('rasterização de texto para PDF', () => {
  test('retorna null quando canvas 2D não está disponível', () => {
    prepararCanvas({ contexto: false });
    expect(criarRasterizador()).toBeNull();
  });

  test('desenha texto latino com quebra de linha e estilos informados', () => {
    const { canvas, chamadas, ctx } = prepararCanvas();
    const rasterizar = criarRasterizador();
    const resultado = rasterizar('palavra longa\noutra linha', {
      tamanhoPt: 12,
      larguraMm: 15,
      cor: [1, 2, 3],
      negrito: true,
    });

    expect(resultado).toMatchObject({
      imagem: 'data:image/png;base64,abc',
      larguraMm: 15,
    });
    expect(resultado.alturaMm).toBeGreaterThan(0);
    expect(chamadas.map(({ texto }) => texto)).toEqual(['palavra longa', 'outra linha']);
    expect(ctx.font).toContain('700');
    expect(ctx.fillStyle).toBe('rgb(1,2,3)');
    expect(ctx.textBaseline).toBe('middle');
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
  });

  test('quebra idiomas sem espaços por caractere e aceita cores e altura padrão', () => {
    const { chamadas, ctx } = prepararCanvas();
    const rasterizar = criarRasterizador();
    rasterizar('日本語の文章', { larguraMm: 5 });

    expect(chamadas.length).toBeGreaterThan(1);
    expect(chamadas.map(({ texto }) => texto).join('')).toBe('日本語の文章');
    expect(ctx.font).not.toContain('700');
    expect(ctx.fillStyle).toBe('rgb(17,24,39)');
  });
});
