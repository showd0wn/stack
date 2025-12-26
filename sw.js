const CACHE_NAME = "stack-game-v1";
const CACHE_LIST = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./icon-192.png",
  "./icon-512.png",
  "./sounds/game_end.wav",
  "./sounds/game_start.wav",
  "./sounds/stack_combo.wav",
  "./sounds/stack_cut.wav",
];

// Install 阶段：全量缓存
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_LIST);
    }),
  );
});

// Activate 阶段：清理旧版本缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              return caches.delete(cacheName);
            }),
        );
      })
      .then(() => clients.claim()),
  );
});

// Fetch 阶段：缓存优先
self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) {
    return;
  }
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true, ignoreVary: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    }),
  );
});
