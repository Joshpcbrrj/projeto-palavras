/**
 * Tradução opcional para o português nos PDFs, usando o tradutor nativo do navegador.
 * O recurso não exige conta, API key ou envio do texto a um serviço remoto.
 */

export const IDIOMA_TRADUCAO = 'pt';
export const LIMITE_PREPARO_MS = 45000;

function base(idioma) {
  return String(idioma || 'en')
    .split('-')[0]
    .toLowerCase();
}

/**
 * Tradutor embutido do navegador, se disponível para o par de idiomas.
 * Retorna null quando não há suporte e lança erro se a preparação exceder o limite.
 */
export async function tradutorNavegador(
  idiomaOrigem,
  { api = globalThis.Translator, limiteMs = LIMITE_PREPARO_MS } = {}
) {
  if (!api?.create) return null;
  const par = { sourceLanguage: base(idiomaOrigem), targetLanguage: IDIOMA_TRADUCAO };
  let disponibilidade;
  try {
    disponibilidade = await api.availability?.(par);
  } catch {
    return null;
  }
  if (disponibilidade === 'unavailable') return null;

  let limite;
  const tradutor = await Promise.race([
    api.create(par),
    new Promise((_, rejeitar) => {
      limite = setTimeout(
        () =>
          rejeitar(
            new Error(
              'o tradutor do navegador ainda está baixando o pacote do idioma; tente de novo em alguns minutos'
            )
          ),
        limiteMs
      );
    }),
  ]).finally(() => clearTimeout(limite));
  return {
    nome: 'Tradutor do navegador',
    async traduzirPartes(partes, { signal } = {}) {
      const resultado = [];
      for (const parte of partes) {
        if (signal?.aborted) throw new DOMException('Tradução cancelada.', 'AbortError');
        resultado.push(String(await tradutor.translate(parte)).trim());
      }
      return resultado;
    },
  };
}

/** Obtém o tradutor do navegador, se disponível para o idioma de origem. */
export async function obterTradutor({ idioma, api } = {}) {
  if (base(idioma) === IDIOMA_TRADUCAO) return null;
  return tradutorNavegador(idioma, { api });
}

/** Traduz parágrafos individualmente e preserva linhas em branco. */
export async function traduzirTexto(texto, tradutor, { signal } = {}) {
  const linhas = String(texto).replace(/\r/g, '').split('\n');
  const indices = linhas.flatMap((linha, i) => (linha.trim() ? [i] : []));
  const traducoes = await tradutor.traduzirPartes(
    indices.map((i) => linhas[i].trim()),
    { modo: 'texto', signal }
  );
  const saida = [...linhas];
  indices.forEach((i, k) => (saida[i] = traducoes[k] || ''));
  return saida.join('\n');
}

/** Traduz uma lista mantendo um resultado para cada item e a mesma ordem. */
export function traduzirItens(itens, tradutor, { signal } = {}) {
  return tradutor.traduzirPartes(itens, { modo: 'itens', signal });
}
