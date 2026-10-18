import { defineConfig } from 'vite';

// O app é servido como arquivos estáticos (ES modules nativos, sem etapa de build).
// O Vite é usado apenas como servidor de desenvolvimento com recarga automática.
export default defineConfig({
  base: './',
  server: { port: 5173 },
});
