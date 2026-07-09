// generate-icons.js
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'icons');

function createSvgIcon(size) {
  const emojiSize = Math.floor(size * 0.55);
  const emojiY = Math.floor(size * 0.68);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="#667eea" rx="${Math.floor(size * 0.15)}"/>
      <rect width="${size}" height="${size}" fill="url(#grad)" rx="${Math.floor(size * 0.15)}"/>
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#667eea" />
          <stop offset="100%" stop-color="#5a67d8" />
        </linearGradient>
      </defs>
      <text x="50%" y="${emojiY}" font-size="${emojiSize}" text-anchor="middle" dominant-baseline="middle" fill="white">
        📚
      </text>
    </svg>
  `;
}

async function generateIcons() {
  console.log('🎨 Gerando ícones PWA...\n');

  // Garante que a pasta icons existe
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  for (const size of sizes) {
    const svg = createSvgIcon(size);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));
    console.log(`✅ icons/icon-${size}.png`);
  }

  console.log('\n✨ Todos os 8 ícones foram gerados!');
}

generateIcons();
