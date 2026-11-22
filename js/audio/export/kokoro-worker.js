/**
 * Web Worker do Kokoro (voz neural que roda no navegador). A síntese é pesada,
 * então fica fora da thread principal para a interface não travar.
 *
 * A URL precisa ser igual a CDN.kokoro em js/config.js (um teste verifica isso).
 */
import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';
import { iniciarWorkerKokoro } from './kokoro-worker-runtime.js';

iniciarWorkerKokoro(self, KokoroTTS);
