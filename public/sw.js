/*
 * Service worker voor Straten van Gouda (PWA).
 *
 * Caching-strategie die de dagelijkse verversing van de site respecteert:
 *  - navigaties (HTML) en /data/ : network-first  → online altijd vers, cache
 *    dient enkel als offline-terugval;
 *  - overige eigen assets (_next/static, iconen, css) : cache-first (immutable,
 *    hashed bestandsnamen);
 *  - externe bronnen (PDOK-kaarttegels, IIIF-beelden) : niet afgehandeld, gaan
 *    rechtstreeks over het netwerk (geen externe caching, RFP §6.1).
 */
const VERSIE = "v2";
const SHELL = `shell-${VERSIE}`;
const RUNTIME = `runtime-${VERSIE}`;
// Losse, niet-geversioneerde cache voor de offline-download (blijft bij updates).
const OFFLINE = "offline-straten";

// Kernbestanden voor een werkende offline-schil (kaart + zoeken).
const APP_SHELL = [
  "/",
  "/hulp/",
  "/colofon/",
  "/data/index.json",
  "/data/straten.geojson",
  "/favicon.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((namen) =>
        Promise.all(
          namen
            // Alleen oude shell-/runtime-caches opruimen; OFFLINE behouden.
            .filter(
              (n) =>
                (n.startsWith("shell-") || n.startsWith("runtime-")) &&
                !n.endsWith(VERSIE)
            )
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Externe bronnen (PDOK-tegels, IIIF-beelden, miniaturen): serveer uit de
  // cache als ze offline zijn opgeslagen, anders gewoon via het netwerk. Er
  // wordt niets automatisch bijgecachet (dat doet alleen de offline-download).
  if (url.origin !== self.location.origin) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  const isData = url.pathname.startsWith("/data/");
  const isNavigatie = request.mode === "navigate";

  // Network-first voor pagina's en data: vers wanneer online, cache als terugval.
  if (isNavigatie || isData) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const kopie = res.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, kopie));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || (isNavigatie ? caches.match("/") : undefined))
        )
    );
    return;
  }

  // Cache-first voor overige eigen assets.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const kopie = res.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, kopie));
          return res;
        })
    )
  );
});
