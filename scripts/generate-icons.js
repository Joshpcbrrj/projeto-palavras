/**
 * Gera os ícones PNG do PWA a partir de icons/icon.svg.
 * Uso: npm run icons
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pastaIcones = path.join(raiz, 'icons');
const svg = await readFile(path.join(pastaIcones, 'icon.svg'), 'utf8');

// Versão "maskable": fundo sangrando até a borda e desenho dentro da zona segura (80%).
const conteudo = svg.replace(/<svg[^>]*>|<\/svg>/g, '').replace('rx="112"', 'rx="0"');
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="f2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#f2)"/>
  <g transform="translate(51.2 51.2) scale(0.8)">${conteudo}</g>
</svg>`;

const saidas = [
  { arquivo: 'icon-192.png', tamanho: 192, fonte: svg },
  { arquivo: 'icon-512.png', tamanho: 512, fonte: svg },
  { arquivo: 'icon-maskable-512.png', tamanho: 512, fonte: maskable },
  { arquivo: 'apple-touch-icon.png', tamanho: 180, fonte: maskable },
];

for (const { arquivo, tamanho, fonte } of saidas) {
  await sharp(Buffer.from(fonte), { density: 300 })
    .resize(tamanho, tamanho)
    .png()
    .toFile(path.join(pastaIcones, arquivo));
  console.log(`✓ icons/${arquivo}`);
}
