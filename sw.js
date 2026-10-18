const CACHE = 'gb-shell-v2';

function scopePath() {
  return new URL('./', self.location).pathname;
}

function inScopeDir(pathname, dir) {
  return pathname.startsWith(`${scopePath()}${dir}`);
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (inScopeDir(url.pathname, 'models/') || inScopeDir(url.pathname, 'ort/')) {
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        return cached || caches.match(new URL('404.html', self.location).href);
      }),
    );
    return;
  }
  if (inScopeDir(url.pathname, '_astro/') || inScopeDir(url.pathname, 'icons/') || inScopeDir(url.pathname, 'og/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) {
          return hit;
        }
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }),
    );
  }
});
