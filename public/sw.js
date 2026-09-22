// Gramin Kirana Service Worker — Enterprise Hardened PWA Cache
const CACHE_VERSION = 'gk-pos-v1.0.2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg'
];

// 1. Install Event: Atomic Pre-caching of verified app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Deterministic purge of obsolete cache generations
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. PostMessage Handler: Safe skip-waiting signal
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 4. Fetch Interception Guard
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Security Guard 1: Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Security Guard 2: Origin isolation (prevent caching cross-origin APIs or CDNs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Security Guard 3: Strict API, Health, Service Worker & Sensitive Path Exclusion (Zero Caching)
  const pathname = url.pathname.toLowerCase();
  if (
    pathname === '/sw.js' ||
    pathname.startsWith('/api/') ||
    pathname === '/health' ||
    request.headers.has('Authorization') ||
    request.headers.has('x-auth-token')
  ) {
    return;
  }

  // Security Guard 4: Scheme verification (ignore chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Strategy A: Navigation (HTML document) -> Network-First with Offline Fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedDoc = await caches.match(request);
          return cachedDoc || caches.match('/index.html');
        })
    );
    return;
  }

  // Strategy B: Static Assets (JS, CSS, SVGs, Images) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          // Verify response is clean, non-partial, and from same origin
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

