/* =====================================================================
   sw.js — Permite usar la aplicación sin conexión a Internet.
   Guarda los archivos de la app en el dispositivo. Cuando hay conexión,
   descarga en segundo plano la versión nueva (se verá al volver a abrir).
   Si cambias algún archivo, sube también este con VERSION aumentada.
   ===================================================================== */
var VERSION = 'control-horario-v3';
var FILES = [
  './',
  './index.html',
  './styles.css',
  './calc.js',
  './storage.js',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(VERSION).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(function () { return null; });
      if (cached) { e.waitUntil(net); return cached; }
      return net.then(function (res) {
        if (res) return res;
        if (req.mode === 'navigate') return cache.match('./index.html');
        return new Response('', { status: 504 });
      });
    });
  }));
});
