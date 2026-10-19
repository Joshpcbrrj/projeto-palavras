/**
 * IA online pelo Google Gemini, com a chave gratuita do próprio usuário
 * (criada em https://aistudio.google.com/app/apikey). Responde em segundos e
 * funciona em qualquer aparelho, inclusive celulares.
 *
 * Expõe `gerar()`, usado pelo gerador de textos (fácil de simular nos testes).
 */

const MODELO = 'gemini-flash-latest';
/** Modelos por preferência de velocidade (ambos grátis com a chave do usuário). */
export const MODELOS = Object.freeze({
  qualidade: MODELO, // Flash: melhor texto
  rapidez: 'gemini-flash-lite-latest', // Flash-Lite: mais leve e rápido
});
/**
 * Nível de "raciocínio" antes de responder. Os modelos Flash pensam no nível médio
 * por padrão, o que atrasa a primeira palavra em vários segundos; para escrever e
 * traduzir textos de estudo, o nível baixo basta.
 */
const RACIOCINIO = 'low';
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Modelos que responderam "não encontrado" nesta visita (usa o padrão no lugar). */
const modelosIndisponiveis = new Set();
export const URL_CRIAR_CHAVE = 'https://aistudio.google.com/app/apikey';

/** Converte mensagens no formato chat (system/user/assistant) para o formato do Gemini. */
export function paraFormatoGemini(mensagens) {
  const sistema = mensagens
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const contents = mensagens
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  return { ...(sistema ? { systemInstruction: { parts: [{ text: sistema }] } } : {}), contents };
}

/** Extrai o texto de um pedaço da resposta em streaming (SSE). */
export function textoDoEvento(dados) {
  return (dados?.candidates?.[0]?.content?.parts || [])
    .map((p) => (p.thought ? '' : p.text || ''))
    .join('');
}

function traduzirErro(status, corpo) {
  const motivo =
    corpo?.error?.details?.find?.((d) => d.reason)?.reason || corpo?.error?.status || '';
  if (motivo === 'API_KEY_INVALID' || status === 401)
    return 'Chave do Gemini inválida. Confira a chave em Configurações.';
  if (status === 429)
    return 'O limite gratuito do Gemini foi atingido por agora. Aguarde alguns minutos e tente de novo.';
  if (status === 403)
    return 'A chave do Gemini não tem permissão para usar este modelo (ou o serviço não está disponível na sua região).';
  if (status >= 500) return 'O Gemini está instável no momento. Tente novamente em instantes.';
  return corpo?.error?.message || `O Gemini respondeu com erro (${status}).`;
}

export class GeminiMotor {
  constructor({
    chave,
    fetchFn = globalThis.fetch?.bind(globalThis),
    modelo = MODELO,
    raciocinio = RACIOCINIO,
  } = {}) {
    this.chave = String(chave || '').trim();
    this.fetchFn = fetchFn;
    this.modelo = modelosIndisponiveis.has(modelo) ? MODELO : modelo;
    this.raciocinio = raciocinio;
  }

  get pronto() {
    return Boolean(this.chave);
  }

  /**
   * Gera um texto em streaming.
   * @returns {Promise<string>}
   */
  async gerar(opcoes) {
    const { mensagens, maxTokens = 800, temperatura = 0.7, json = false, aoTexto, signal } = opcoes;
    if (!this.chave)
      throw new Error('Configure sua chave gratuita do Gemini para usar a IA online.');
    const comRaciocinio = Boolean(this.raciocinio);
    let resposta;
    try {
      resposta = await this.fetchFn(`${URL_BASE}/${this.modelo}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.chave },
        body: JSON.stringify({
          ...paraFormatoGemini(mensagens),
          generationConfig: {
            temperature: temperatura,
            // Folga para modelos que "pensam" antes de responder: o raciocínio também
            // conta no limite, e textos de 2000 palavras precisam de ≈ 3400 tokens.
            maxOutputTokens: Math.max(maxTokens * 2, 8192),
            ...(json ? { responseMimeType: 'application/json' } : {}),
            ...(comRaciocinio ? { thinkingConfig: { thinkingLevel: this.raciocinio } } : {}),
          },
        }),
        signal,
      });
    } catch (erro) {
      if (erro?.name === 'AbortError') throw erro;
      throw new Error('Sem conexão com o Gemini. Verifique sua internet.', { cause: erro });
    }
    if (!resposta.ok) {
      const corpo = await resposta.json().catch(() => null);
      const mensagem = String(corpo?.error?.message || '');
      // Se o modelo não aceitar o ajuste de raciocínio, segue sem ele (nunca quebra).
      if (resposta.status === 400 && comRaciocinio && /think/i.test(mensagem)) {
        this.raciocinio = null;
        return this.gerar(opcoes);
      }
      // Modelo rápido indisponível para esta chave/região: usa o modelo padrão.
      if (resposta.status === 404 && this.modelo !== MODELO) {
        modelosIndisponiveis.add(this.modelo); // não tenta de novo nesta visita
        this.modelo = MODELO;
        return this.gerar(opcoes);
      }
      throw new Error(traduzirErro(resposta.status, corpo));
    }

    let texto = '';
    let pendente = '';
    const leitor = resposta.body.getReader();
    const decodificador = new TextDecoder();
    const processarLinha = (linha) => {
      if (!linha.startsWith('data:')) return;
      try {
        texto += textoDoEvento(JSON.parse(linha.slice(5)));
        aoTexto?.(texto);
      } catch {
        /* linha incompleta ou de controle */
      }
    };
    for (;;) {
      const { value, done } = await leitor.read();
      if (done) break;
      pendente += decodificador.decode(value, { stream: true });
      const linhas = pendente.split('\n');
      pendente = linhas.pop();
      linhas.forEach((l) => processarLinha(l.trim()));
    }
    processarLinha(pendente.trim());
    return texto;
  }

  /** Faz um pedido mínimo para confirmar que a chave funciona. */
  async testar() {
    const resposta = await this.gerar({
      mensagens: [{ role: 'user', content: 'Reply with the single word: OK' }],
      maxTokens: 10,
      temperatura: 0,
    });
    return resposta.trim().length > 0;
  }
}
