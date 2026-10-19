// @vitest-environment node
/**
 * Verificações de integridade do projeto (PWA e arquivos estáticos).
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const raiz = path.resolve(import.meta.dirname, '..');
const ler = (arquivo) => readFileSync(path.join(raiz, arquivo), 'utf8');

function listar(pasta) {
  return readdirSync(path.join(raiz, pasta)).flatMap((nome) => {
    const relativo = `${pasta}/${nome}`;
    return statSync(path.join(raiz, relativo)).isDirectory() ? listar(relativo) : [relativo];
  });
}

describe('PWA', () => {
  const sw = ler('sw.js');

  test('o service worker guarda todos os arquivos JS e CSS do app para uso offline', () => {
    const arquivos = [...listar('js'), ...listar('css')].filter((f) => /\.(js|css)$/.test(f));
    const faltando = arquivos.filter((f) => !sw.includes(`'./${f}'`));
    expect(faltando).toEqual([]);
  });

  test('todo arquivo listado no service worker existe', () => {
    const listados = [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]).filter(Boolean);
    const inexistentes = listados.filter((f) => {
      try {
        return !statSync(path.join(raiz, f)).isFile();
      } catch {
        return true;
      }
    });
    expect(inexistentes).toEqual([]);
  });

  test('manifest usa caminhos relativos (funciona no GitHub Pages) e os ícones existem', () => {
    const manifest = JSON.parse(ler('manifest.json'));
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    for (const icone of manifest.icons) {
      expect(statSync(path.join(raiz, icone.src)).isFile()).toBe(true);
    }
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  test('index.html não usa caminhos absolutos nem Tailwind via CDN', () => {
    const html = ler('index.html');
    expect(html).not.toMatch(/(src|href)="\/(?!\/)/);
    expect(html).not.toContain('cdn.tailwindcss.com');
  });

  test('a Content-Security-Policy libera o script de tema (hash) e as CDNs/APIs usadas', () => {
    const html = ler('index.html');
    const politica = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1];
    const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
    const hash = createHash('sha256').update(script).digest('base64');
    expect(politica).toContain(`'sha256-${hash}'`);

    const config = ler('js/config.js');
    const origens = [...config.matchAll(/'(https:\/\/[^/']+)\//g)].map((m) => m[1]);
    for (const origem of new Set(origens)) expect(politica).toContain(origem);
    expect(politica).toContain('https://generativelanguage.googleapis.com');
    expect(politica).toContain('https://*.wikipedia.org');
    // O worker da voz herda a política: a biblioteca cria um worker a partir do jsDelivr
    // e baixa o modelo do Hugging Face (sem isso o MP3 trava em "Preparando a voz").
    expect(politica).toMatch(/worker-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
    expect(politica).toMatch(/connect-src[^;]*https:\/\/huggingface\.co/);
    expect(politica).toMatch(/connect-src[^;]*https:\/\/\*\.hf\.co/);
  });

  test('o Web Worker do Kokoro importa exatamente a mesma versão do config', () => {
    const config = ler('js/config.js');
    const url = (nome) => config.match(new RegExp(`${nome}: '([^']+)'`))[1];
    expect(ler('js/audio/export/kokoro-worker.js')).toContain(`'${url('kokoro')}'`);
  });

  test('as URLs de bibliotecas do service worker são as mesmas do config', () => {
    const config = ler('js/config.js');
    for (const url of [...config.matchAll(/'(https:\/\/cdnjs[^']+)'/g)].map((m) => m[1])) {
      expect(sw).toContain(url);
    }
  });
});
