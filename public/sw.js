// Kill-switch: bypass cache for all requests, clear storage, unregister
self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return clients.claim(); })
      .then(function () { return self.registration.unregister(); })
  );
});

// Serve everything fresh from network — bypasses any stale cache
self.addEventListener('fetch', function (e) {
  if (e.request.method === 'GET') {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(function () {
        return caches.match(e.request);
      })
    );
  }
});
