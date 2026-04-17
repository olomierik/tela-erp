/**
 * TELA-ERP Service Worker — offline asset caching.
 *
 * Strategies:
 * - App shell (index.html, JS, CSS): stale-while-revalidate.
 * - Static assets (images, fonts): cache-first.
 * - API calls to /rest/v1/ or /functions/v1/: network-first with short timeout,
 *   fall back to cached response (for idempotent GETs only).
 * - All other requests: passthrough.
 */

const VERSION = 'v1';
const SHELL_CACHE  = `tela-shell-${VERSION}`;
const STATIC_CACHE = `tela-static-${VERSION}`;
const API_CACHE    = `tela-api-${VERSION}`;

const SHELL_ASSETS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL_CACHE, STATIC_CACHE, API_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|webp|svg|ico)(\?|$)/i.test(url);
}

function isApiCall(url) {
  return /\/(rest|functions)\/v1\//.test(url);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App shell — SWR
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req).then((res) => {
          if (res && res.ok) caches.open(SHELL_CACHE).then((c) => c.put(req, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || net;
      }),
    );
    return;
  }

  // Static assets — cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.ok) caches.open(STATIC_CACHE).then((c) => c.put(req, res.clone()));
        return res;
      })),
    );
    return;
  }

  // API GETs — network-first with 3s timeout, fall back to cache
  if (isApiCall(url.href)) {
    event.respondWith(
      Promise.race([
        fetch(req).then((res) => {
          if (res && res.ok) caches.open(API_CACHE).then((c) => c.put(req, res.clone()));
          return res;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]).catch(() => caches.match(req)),
    );
    return;
  }
});

// Message from app: "skipWaiting" to activate a new SW immediately.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
