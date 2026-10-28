const BUILD_ASSETS = [];
const CACHE = "point-zero-aime-v1";
const SHELL = [...BUILD_ASSETS,"./", "./index.html", "./manifest.webmanifest", "./app-icon.svg", "./images/grille-roses.png", "./images/papillon.png", "./images/hero-ipad-broderie.jpg"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then(async (cache) => {
    // A failed critical asset must reject installation: keep the previous offline shell.
    await cache.addAll([...BUILD_ASSETS, "./", "./index.html"]);
    await Promise.all(SHELL.filter(path=>!BUILD_ASSETS.includes(path)&&path!=="./"&&path!=="./index.html").map(path=>cache.add(path).catch(()=>undefined)));
    await self.skipWaiting();
  }));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then(async (keys) => {
    await Promise.all(keys.filter((key) => (key.startsWith("point-zero-b-") || key.startsWith("point-zero-manifest-") || key.startsWith("point-zero-aime-")) && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  }));
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_ASSET" || typeof event.data.url !== "string") return;
  try {
    const url = new URL(event.data.url);
    if (url.origin !== self.location.origin || !/^https?:$/.test(url.protocol)) return;
    event.waitUntil(caches.open(CACHE).then((cache) => cache.add(url.href)).catch(() => undefined));
  } catch { /* Ignore invalid optional asset URLs. */ }
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (new URL(req.url).pathname.startsWith("/api/")) return; // Never cache consent, administration or confirmation endpoints.
  event.respondWith(fetch(req).then((response) => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(req, copy)); }
    return response;
  }).catch(async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    if (req.mode === "navigate") { const root = await caches.match(new URL("./index.html", self.registration.scope)); if (root) return root; }
    return Response.error();
  }));
});