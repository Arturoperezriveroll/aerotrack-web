const CACHE_NAME = 'aerotrack-v16';
const APP_SHELL = [
  './',
  './index.html',
  './css/mapa_style.css',
  './manifest.json',
  './JS/display_airport_info.js',
  './JS/mapaProject/data.js',
  './JS/mapaProject/data_validator.js',
  './JS/updatePolyline.js',
  './JS/mapaProject/add_map_and_get_pos-1.js',
  './JS/get_distance_haversine.js',
  './JS/mapaProject/updateDistfromCurrent.js',
  './JS/mapaProject/fill_distance_table.js',
  './JS/mapaProject/display_route_line.js',
  './JS/mapaProject/build_route.js',
  './JS/mapaProject/tab_navigation.js',
  './JS/mapaProject/zoom_last_fix.js',
  './JS/mapaProject/start_stop_track.js',
  './JS/mapaProject/traffic_info.js',
  './JS/get_address_and_wx.js',
  './JS/mapaProject/route_engine.js',
  './JS/geojson/generadorRutas.js',
  './JS/geojson/mexicoAirports.js',
  './JS/png/icon-192.png',
  './JS/png/icon-512.png'
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

