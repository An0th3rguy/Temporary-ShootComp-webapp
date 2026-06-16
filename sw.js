// Service worker — Střelecká soutěž
//
// HOW TO UPDATE THE APP:
// Bump the version string below (v1 → v2 → v3 ...) every time you
// push changes to GitHub. The new version triggers deletion of the
// old cache and a fresh download on the next online visit.
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'shootcomp-' + CACHE_VERSION;

// Pre-cache the app shell on install.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled([
        cache.add('./'),
        cache.add('./index.html'),
        cache.add('./manifest.json'),
        cache.add('./apple-touch-icon.png'),
      ])
    ).then(() => self.skipWaiting())
  );
});

// Activate: delete all caches from previous versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.startsWith('shootcomp-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first with network fallback.
// Successful GET responses are stored so the app works fully offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (resp && resp.ok && (resp.type === 'basic' || resp.type === 'default')) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return resp;
      }).catch(() =>
        // Offline and not cached: fall back to the cached app shell
        event.request.mode === 'navigate'
          ? caches.match('./').then((r) => r || caches.match('./index.html'))
          : undefined
      );
    })
  );
});
