import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ESTADOS_SESSAO, StudySession } from '../js/study/session.js';

describe('StudySession', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function criar(opcoes = {}) {
    const exibidos = [];
    const falados = [];
    const sessao = new StudySession({
      itens: ['um', 'dois', 'três'],
      intervaloMs: 1000,
      falar: async (item) => falados.push(item),
      aoMostrar: (item) => exibidos.push(item),
      ...opcoes,
    });
    return { sessao, exibidos, falados };
  }

  test('percorre todos os itens no intervalo configurado e conclui', async () => {
    const aoConcluir = vi.fn();
    const { sessao, exibidos, falados } = criar({ aoConcluir });
    sessao.iniciar();
    await vi.advanceTimersByTimeAsync(0);
    expect(exibidos).toEqual(['um']);
    await vi.advanceTimersByTimeAsync(1000);
    expect(exibidos).toEqual(['um', 'dois']);
    await vi.advanceTimersByTimeAsync(2000);
    expect(exibidos).toEqual(['um', 'dois', 'três']);
    expect(falados).toEqual(['um', 'dois', 'três']);
    expect(sessao.estado).toBe(ESTADOS_SESSAO.CONCLUIDA);
    expect(aoConcluir).toHaveBeenCalledTimes(1);
  });

  test('pausar realmente para o temporizador (bug antigo: o timer continuava)', async () => {
    const { sessao, exibidos } = criar();
    sessao.iniciar();
    await vi.advanceTimersByTimeAsync(0);
    sessao.pausar();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(exibidos).toEqual(['um']);
    expect(sessao.estado).toBe(ESTADOS_SESSAO.PAUSADA);
  });

  test('retomar várias vezes não cria laços paralelos', async () => {
    const { sessao, exibidos } = criar({ itens: ['a', 'b', 'c', 'd', 'e'] });
    sessao.iniciar();
    await vi.advanceTimersByTimeAsync(0);
    for (let i = 0; i < 5; i++) {
      sessao.pausar();
      sessao.retomar();
    }
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    // Um único laço: após 1 intervalo, apenas um avanço.
    expect(sessao.indice).toBe(1);
    expect(exibidos.at(-1)).toBe('b');
  });

  test('próximo/anterior funcionam pausado e rodando', async () => {
    const { sessao, exibidos } = criar();
    sessao.iniciar();
    await vi.advanceTimersByTimeAsync(0);
    sessao.pausar();
    sessao.proximo();
    expect(sessao.indice).toBe(1);
    expect(sessao.estado).toBe(ESTADOS_SESSAO.PAUSADA);
    sessao.anterior();
    expect(exibidos.at(-1)).toBe('um');
    sessao.retomar();
    sessao.proximo();
    await vi.advanceTimersByTimeAsync(0);
    expect(sessao.itemAtual).toBe('dois');
    expect(sessao.estado).toBe(ESTADOS_SESSAO.RODANDO);
  });

  test('avançar no último item conclui a sessão', async () => {
    const aoConcluir = vi.fn();
    const { sessao } = criar({ aoConcluir });
    sessao.iniciar(2);
    await vi.advanceTimersByTimeAsync(0);
    sessao.proximo();
    expect(sessao.estado).toBe(ESTADOS_SESSAO.CONCLUIDA);
    expect(aoConcluir).toHaveBeenCalled();
  });

  test('a fala termina antes de começar a pausa do intervalo', async () => {
    const { sessao, exibidos } = criar({
      falar: (_item, signal) =>
        new Promise((r) => {
          const t = setTimeout(r, 3000);
          signal.addEventListener('abort', () => {
            clearTimeout(t);
            r();
          });
        }),
    });
    sessao.iniciar();
    await vi.advanceTimersByTimeAsync(3500);
    expect(exibidos).toEqual(['um']); // ainda na pausa após a fala
    await vi.advanceTimersByTimeAsync(600);
    expect(exibidos).toEqual(['um', 'dois']);
  });

  test('registra itens vistos e tempo ativo', async () => {
    const { sessao } = criar();
    sessao.iniciar();
    await vi.advanceTimersByTimeAsync(1500);
    sessao.encerrar();
    expect(sessao.itensVistos).toEqual(['um', 'dois']);
    expect(sessao.segundosAtivos).toBeCloseTo(1.5, 1);
    expect(sessao.estado).toBe(ESTADOS_SESSAO.ENCERRADA);
  });

  test('exige ao menos um item', () => {
    expect(() => new StudySession({ itens: [], intervaloMs: 1000 })).toThrow();
  });
});
