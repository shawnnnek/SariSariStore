/* sw.js - the "service worker".
   It keeps a copy of the app's files on the phone so the POS opens even with no internet.
   - Our own files: try the internet first (so updates arrive), use the saved copy if offline.
   - The scanner library from the internet: use the saved copy first (it never changes). */

const CACHE_NAME = "sari-pos-v8";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.webmanifest",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(FILES); })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.filter(function (n) { return n !== CACHE_NAME; })
                              .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") { return; }

  const sameSite = new URL(request.url).origin === self.location.origin;

  if (sameSite) {
    // Internet first, saved copy as backup
    event.respondWith(
      fetch(request, { cache: "no-store" }).then(function (response) {   // no-store: never use the phone's old copy
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
        return response;
      }).catch(function () {
        return caches.match(request, { ignoreSearch: true });
      })
    );
  } else {
    // Saved copy first, then the internet (and save what we get)
    event.respondWith(
      caches.match(request).then(function (saved) {
        return saved || fetch(request).then(function (response) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(request, copy); });
          return response;
        });
      })
    );
  }
});
