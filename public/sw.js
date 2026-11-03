// Kill-switch: clears all caches, forces reload, unregisters this SW
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return clients.claim(); })
      .then(function () { return clients.matchAll({ type: 'window', includeUncontrolled: true }); })
      .then(function (cs) {
        cs.forEach(function (c) {
          try { c.navigate(c.url); } catch (_) {}
        });
      })
      .then(function () { return self.registration.unregister(); })
  );
});
