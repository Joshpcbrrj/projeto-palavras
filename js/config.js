/**
 * Configurações globais do aplicativo.
 * Centraliza valores que podem ser ajustados em um só lugar.
 */

export const APP = Object.freeze({
  nome: 'Aprendendo Palavras',
  id: 'aprendendo-palavras',
  versao: '3.2.0',
});

export const TIPOS = Object.freeze({
  PALAVRAS: 'palavras',
  FRASES: 'frases',
  TEXTO: 'texto',
});

export const LIMITES = Object.freeze({
  [TIPOS.PALAVRAS]: 100,
  [TIPOS.FRASES]: 30,
});

/** Tempo padrão (segundos) de pausa entre um item e outro no flashcard. */
export const TEMPO_PADRAO = Object.freeze({
  [TIPOS.PALAVRAS]: 2,
  [TIPOS.FRASES]: 3,
});

export const TEMPO_MINIMO = 0.5;
export const TEMPO_MAXIMO = 30;

export const VELOCIDADE_FALA = Object.freeze({ min: 0.5, max: 1.5, passo: 0.05, padrao: 0.9 });

/**
 * Intervalos (em dias) da revisão espaçada. Cada revisão concluída avança uma etapa.
 * Ex.: estudou hoje → revisa em 1 dia → depois em 3 → 7 → 14 → 30 → 60.
 */
export const ETAPAS_REVISAO = Object.freeze([1, 3, 7, 14, 30, 60]);

export const IDIOMAS = Object.freeze({
  'pt-BR': { nome: 'Português (Brasil)', bandeira: '🇧🇷', amostra: 'Olá! Esta é a minha voz.' },
  'pt-PT': { nome: 'Português (Portugal)', bandeira: '🇵🇹', amostra: 'Olá! Esta é a minha voz.' },
  'en-US': { nome: 'Inglês (EUA)', bandeira: '🇺🇸', amostra: 'Hello! This is my voice.' },
  'en-GB': { nome: 'Inglês (Reino Unido)', bandeira: '🇬🇧', amostra: 'Hello! This is my voice.' },
  'es-ES': { nome: 'Espanhol', bandeira: '🇪🇸', amostra: '¡Hola! Esta es mi voz.' },
  'fr-FR': { nome: 'Francês', bandeira: '🇫🇷', amostra: 'Bonjour ! Voici ma voix.' },
  'de-DE': { nome: 'Alemão', bandeira: '🇩🇪', amostra: 'Hallo! Das ist meine Stimme.' },
  'it-IT': { nome: 'Italiano', bandeira: '🇮🇹', amostra: 'Ciao! Questa è la mia voce.' },
  'ja-JP': { nome: 'Japonês', bandeira: '🇯🇵', amostra: 'こんにちは。これは私の声です。' },
  'ko-KR': { nome: 'Coreano', bandeira: '🇰🇷', amostra: '안녕하세요. 제 목소리입니다.' },
  'zh-CN': { nome: 'Chinês (Mandarim)', bandeira: '🇨🇳', amostra: '你好！这是我的声音。' },
  'ru-RU': { nome: 'Russo', bandeira: '🇷🇺', amostra: 'Привет! Это мой голос.' },
});

/** O app é voltado ao estudo de inglês: este é o idioma de estudo padrão. */
export const IDIOMA_PADRAO = 'en-US';

/** Bibliotecas carregadas sob demanda (somente quando o recurso é usado). */
export const CDN = Object.freeze({
  jsPDF: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.0.1/jspdf.umd.min.js',
  pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  pdfjsWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
  kokoro: 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm',
  lame: 'https://cdn.jsdelivr.net/npm/@breezystack/lamejs@1.2.7/+esm',
});

/** Níveis de compreensão usados na criação de textos (com o equivalente no QECR/CEFR). */
export const NIVEIS = Object.freeze({
  iniciante: { nome: 'Iniciante', cefr: 'A1–A2' },
  intermediario: { nome: 'Intermediário', cefr: 'B1–B2' },
  fluente: { nome: 'Fluente', cefr: 'C1–C2' },
});

/** Vozes do Kokoro (inglês) com melhor qualidade, para exportar MP3 grátis. */
export const VOZES_KOKORO = Object.freeze([
  { id: 'af_heart', nome: 'Heart — feminina (EUA)' },
  { id: 'af_bella', nome: 'Bella — feminina (EUA)' },
  { id: 'am_michael', nome: 'Michael — masculina (EUA)' },
  { id: 'am_puck', nome: 'Puck — masculina (EUA)' },
  { id: 'bf_emma', nome: 'Emma — feminina (Reino Unido)' },
  { id: 'bm_george', nome: 'George — masculina (Reino Unido)' },
]);

export function nomeTipo(tipo, { plural = true, maiuscula = false } = {}) {
  const nomes = {
    [TIPOS.PALAVRAS]: ['palavra', 'palavras'],
    [TIPOS.FRASES]: ['frase', 'frases'],
    [TIPOS.TEXTO]: ['texto', 'textos'],
  };
  const [singular, pluralNome] = nomes[tipo] || ['item', 'itens'];
  const nome = plural ? pluralNome : singular;
  return maiuscula ? nome.charAt(0).toUpperCase() + nome.slice(1) : nome;
}
