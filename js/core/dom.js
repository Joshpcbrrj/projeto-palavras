/**
 * Utilitários de DOM.
 *
 * `html` é uma template tag que escapa automaticamente todos os valores interpolados,
 * evitando injeção de HTML com textos vindos do usuário ou de arquivos importados.
 * Use `raw()` apenas para trechos de HTML que o próprio app gerou.
 */

class SafeHtml {
  constructor(valor) {
    this.valor = valor;
  }

  toString() {
    return this.valor;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function raw(valor) {
  return valor instanceof SafeHtml ? valor : new SafeHtml(String(valor ?? ''));
}

function serializar(valor) {
  if (valor === null || valor === undefined || valor === false) return '';
  if (valor instanceof SafeHtml) return valor.valor;
  if (Array.isArray(valor)) return valor.map(serializar).join('');
  return escapeHtml(valor);
}

export function html(strings, ...valores) {
  let saida = strings[0];
  for (let i = 0; i < valores.length; i++) {
    saida += serializar(valores[i]) + strings[i + 1];
  }
  return new SafeHtml(saida);
}

/** Substitui o conteúdo de um elemento por um template `html`. */
export function render(elemento, conteudo) {
  elemento.innerHTML = String(conteudo);
  return elemento;
}

export function $(seletor, raiz = document) {
  return raiz.querySelector(seletor);
}

export function $$(seletor, raiz = document) {
  return Array.from(raiz.querySelectorAll(seletor));
}

/**
 * Registra listeners e devolve uma função que remove todos de uma vez.
 * Útil para limpar eventos globais (teclado, etc.) quando a tela é desmontada.
 */
export function criarEscopoEventos() {
  const remocoes = [];
  return {
    on(alvo, evento, handler, opcoes) {
      if (!alvo) return;
      alvo.addEventListener(evento, handler, opcoes);
      remocoes.push(() => alvo.removeEventListener(evento, handler, opcoes));
    },
    limpar() {
      while (remocoes.length) remocoes.pop()();
    },
  };
}

/** Baixa um Blob como arquivo. */
export function baixarArquivo(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function lerComFileReader(arquivo, metodo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () =>
      reject(leitor.error || new Error(`Não foi possível ler ${arquivo.name}.`));
    leitor[metodo](arquivo);
  });
}

/** Lê um arquivo como texto (com alternativa para navegadores sem Blob.text()). */
export function lerTextoDoArquivo(arquivo) {
  return typeof arquivo.text === 'function'
    ? arquivo.text()
    : lerComFileReader(arquivo, 'readAsText');
}

/** Lê um arquivo como ArrayBuffer (com alternativa para navegadores antigos). */
export function lerBytesDoArquivo(arquivo) {
  return typeof arquivo.arrayBuffer === 'function'
    ? arquivo.arrayBuffer()
    : lerComFileReader(arquivo, 'readAsArrayBuffer');
}

/** Carrega um script clássico (UMD) uma única vez. */
const scriptsCarregados = new Map();
export function carregarScript(src) {
  if (!scriptsCarregados.has(src)) {
    const promessa = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => {
        scriptsCarregados.delete(src);
        script.remove();
        reject(new Error(`Não foi possível carregar ${src}. Verifique sua conexão.`));
      };
      document.head.appendChild(script);
    });
    scriptsCarregados.set(src, promessa);
  }
  return scriptsCarregados.get(src);
}
