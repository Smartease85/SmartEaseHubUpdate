/* Complete releases cache atomically. An update never interrupts a live BLE session. */
const CACHE_NAME = "smartease-cart-lights-v20";
const ASSETS = [
  "./index.html",
  "./cart-zones.js",
  "./cart-zones.css",
  "./lighting-engine.js",
  "./lotus-protocol.js",
  "./device-adapters.js",
  "./coolledux-protocol.js",
  "./coolledux-workspace.js",
  "./app.js",
  "./display-project.js",
  "./coolled-protocol.js",
  "./display-editor.js",
  "./native-controls.js",
  "./app.css",
  "./manifest.webmanifest",
  "./cart-precedent-front.webp",
  "./cart-precedent-rear.webp",
  "./icon.svg",
  "./smartease-logo.svg",
  "./icon-192.png",
  "./icon-512.png",
];
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (k) =>
                  k.startsWith("smartease-cart-lights-") && k !== CACHE_NAME,
              )
              .map((k) => caches.delete(k)),
          ),
        ),
      self.clients.claim(),
    ]),
  ),
);
// No skipWaiting: close every app tab to activate a waiting release.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  if (
    event.request.mode === "navigate" &&
    (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html"))
  ) {
    event.respondWith(
      caches
        .match(new URL("./index.html", self.location.href).href)
        .then((hit) => hit || fetch(event.request)),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request)),
  );
});
