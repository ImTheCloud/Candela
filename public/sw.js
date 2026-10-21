// The site no longer works offline. Phones that still have the old service worker get this one instead:
// it clears the old caches, removes itself, and reloads the page so everything comes fresh from the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
