// public/sw.js

const STATIC_CACHE = 'ecombio-static-v1';
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = ['/offline.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/build/') ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const {request} = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Cache-first for versioned static assets only. Everything else —
  // document navigations, React Router loader/.data requests, Storefront
  // API calls — can carry cart, customer, or personalized state, so it is
  // never cached and always goes to the network. On navigation failure
  // (offline), fall back to the offline page rather than a stale cached
  // page, so a stale cart/account view can never be served to the wrong
  // visitor on a shared device.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        });
      }),
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Everything else (Storefront API calls, loader/.data requests, etc.):
  // network only. No caching, no fallback — let failures surface normally
  // so the UI can show its own error state instead of stale data.
});
