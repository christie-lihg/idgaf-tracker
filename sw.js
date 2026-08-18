/* Symptom Tracker — offline-first service worker.
 *
 * The app has no backend: every entry lives in this device's localStorage.
 * So the only thing worth caching is the app shell, and cache-first is the
 * correct strategy — the app should open instantly and work with no network.
 *
 * Bump CACHE_VERSION whenever any shell file changes, or returning users will
 * keep booting the old cached build.
 */
const CACHE_VERSION = 'symptom-tracker-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './vendor/chart.umd.min.js',
  './js/symptoms.js',
  './js/storage.js',
  './js/utils.js',
  './js/nav.js',
  './js/morning.js',
  './js/today.js',
  './js/dashboard.js',
  './js/history.js',
  './js/past-day-modal.js',
  './js/cycle.js',
  './js/import-health.js',
  './js/init.js',
  './js/register-sw.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const sameOrigin = new URL(request.url).origin === self.location.origin;

  if (sameOrigin) {
    // App shell: cache-first, revalidate in the background.
    e.respondWith(
      caches.match(request).then((hit) => {
        const net = fetch(request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Cross-origin (Google Fonts): network-first, fall back to cache, then to
  // nothing — the CSS declares system-font fallbacks, so this degrades quietly.
  e.respondWith(
    fetch(request).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
      }
      return res;
    }).catch(() => caches.match(request))
  );
});
