import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  $$,
  $,
  baixarArquivo,
  carregarScript,
  criarEscopoEventos,
  escapeHtml,
  html,
  lerBytesDoArquivo,
  lerTextoDoArquivo,
  raw,
  render,
} from '../js/core/dom.js';

let urlDescriptors;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const [nome, descritor] of Object.entries(urlDescriptors || {})) {
    if (descritor) Object.defineProperty(URL, nome, descritor);
    else delete URL[nome];
  }
  urlDescriptors = null;
  document.body.innerHTML = '';
});

describe('utilitários do DOM', () => {
  test('escapa valores por padrão e permite HTML confiável explicitamente', () => {
    const template = html`<p>${`<script>&"'`}</p><div>${[null, false, '<b>']}</div>${raw('<i>ok</i>')}`;
    const raiz = document.createElement('main');
    render(raiz, template);

    expect(raiz.querySelector('p').textContent).toBe(`<script>&"'`);
    expect(String(template)).toContain('&lt;script&gt;&amp;&quot;&#39;');
    expect(raiz.querySelector('div').innerHTML).toBe('&lt;b&gt;');
    expect(raiz.querySelector('i').textContent).toBe('ok');
    expect(escapeHtml(null)).toBe('');
  });

  test('seleciona elementos e remove todos os listeners de um escopo', () => {
    const raiz = document.createElement('div');
    raiz.innerHTML = '<button></button><button></button>';
    expect($('button', raiz)).toBe(raiz.firstElementChild);
    expect($$('button', raiz)).toHaveLength(2);

    const eventos = criarEscopoEventos();
    const handler = vi.fn();
    eventos.on(raiz.firstElementChild, 'click', handler);
    eventos.on(null, 'click', handler);
    raiz.firstElementChild.click();
    eventos.limpar();
    eventos.limpar();
    raiz.firstElementChild.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  test('baixa um Blob e revoga a URL temporária', () => {
    vi.useFakeTimers();
    const url = 'blob:estudo';
    urlDescriptors = {
      createObjectURL: Object.getOwnPropertyDescriptor(URL, 'createObjectURL'),
      revokeObjectURL: Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL'),
    };
    URL.createObjectURL = vi.fn().mockReturnValue(url);
    URL.revokeObjectURL = vi.fn();
    const criarUrl = vi.spyOn(URL, 'createObjectURL');
    const revogar = vi.spyOn(URL, 'revokeObjectURL');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    baixarArquivo(new Blob(['conteúdo']), 'estudo.pdf');

    expect(criarUrl).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revogar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revogar).toHaveBeenCalledWith(url);
  });

  test('usa os métodos nativos de leitura disponíveis', async () => {
    const arquivoTexto = { text: vi.fn().mockResolvedValue('conteúdo') };
    const arquivoBinario = { arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)) };
    await expect(lerTextoDoArquivo(arquivoTexto)).resolves.toBe('conteúdo');
    await expect(lerBytesDoArquivo(arquivoBinario)).resolves.toHaveProperty('byteLength', 4);
    expect(arquivoTexto.text).toHaveBeenCalledOnce();
    expect(arquivoBinario.arrayBuffer).toHaveBeenCalledOnce();
  });

  test('usa FileReader como alternativa quando Blob não oferece leitura direta', async () => {
    const arquivo = new File(['linha'], 'nota.txt', { type: 'text/plain' });
    await expect(lerTextoDoArquivo(arquivo)).resolves.toBe('linha');
    await expect(lerBytesDoArquivo(arquivo)).resolves.toEqual(
      new TextEncoder().encode('linha').buffer
    );
  });

  test('carrega um script uma vez e permite tentar novamente após falha', async () => {
    const anexar = vi.spyOn(document.head, 'appendChild');
    const url = 'https://cdn.example.test/lib.js';
    const primeira = carregarScript(url);
    const repetida = carregarScript(url);
    expect(repetida).toBe(primeira);
    expect(anexar).toHaveBeenCalledOnce();
    const primeiroScript = anexar.mock.calls[0][0];
    primeiroScript.onload();
    await expect(primeira).resolves.toBeUndefined();

    const segundaUrl = `${url}?retry`;
    const falha = carregarScript(segundaUrl);
    const scriptComFalha = anexar.mock.calls[1][0];
    scriptComFalha.onerror();
    await expect(falha).rejects.toThrow('Verifique sua conexão');
    expect(scriptComFalha.isConnected).toBe(false);

    const novaTentativa = carregarScript(segundaUrl);
    const novoScript = anexar.mock.calls[2][0];
    novoScript.onload();
    await expect(novaTentativa).resolves.toBeUndefined();
  });
});
