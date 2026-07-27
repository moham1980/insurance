/**
 * Service Worker placeholder for PWA foundation.
 * Phase 1 — Quick Wins
 *
 * TODO: Implement Cache-First strategy, background sync, and push notifications
 * in Phase 2 or Phase 3.
 */

const CACHE_NAME = 'insurance-console-v1';
const STATIC_ASSETS = ['/', '/login'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  // @ts-ignore
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .catch(() => {})
  );
  // @ts-ignore
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first for API requests, cache-first for static assets
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match(request).then((r) => r || new Response('offline', { status: 503 })))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => new Response('offline', { status: 503 }));
    })
  );
});
