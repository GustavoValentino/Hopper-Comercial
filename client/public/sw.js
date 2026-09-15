const VERSION = "hopper-v3";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/offline.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("hopper-") &&
                key !== STATIC_CACHE &&
                key !== RUNTIME_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // API: network-first — dado sempre fresco, cai pro cache se offline
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  // Assets estáticos PRÓPRIOS: cache-first — carregamento instantâneo
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(request, clone));
            return response;
          }),
      ),
    );
    return;
  }

  // Navegação entre rotas: network-first com fallback pra página offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html")),
    );
    return;
  }
});

// ---------- Push Notifications ----------

self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: "Alerta do Hopper", body: event.data?.text() || "" };
  }

  const title = data.title || "Alerta do Hopper";
  const options = {
    body: data.body || "Você tem uma nova atualização no estoque.",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    vibrate: [100, 50, 100],
    tag: data.tag || "hopper-alerta",
    renotify: true,
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
