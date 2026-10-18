import { describe, expect, test } from 'vitest';
import {
  amostra,
  dataISO,
  diferencaDias,
  embaralhar,
  esperar,
  formatarDuracao,
  lerData,
  limitar,
  slug,
  unicos,
} from '../js/core/utils.js';
import { escapeHtml, html, raw } from '../js/core/dom.js';

describe('utilitários', () => {
  test('embaralhar mantém os mesmos itens e não altera o original', () => {
    const original = [1, 2, 3, 4, 5];
    const resultado = embaralhar(original);
    expect([...resultado].sort()).toEqual(original);
    expect(original).toEqual([1, 2, 3, 4, 5]);
  });

  test('amostra respeita o limite', () => {
    expect(amostra([1, 2, 3], 5)).toEqual([1, 2, 3]);
    expect(
      amostra(
        Array.from({ length: 50 }, (_, i) => i),
        10
      )
    ).toHaveLength(10);
  });

  test('unicos ignora maiúsculas/minúsculas', () => {
    expect(unicos(['Casa', 'casa', 'CASA', 'sol'])).toEqual(['Casa', 'sol']);
  });

  test('datas locais', () => {
    expect(dataISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(lerData('2026-02-30')).toBeNull();
    expect(lerData('31/12/2026')).toEqual(new Date(2026, 11, 31));
    expect(diferencaDias(new Date(2026, 9, 18, 23), new Date(2026, 9, 19, 1))).toBe(1);
  });

  test('formatarDuracao', () => {
    expect(formatarDuracao(5)).toBe('5s');
    expect(formatarDuracao(125)).toBe('2min 5s');
    expect(formatarDuracao(3725)).toBe('1h 2min');
  });

  test('limitar e slug', () => {
    expect(limitar(10, 0, 5)).toBe(5);
    expect(slug('Lição 1: Verbos & Ação!')).toBe('licao-1-verbos-acao');
    expect(slug('')).toBe('estudo');
  });

  test('esperar pode ser cancelado', async () => {
    const controle = new AbortController();
    const promessa = esperar(10_000, controle.signal);
    controle.abort();
    await expect(promessa).resolves.toBe(false);
    await expect(esperar(1)).resolves.toBe(true);
  });
});

describe('html seguro', () => {
  test('escapa valores interpolados', () => {
    const nome = `<img src=x onerror="alert('x')">`;
    expect(String(html`<p>${nome}</p>`)).toBe(
      '<p>&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;</p>'
    );
  });

  test('permite HTML confiável via raw() e templates aninhados', () => {
    const itens = ['a', '<b>'];
    const resultado = html`<ul>${itens.map((i) => html`<li>${i}</li>`)}</ul>${raw('<hr>')}`;
    expect(String(resultado)).toBe('<ul><li>a</li><li>&lt;b&gt;</li></ul><hr>');
  });

  test('omite null, undefined e false', () => {
    expect(String(html`${null}${undefined}${false}${0}`)).toBe('0');
    expect(escapeHtml(`"&'`)).toBe('&quot;&amp;&#39;');
  });
});
