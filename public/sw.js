/**
 * TELA-ERP Service Worker — self-destruct stub.
 *
 * Offline asset caching has been disabled because it kept already-open browsers
 * on stale builds until users manually hard-refreshed. This stub takes over any
 * previously installed service worker, deletes every cache it created, and then
 * unregisters itself so all future requests go straight to the network.
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (_err) {
        // ignore — best-effort cleanup
      }

      try {
        await self.registration.unregister();
      } catch (_err) {
        // ignore — best-effort
      }

      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((client) => {
          // Force a fresh load so the page is no longer controlled by this SW.
          client.navigate(client.url).catch(() => undefined);
        });
      } catch (_err) {
        // ignore
      }
    })(),
  );
});

// Pass every fetch straight through to the network — no caching whatsoever.
self.addEventListener('fetch', () => {
  // Intentionally empty: do not call event.respondWith so the browser handles it.
});
