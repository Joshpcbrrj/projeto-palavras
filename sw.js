/**
 * Service worker: permite usar o app offline e instalá-lo como PWA.
 *
 * Ao publicar uma nova versão, altere VERSAO para que os clientes baixem os
 * arquivos atualizados. Os caminhos são relativos para funcionar em
 * subdiretórios (ex.: GitHub Pages em /projeto-palavras/).
 */

const VERSAO = 'v3.2.0';
const CACHE_APP = `aprendendo-palavras-${VERSAO}`;
const CACHE_CDN = 'aprendendo-palavras-cdn';

const ARQUIVOS_APP = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './fonts/TwemojiCountryFlags.woff2',
  './css/base.css',
  './css/components.css',
  './css/screens.css',
  './js/main.js',
  './js/config.js',
  './js/audio/index.js',
  './js/audio/reader.js',
  './js/audio/speaker.js',
  './js/audio/voices.js',
  './js/audio/export/engines.js',
  './js/audio/export/index.js',
  './js/audio/export/kokoro-worker.js',
  './js/audio/export/mp3.js',
  './js/audio/export/plan.js',
  './js/core/dom.js',
  './js/core/nav.js',
  './js/core/router.js',
  './js/core/utils.js',
  './js/create/engine.js',
  './js/create/gemini.js',
  './js/create/generator.js',
  './js/create/levels.js',
  './js/create/prompts.js',
  './js/create/wikipedia.js',
  './js/pdf/exporter.js',
  './js/pdf/format.js',
  './js/pdf/importer.js',
  './js/pdf/legacy.js',
  './js/pdf/libs.js',
  './js/pdf/raster.js',
  './js/screens/CreateScreen.js',
  './js/screens/MenuScreen.js',
  './js/screens/ProgressScreen.js',
  './js/screens/ReviewScreen.js',
  './js/screens/SettingsScreen.js',
  './js/screens/StudyScreen.js',
  './js/screens/TextScreen.js',
  './js/services/progress.js',
  './js/services/settings.js',
  './js/services/storage.js',
  './js/study/session.js',
  './js/text/extract.js',
  './js/ui/aiPanel.js',
  './js/ui/components.js',
  './js/ui/dialog.js',
  './js/ui/mp3Dialog.js',
  './js/ui/theme.js',
  './js/ui/toast.js',
];

// Bibliotecas de PDF (carregadas sob demanda). Guardadas para uso offline.
const ARQUIVOS_CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.0.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_APP);
      await cache.addAll(ARQUIVOS_APP);
      // As bibliotecas são opcionais: uma falha de rede não deve impedir a instalação.
      const cdn = await caches.open(CACHE_CDN);
      await Promise.all(ARQUIVOS_CDN.map((url) => cdn.add(url).catch(() => undefined)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter(
            (nome) =>
              nome.startsWith('aprendendo-palavras') && nome !== CACHE_APP && nome !== CACHE_CDN
          )
          .map((nome) => caches.delete(nome))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_APP);
        const emCache = await cache.match(request, { ignoreSearch: true });
        if (emCache) return emCache;
        try {
          return await fetch(request);
        } catch (erro) {
          if (request.mode === 'navigate') return cache.match('./index.html');
          throw erro;
        }
      })()
    );
    return;
  }

  // Bibliotecas com versão fixa na URL (cdnjs e jsDelivr): podem ficar em cache para sempre.
  if (url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_CDN);
        const emCache = await cache.match(request);
        if (emCache) return emCache;
        const resposta = await fetch(request);
        if (resposta.ok) cache.put(request, resposta.clone());
        return resposta;
      })()
    );
  }
});
