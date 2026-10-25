
const CACHE_NAME = "freshfry-admin-v1";

const APP_FILES = [
  "/admin.html",
  "/admin-manifest.json",
  "/logo.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key =>
            key.startsWith("freshfry-admin-") &&
            key !== CACHE_NAME
          )
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Firebase, CDN aur external requests ko cache nahi karna.
  if (url.origin !== self.location.origin) return;

  // Admin dashboard hamesha network se latest version lene ki
  // koshish karega; offline hone par cached HTML khulega.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache =>
              cache.put("/admin.html", copy)
            );
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match("/admin.html");
          if (cached) return cached;

          return new Response(
            "Freshfry Admin offline hai. Internet connect karke dobara kholen.",
            {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" }
            }
          );
        })
    );
    return;
  }

  // Sirf wahi same-origin assets cache se serve honge
  // jo pehle se cache mein maujood hain.
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
