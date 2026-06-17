// Service worker — Střelecká soutěž
//
// HOW TO UPDATE THE APP:
// Bump the version string below (v1.0.0 → v1.0.1 → v1.1.0 ...) every time you
// push changes to GitHub. The new version triggers deletion of the
// old cache and a fresh download on the next online visit.
const CACHE_VERSION = 'v1.0.3';
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

// Message handler: force-refresh the cached app shell from the network.
// Triggered by the "check for updates" button once a new version is found.
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'REFRESH_CACHE') return;
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const urls = ['./', './index.html', './manifest.json', './apple-touch-icon.png'];
      await Promise.allSettled(urls.map(async (url) => {
        try {
          // cache:'reload' bypasses the HTTP cache so we get fresh files
          const resp = await fetch(url, { cache: 'reload' });
          if (resp && resp.ok) await cache.put(url, resp.clone());
        } catch (e) {}
      }));
      // Tell the page we're done so it can reload
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: 'CACHE_REFRESHED' }));
    })
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
