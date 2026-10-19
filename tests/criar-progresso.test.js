/**
 * Criação de textos: barra de progresso e artigos da Wikipédia guardados na visita.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { html, render } from '../js/core/dom.js';
import { MODOS, _limparCacheReferencias, criarTexto } from '../js/create/generator.js';
import { mostrarProgressoCriacao } from '../js/screens/CreateScreen.js';

afterEach(() => {
  vi.unstubAllGlobals();
  _limparCacheReferencias();
});

function areaDeProgresso() {
  const area = document.createElement('div');
  render(
    area,
    html`<div class="barra" id="criarBarra"><div id="criarBarraValor"></div></div>
      <strong id="criarPorcentagem">0%</strong>
      <p id="criarContagem"></p>`
  );
  return area;
}

describe('barra de progresso da criação', () => {
  test('mostra a porcentagem pelas palavras escritas, sem passar de 99% antes do fim', async () => {
    const area = areaDeProgresso();
    const progresso = mostrarProgressoCriacao(area, 1200);
    progresso.atualizar('word '.repeat(600));
    await vi.waitFor(() => expect(area.querySelector('#criarPorcentagem').textContent).toBe('50%'));
    expect(area.querySelector('#criarBarraValor').style.width).toBe('50%');
    expect(area.querySelector('#criarBarra').getAttribute('aria-valuenow')).toBe('50');
    expect(area.querySelector('#criarContagem').textContent).toMatch(
      /^600 de 1\.200 palavras · \d+ s$/
    );

    progresso.atualizar('word '.repeat(1500)); // a IA passou do tamanho: ainda não terminou
    await vi.waitFor(() => expect(area.querySelector('#criarPorcentagem').textContent).toBe('99%'));
    progresso.concluir();
    expect(area.querySelector('#criarPorcentagem').textContent).toBe('100%');
    progresso.parar();
  });
});

describe('artigos da Wikipédia guardados na visita', () => {
  const ARTIGO = `Coffee is a drink.\n== History ==\n${'Coffee spread around the world. '.repeat(200)}`;

  function wikipediaNoFetchGlobal() {
    const fetch = vi.fn(async (url) => {
      const p = Object.fromEntries(new URL(url).searchParams);
      let corpo = {};
      if (p.list === 'search') corpo = { query: { search: [{ title: 'Coffee' }] } };
      else if (p.prop === 'extracts')
        corpo = { query: { pages: [{ title: 'Coffee', extract: ARTIGO }] } };
      else corpo = { query: { pages: [{ title: p.titles }] } };
      return { ok: true, status: 200, json: async () => corpo };
    });
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  test('gerar de novo sobre o mesmo tema não consulta a Wikipédia outra vez', async () => {
    const fetch = wikipediaNoFetchGlobal();
    const opcoes = { modo: MODOS.MERGULHO, tema: 'coffee', nivel: 'fluente', usarIA: false };
    const etapas = [];
    const primeiro = await criarTexto(opcoes);
    const chamadas = fetch.mock.calls.length;
    const segundo = await criarTexto({ ...opcoes, aoEtapa: (e) => etapas.push(e) });
    expect(fetch.mock.calls.length).toBe(chamadas);
    expect(segundo.texto).toBe(primeiro.texto);
    expect(etapas.some((e) => e.includes('já encontrado'))).toBe(true);
  });

  test('as buscas em inglês e em português rodam ao mesmo tempo', async () => {
    const fetch = wikipediaNoFetchGlobal();
    let emAndamento = 0;
    let maximo = 0;
    const original = fetch.getMockImplementation();
    fetch.mockImplementation(async (url) => {
      emAndamento++;
      maximo = Math.max(maximo, emAndamento);
      await new Promise((r) => setTimeout(r, 10));
      emAndamento--;
      return original(url);
    });
    await criarTexto({ modo: MODOS.MERGULHO, tema: 'café', nivel: 'fluente', usarIA: false });
    expect(maximo).toBeGreaterThanOrEqual(2);
  });
});
