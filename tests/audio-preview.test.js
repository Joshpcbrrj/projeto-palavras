import { describe, expect, test, vi } from 'vitest';
import { OuvirEnquantoGera } from '../js/audio/export/preview.js';

function criarContexto() {
  const fontes = [];
  const buffers = [];
  const contexto = {
    currentTime: 2,
    destination: {},
    state: 'running',
    createBuffer: vi.fn((canais, tamanho, taxa) => {
      const buffer = {
        duration: tamanho / taxa,
        copyToChannel: vi.fn(),
      };
      buffers.push({ canais, tamanho, taxa, buffer });
      return buffer;
    }),
    createBufferSource: vi.fn(() => {
      const fonte = {
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      fontes.push(fonte);
      return fonte;
    }),
    close: vi.fn(async () => {}),
  };
  return { contexto, fontes, buffers };
}

describe('prévia de áudio durante exportação', () => {
  test('agenda os trechos em sequência e remove fontes concluídas', () => {
    const { contexto, fontes, buffers } = criarContexto();
    const previa = new OuvirEnquantoGera({ ContextoAudio: vi.fn(() => contexto) });

    previa.adicionar(new Float32Array([0.1, 0.2]), 24000, 500);
    previa.adicionar([0.3, 0.4, 0.5], 24000, 0);

    expect(previa.disponivel).toBe(true);
    expect(buffers).toHaveLength(2);
    expect(buffers[0].buffer.copyToChannel).toHaveBeenCalledWith(expect.any(Float32Array), 0);
    expect(fontes[0].start).toHaveBeenCalledWith(2.05);
    expect(fontes[1].start).toHaveBeenCalledWith(2.05 + 2 / 24000 + 0.5);
    fontes[0].onended();
    expect(previa.fontes.has(fontes[0])).toBe(false);
    expect(previa.fontes.has(fontes[1])).toBe(true);
  });

  test('ignora amostras vazias e para fontes e contexto ativos', async () => {
    const { contexto, fontes } = criarContexto();
    const previa = new OuvirEnquantoGera({ ContextoAudio: vi.fn(() => contexto) });

    previa.adicionar([], 24000);
    expect(contexto.createBuffer).not.toHaveBeenCalled();
    previa.adicionar(new Float32Array([0.1]), 24000);
    previa.parar();

    expect(fontes[0].stop).toHaveBeenCalledOnce();
    expect(contexto.close).toHaveBeenCalledOnce();
    expect(previa.disponivel).toBe(false);
  });

  test('funciona quando áudio não é suportado ou a fonte já terminou', async () => {
    const indisponivel = new OuvirEnquantoGera({ ContextoAudio: undefined });
    expect(indisponivel.disponivel).toBe(false);
    indisponivel.adicionar(new Float32Array([1]), 24000);
    indisponivel.parar();

    const { contexto, fontes } = criarContexto();
    contexto.state = 'closed';
    const previa = new OuvirEnquantoGera({ ContextoAudio: vi.fn(() => contexto) });
    previa.adicionar(new Float32Array([1]), 24000);
    fontes[0].stop.mockImplementation(() => {
      throw new Error('já finalizada');
    });
    previa.parar();

    expect(contexto.close).not.toHaveBeenCalled();
    expect(previa.fontes.size).toBe(0);
  });
});
