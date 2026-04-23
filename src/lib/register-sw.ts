/**
 * Service worker bootstrap.
 *
 * Real-time updates take priority over offline caching: any cached HTML/JS/CSS
 * from a previously installed service worker would keep already-open browsers
 * pinned to a stale build until they manually hard-refreshed. To guarantee that
 * every user sees changes immediately, this module now actively unregisters any
 * existing service worker and purges all caches on every app boot.
 *
 * The on-disk `/sw.js` has also been converted to a self-destruct stub so any
 * browser that still fetches it will tear itself down on the next visit.
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  // Unregister every service worker controlling this origin.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined);
  }

  // Purge any previously created caches (app shell, static assets, API responses).
  if ('caches' in window) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => undefined);
  }
}
