// sw.js - Service Worker para PWA

const CACHE_NAME = 'aprendendo-palavras-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/base.css',
  '/css/components.css',
  '/css/dark-mode.css',
  '/js/config.js',
  '/js/app.js',
  '/js/apps/AppBase.js',
  '/js/apps/AppPalavras.js',
  '/js/apps/AppFrases.js',
  '/js/apps/AppAnalisador.js',
  '/js/apps/AppProgresso.js',
  '/js/core/AppState.js',
  '/js/core/AppTimer.js',
  '/js/core/AppAudio.js',
  '/js/core/AppNavigation.js',
  '/js/core/AudioIdiomas.js',
  '/js/core/AudioPlayer.js',
  '/js/core/AnalisadorEstatisticas.js',
  '/js/core/AnalisadorExtracao.js',
  '/js/core/PDFGenerator.js',
  '/js/models/PalavrasModel.js',
  '/js/models/FrasesModel.js',
  '/js/services/StorageService.js',
  '/js/services/ValidatorService.js',
  '/js/services/ShufflerService.js',
  '/js/services/ProgressService.js',
  '/js/services/ErrorHandler.js',
  '/js/services/LoadingManager.js',
  '/js/ui/ThemeManager.js',
  '/js/ui/NavigationManager.js',
  '/js/ui/AudioUISelector.js',
  '/js/ui/AnalisadorUI.js',
  '/js/ui/ProgressoUI.js',
  '/js/ui/Toast.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache aberto');
      return cache.addAll(urlsToCache);
    })
  );
});

// Busca em cache (estratégia: cache first, network fallback)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

// Atualização do cache
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});