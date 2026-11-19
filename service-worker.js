const CACHE_NAME = 'aerotrack-v63';
const APP_SHELL = [
  './manifest.json',
  './JS/png/icon-192.png',
  './JS/png/icon-512.png',
  './JS/vendor/pdf-lib.min.js',
  './JS/mapaProject/aip_2026_data.js',
  './JS/mapaProject/export_icao_fpl.js',
  './JS/mapaProject/mobile_keyboard.js',
  './assets/pdf/FPL_FORM_AFAC.PDF'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.endsWith('/config.js') || requestUrl.pathname.endsWith('/config.local.js')) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isPageOrCode =
    event.request.mode === 'navigate' ||
    requestUrl.pathname.endsWith('.html') ||
    requestUrl.pathname.endsWith('.css') ||
    requestUrl.pathname.endsWith('.js');

  if (isPageOrCode) {
    event.respondWith(
      fetch(event.request, { cache: 'reload' }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }))
    )
  );
  self.clients.claim();
});

