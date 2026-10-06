// Service worker del Grafólisis.
// IMPORTANTE: cada vez que publiques cambios en el HTML, sube el número de VERSION
// para que los usuarios reciban la versión nueva.
const VERSION = 'v1';
const CACHE = 'lacaniano-' + VERSION;
const APP_SHELL = ['./', './editor-mobile.html', './privacidad.html', './manifest.webmanifest',
                   './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.svg'];
// Librerías externas que usa la app: se guardan para que abra sin conexión
const CDN_OK = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const esFirebaseSDK = (u) => u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/');

self.addEventListener('install', (e) => {
  // allSettled: si falta algún archivo, el resto igual se guarda (no se cae la instalación)
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.allSettled(APP_SHELL.map((u) => c.add(u))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('lacaniano-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Nunca se interceptan las llamadas de datos de Firebase (login, Firestore): siempre a la red
  const mismoOrigen = url.origin === self.location.origin;
  const cdn = CDN_OK.includes(url.hostname) || esFirebaseSDK(url);
  if (!mismoOrigen && !cdn) return;
  // Abrir una página: red primero y, sin conexión, la copia guardada
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then((r) => r || caches.match('./editor-mobile.html'))));
    return;
  }
  // Resto: usa la copia guardada y la refresca en segundo plano
  e.respondWith(caches.match(req).then((hit) => {
    const red = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; }).catch(() => hit);
    return hit || red;
  }));
});
