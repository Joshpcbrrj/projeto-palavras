/**
 * Funções utilitárias puras (sem dependência de DOM).
 */

/** Embaralha uma cópia do array (Fisher–Yates). */
export function embaralhar(lista, aleatorio = Math.random) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Seleciona até `maximo` itens aleatórios, preservando a lista se já couber. */
export function amostra(lista, maximo, aleatorio = Math.random) {
  if (lista.length <= maximo) return [...lista];
  return embaralhar(lista, aleatorio).slice(0, maximo);
}

/** Remove duplicados ignorando maiúsculas/minúsculas, mantendo a primeira ocorrência. */
export function unicos(lista) {
  const vistos = new Set();
  const resultado = [];
  for (const item of lista) {
    const chave = String(item).toLocaleLowerCase();
    if (!vistos.has(chave)) {
      vistos.add(chave);
      resultado.push(item);
    }
  }
  return resultado;
}

export function limitar(valor, min, max) {
  return Math.min(max, Math.max(min, valor));
}

/** Promise que resolve após `ms`, cancelável por um AbortSignal. */
export function esperar(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(false);
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', aoAbortar);
      resolve(true);
    }, ms);
    function aoAbortar() {
      clearTimeout(id);
      resolve(false);
    }
    signal?.addEventListener('abort', aoAbortar, { once: true });
  });
}

export function gerarId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Data local no formato AAAA-MM-DD (sem fuso horário). */
export function dataISO(data = new Date()) {
  const d = new Date(data);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function somarDias(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

/** Converte "AAAA-MM-DD" ou "DD/MM/AAAA" em Date local (meia-noite). Retorna null se inválida. */
export function lerData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  const texto = String(valor).trim();
  let ano, mes, dia;
  let m = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    [, ano, mes, dia] = m;
  } else {
    m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    [, dia, mes, ano] = m;
  }
  const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
  if (d.getMonth() !== Number(mes) - 1 || d.getDate() !== Number(dia)) return null;
  return d;
}

/** Diferença em dias inteiros entre duas datas (b - a), ignorando horário. */
export function diferencaDias(a, b) {
  const inicio = new Date(a);
  const fim = new Date(b);
  inicio.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  return Math.round((fim - inicio) / 86400000);
}

export function formatarDataBR(data) {
  const d = lerData(data) || new Date(data);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

export function formatarDuracao(segundosTotais) {
  const s = Math.max(0, Math.round(segundosTotais || 0));
  const horas = Math.floor(s / 3600);
  const minutos = Math.floor((s % 3600) / 60);
  const segundos = s % 60;
  if (horas) return `${horas}h ${minutos}min`;
  if (minutos) return `${minutos}min ${segundos}s`;
  return `${segundos}s`;
}

export function carimboArquivo(data = new Date()) {
  return (
    dataISO(data) +
    '_' +
    String(data.getHours()).padStart(2, '0') +
    'h' +
    String(data.getMinutes()).padStart(2, '0')
  );
}

/** Converte um título em um trecho seguro para nome de arquivo. */
export function slug(texto, max = 40) {
  return (
    String(texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, max) || 'estudo'
  );
}
