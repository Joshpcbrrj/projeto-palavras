/**
 * Escolha do motor de IA usado na criação de textos.
 * - "gemini": online, rápido, funciona em celulares (chave gratuita do Google);
 * - "local": roda no navegador, offline e 100% independente (exige WebGPU e download grande).
 */

import { settings } from '../services/settings.js';
import { GeminiMotor } from './gemini.js';
import { ia } from './llm.js';

export const MOTORES_IA = Object.freeze({
  GEMINI: 'gemini',
  LOCAL: 'local',
});

/** Motor de IA pronto para uso, ou null se o escolhido ainda não foi configurado/ativado. */
export function obterMotorIA() {
  if (settings.get('motorIA') === MOTORES_IA.GEMINI) {
    const gemini = new GeminiMotor({ chave: settings.get('chaveGemini') });
    return gemini.pronto ? gemini : null;
  }
  return ia.pronto ? ia : null;
}

export function iaDisponivel() {
  return Boolean(obterMotorIA());
}
