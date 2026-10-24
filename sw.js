// Service worker Bohye Page — membuat aplikasi bisa dipasang (Android, iOS, PC) & tetap terbuka saat offline.
importScripts("version.js");
const CACHE = "bohye-" + self.APP_VERSION;

const CORE = [
  "./", "index.html", "dashboard.html", "admin.html", "profile.html", "404.html",
  "css/style.css", "css/themes.css", "version.js", "firebase-config.js", "manifest.webmanifest",
  "js/theme-boot.js", "js/firebase.js", "js/ui.js", "js/site.js", "js/pwa.js", "js/device.js",
  "js/badges.js", "js/youtube.js", "js/player-ui.js", "js/card.js", "js/app.js", "js/dashboard.js", "js/profile.js", "js/admin.js",
  "js/redirect.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  // Tidak langsung aktif: halaman akan menampilkan tombol "Perbarui".
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => (k.startsWith("glint-") || k.startsWith("bohye-")) && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") self.skipWaiting();
  if (e.data === "getVersion") e.source?.postMessage({ type: "version", version: self.APP_VERSION });
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Jangan pernah meng-cache data/login Firebase — selalu langsung ke server.
  const isFirebaseSdk = url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/");
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !isFirebaseSdk && !isFont) return;

  // SDK Firebase & font: versi tetap → cache dulu
  if (isFirebaseSdk || isFont) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // File situs sendiri: jaringan dulu (supaya selalu terbaru), cache bila offline
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: "no-cache" });
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch (_) {
      const hit = await caches.match(req, { ignoreSearch: req.mode === "navigate" });
      if (hit) return hit;
      if (req.mode === "navigate") return caches.match("index.html");
      throw _;
    }
  })());
});
