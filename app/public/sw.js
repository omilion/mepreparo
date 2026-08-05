// Service worker MÍNIMO (Fase 5.1): cachea el shell de la app y los assets
// estáticos para que se pueda ABRIR sin internet. Deliberadamente NO cachea
// nada bajo /api/ — Rai necesita la API en vivo, y fingir que responde
// offline sería peor que decir la verdad. Si /api/* falla, falla: el cliente
// (Tutor.tsx) ya sabe mostrar el mensaje honesto.

const VERSION = "v1";
const CACHE_SHELL = `mepreparo-shell-${VERSION}`;
const CACHE_ESTATICOS = `mepreparo-estaticos-${VERSION}`;

// Rutas de navegación estables (sin hash de build) que vale la pena tener
// listas desde el instalar, más los iconos de la PWA.
const PRECACHE = [
  "/",
  "/hoy",
  "/mapa",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {}) // una ruta 404 en precache no debe tumbar la instalación
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves
            .filter((k) => k !== CACHE_SHELL && k !== CACHE_ESTATICOS)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // NUNCA interceptar la API: que falle de verdad si no hay red, en vez de
  // servir una respuesta vieja de Rai o de un ejercicio.
  if (url.pathname.startsWith("/api/")) return;

  // Navegación (el niño abre o recarga una página): red primero, y si no hay
  // red, la versión cacheada de ESA ruta, o si nunca se cacheó, el shell "/".
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_SHELL).then((cache) => cache.put(request, copia));
          return res;
        })
        .catch(
          () =>
            caches.match(request).then((r) => r || caches.match("/"))
        )
    );
    return;
  }

  // Assets estáticos (JS/CSS/fuentes/imágenes de _next y públicos): cache
  // primero, y de paso los va guardando la primera vez que se piden — así el
  // shell queda offline-capaz progresivamente, sin tener que listar a mano
  // los nombres con hash que genera cada build.
  event.respondWith(
    caches.match(request).then((cacheada) => {
      if (cacheada) return cacheada;
      return fetch(request)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone();
            caches.open(CACHE_ESTATICOS).then((cache) => cache.put(request, copia));
          }
          return res;
        })
        .catch(() => cacheada); // sin red y sin caché: no hay nada que devolver
    })
  );
});
