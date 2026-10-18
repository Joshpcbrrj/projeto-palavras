/**
 * Web Worker que executa o modelo de IA local (WebLLM) fora da thread principal,
 * para que a interface continue responsiva enquanto o texto é gerado.
 *
 * A URL precisa ser igual a CDN.webllm em js/config.js (um teste verifica isso).
 */
import { WebWorkerMLCEngineHandler } from 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm';

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (mensagem) => handler.onmessage(mensagem);
