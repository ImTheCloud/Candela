// Generated at build time by integrations/service-worker.mjs.
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = `candela-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('candela-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const path = url.pathname.replace(/(.)\/$/, '$1');
  if (req.mode === 'navigate') {
    // pages: the network first (fresh after an update), the copy on the phone when offline
    event.respondWith(
      fetch(req).catch(() => caches.match(path, { cacheName: CACHE, ignoreSearch: true }).then((r) => r || caches.match('/404.html'))),
    );
    return;
  }
  // assets have hashed names and data changes only with a new version: the phone's copy first
  event.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((r) => r || fetch(req)));
});
