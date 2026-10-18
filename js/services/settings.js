/**
 * Preferências do usuário, persistidas no localStorage.
 * Migra automaticamente as chaves usadas pelas versões anteriores do app.
 */

import {
  IDIOMAS,
  IDIOMA_PADRAO,
  NIVEIS,
  TEMPO_PADRAO,
  TIPOS,
  VELOCIDADE_FALA,
  VOZES_KOKORO,
} from '../config.js';
import { storage } from './storage.js';

const CHAVE = 'ap_preferencias';

const MP3_PADRAO = Object.freeze({
  vozKokoro: VOZES_KOKORO[0].id,
  vozKokoro2: 'am_michael', // segunda voz, usada nos diálogos
  pausaMs: 900,
});

/** Campos de versões anteriores que não existem mais (removidos ao carregar). */
const CAMPOS_REMOVIDOS = ['motorIA', 'modeloIA'];
const CAMPOS_MP3_REMOVIDOS = ['motor', 'vozOpenai', 'vozOpenai2', 'chaveOpenai'];

const PADRAO = Object.freeze({
  tema: null, // null = segue o sistema operacional
  idioma: IDIOMA_PADRAO,
  vozes: {}, // { 'en-US': 'voiceURI' }
  audioAutomatico: true,
  velocidadeFala: VELOCIDADE_FALA.padrao,
  repeticoes: 1,
  tempo: { ...TEMPO_PADRAO },
  embaralhar: true,
  chaveGemini: '', // chave gratuita do Google Gemini (IA para criar textos)
  nivelTexto: 'iniciante',
  mp3: { ...MP3_PADRAO },
});

function migrarLegado() {
  const legado = {};
  const tema = storage.lerTexto('theme');
  if (tema === 'dark' || tema === 'light') legado.tema = tema;

  const audio = storage.lerTexto('audioAutomatico');
  if (audio === 'true' || audio === 'false') legado.audioAutomatico = audio === 'true';

  const idioma = storage.lerTexto('audio_idioma');
  if (idioma && IDIOMAS[idioma]) legado.idioma = idioma;
  return legado;
}

function normalizar(dados) {
  const prefs = { ...PADRAO, ...dados };
  prefs.vozes = { ...(dados?.vozes || {}) };
  prefs.tempo = { ...TEMPO_PADRAO, ...(dados?.tempo || {}) };
  prefs.mp3 = { ...MP3_PADRAO, ...(dados?.mp3 || {}) };
  // A IA no navegador e o MP3 pela OpenAI foram removidos: apaga os dados antigos,
  // inclusive a chave da OpenAI, que não deve ficar guardada sem uso.
  CAMPOS_REMOVIDOS.forEach((campo) => delete prefs[campo]);
  CAMPOS_MP3_REMOVIDOS.forEach((campo) => delete prefs.mp3[campo]);
  if (!IDIOMAS[prefs.idioma]) prefs.idioma = IDIOMA_PADRAO;
  if (!NIVEIS[prefs.nivelTexto]) prefs.nivelTexto = 'iniciante';
  if (prefs.tema !== 'dark' && prefs.tema !== 'light') prefs.tema = null;
  return prefs;
}

let cache = null;
const ouvintes = new Set();

export const settings = {
  carregar() {
    if (cache) return cache;
    const salvo = storage.lerJSON(CHAVE);
    if (salvo) {
      cache = normalizar(salvo);
      const temCamposAntigos =
        CAMPOS_REMOVIDOS.some((c) => c in salvo) ||
        CAMPOS_MP3_REMOVIDOS.some((c) => c in (salvo.mp3 || {}));
      if (temCamposAntigos) storage.salvarJSON(CHAVE, cache);
    } else {
      cache = normalizar(migrarLegado());
      storage.salvarJSON(CHAVE, cache);
    }
    return cache;
  },

  get(chave) {
    return this.carregar()[chave];
  },

  set(chave, valor) {
    const prefs = this.carregar();
    prefs[chave] = valor;
    storage.salvarJSON(CHAVE, prefs);
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
