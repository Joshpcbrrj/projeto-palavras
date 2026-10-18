/**
 * Tema claro/escuro.
 * Sem escolha salva, segue a preferência do sistema operacional.
 */

import { settings } from '../services/settings.js';

const CORES_BARRA = { light: '#6d28d9', dark: '#0f172a' };

function temaDoSistema() {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function temaAtual() {
  return settings.get('tema') || temaDoSistema();
}

function aplicar(tema) {
  document.documentElement.dataset.theme = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CORES_BARRA[tema]);
  const botao = document.getElementById('btnTema');
  if (botao) {
    const escuro = tema === 'dark';
    botao.setAttribute('aria-pressed', String(escuro));
    botao.setAttribute('aria-label', escuro ? 'Ativar modo claro' : 'Ativar modo escuro');
    botao.title = escuro ? 'Modo claro' : 'Modo escuro';
  }
}

/** Define o tema ('light', 'dark' ou null para seguir o sistema). */
export function aplicarTemaEscolhido(tema) {
  settings.set('tema', tema === 'light' || tema === 'dark' ? tema : null);
  aplicar(temaAtual());
}

export function alternarTema() {
  const novo = temaAtual() === 'dark' ? 'light' : 'dark';
  settings.set('tema', novo);
  aplicar(novo);
}

export function iniciarTema() {
  aplicar(temaAtual());
  globalThis.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (!settings.get('tema')) aplicar(temaDoSistema());
  });
  document.getElementById('btnTema')?.addEventListener('click', alternarTema);
}
