/** Preferências voláteis, disponíveis somente enquanto a página está aberta. */

import {
  IDIOMAS,
  IDIOMA_PADRAO,
  TEMPO_PADRAO,
  TIPOS,
  VELOCIDADE_FALA,
  VOZES_KOKORO,
} from '../config.js';

const MP3_PADRAO = Object.freeze({
  vozKokoro: VOZES_KOKORO[0].id,
  vozKokoro2: 'am_michael', // segunda voz, usada nos diálogos
  pausaMs: 900,
  numerar: true, // falar "Number 3" antes de cada item, para acompanhar no PDF
  ouvirAoGerar: true, // tocar os trechos enquanto o MP3 é gerado
});

const PADRAO = Object.freeze({
  tema: null, // null = segue o sistema operacional
  idioma: IDIOMA_PADRAO,
  vozes: {}, // { 'en-US': 'voiceURI' }
  audioAutomatico: true,
  velocidadeFala: VELOCIDADE_FALA.padrao,
  repeticoes: 1,
  tempo: { ...TEMPO_PADRAO },
  embaralhar: true,
  ignorarComuns: true, // tira "the", "a", "to"... das listas de palavras
  incluirTraducao: true, // tradução para o português no fim do PDF
  mp3: { ...MP3_PADRAO },
});

function normalizar(dados) {
  const prefs = { ...PADRAO, ...dados };
  prefs.vozes = { ...(dados?.vozes || {}) };
  prefs.tempo = { ...TEMPO_PADRAO, ...(dados?.tempo || {}) };
  prefs.mp3 = { ...MP3_PADRAO, ...(dados?.mp3 || {}) };
  if (!IDIOMAS[prefs.idioma]) prefs.idioma = IDIOMA_PADRAO;
  if (prefs.tema !== 'dark' && prefs.tema !== 'light') prefs.tema = null;
  return prefs;
}

let cache = null;
const ouvintes = new Set();

export const settings = {
  carregar() {
    cache ||= normalizar(PADRAO);
    return cache;
  },

  get(chave) {
    return this.carregar()[chave];
  },

  set(chave, valor) {
    const prefs = this.carregar();
    prefs[chave] = valor;
    ouvintes.forEach((fn) => fn(chave, valor));
  },

  getVoz(idioma) {
    return this.carregar().vozes[idioma] || null;
  },

  setVoz(idioma, voiceURI) {
    const vozes = { ...this.carregar().vozes };
    if (voiceURI) vozes[idioma] = voiceURI;
    else delete vozes[idioma];
    this.set('vozes', vozes);
  },

  getTempo(tipo) {
    return this.carregar().tempo[tipo] ?? TEMPO_PADRAO[tipo] ?? TEMPO_PADRAO[TIPOS.PALAVRAS];
  },

  setTempo(tipo, segundos) {
    this.set('tempo', { ...this.carregar().tempo, [tipo]: segundos });
  },

  /** Atualiza parte das preferências de exportação de MP3. */
  setMp3(parcial) {
    this.set('mp3', { ...this.carregar().mp3, ...parcial });
  },

  aoMudar(fn) {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
  },

  /** Somente para testes. */
  _resetar() {
    cache = null;
    ouvintes.clear();
  },
};
