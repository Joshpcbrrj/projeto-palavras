/**
 * Motor de IA usado na criação de textos: o Google Gemini, com a chave gratuita
 * do próprio usuário (rápido e funciona em qualquer aparelho).
 */

import { settings } from '../services/settings.js';
import { GeminiMotor } from './gemini.js';

/** Motor de IA pronto para uso, ou null se a chave ainda não foi configurada. */
export function obterMotorIA() {
  const gemini = new GeminiMotor({ chave: settings.get('chaveGemini') });
  return gemini.pronto ? gemini : null;
}

export function iaDisponivel() {
  return Boolean(obterMotorIA());
}
