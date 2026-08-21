// Service worker deliberadamente pequeno y seguro.
//
// Las paginas, los datos RSC y los archivos de /_next pertenecen a un build
// concreto. Cachearlos aqui puede mezclar dos despliegues y dejar la PWA en
// un ciclo de recargas. Por eso solo guardamos recursos publicos inmutables;
// todo lo que ejecuta la aplicacion siempre se obtiene de la red/navegador.
const CACHE_RECURSOS = "mepreparo-recursos-seguros-v1";
const PREFIJO_CACHE_APP = "mepreparo-";

const RECURSOS_SEGUROS = [
  "/offline.html",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_RECURSOS)
      .then((cache) =>
        Promise.allSettled(
          RECURSOS_SEGUROS.map((recurso) => cache.add(recurso))
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const claves = await caches.keys();
      const veniaDelWorkerAntiguo = claves.some(
        (clave) =>
          clave.startsWith("mepreparo-shell-") ||
          clave.startsWith("mepreparo-estaticos-")
      );

      await Promise.all(
        claves
          .filter(
            (clave) =>
              clave.startsWith(PREFIJO_CACHE_APP) &&
              clave !== CACHE_RECURSOS
          )
          .map((clave) => caches.delete(clave))
      );
      await self.clients.claim();

      // Saca de inmediato del worker v2 a quienes ya estaban atrapados. Solo
      // ocurre en esta migracion; una instalacion nueva no recarga la pagina.
      if (veniaDelWorkerAntiguo) {
        const ventanas = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(
          ventanas.map((ventana) => ventana.navigate(ventana.url))
        );
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Conservamos una salida clara sin internet, pero nunca una pagina de Next
  // perteneciente a un build anterior.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match("/offline.html");
        return (
          offline ||
          new Response("Sin conexion. Vuelve a intentarlo cuando tengas red.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      })
    );
    return;
  }

  // No almacenar API, RSC, JS, CSS ni ningun archivo de Next. El navegador
  // siempre debe recibir recursos del despliegue vigente.
  if (!RECURSOS_SEGUROS.includes(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_RECURSOS).then(async (cache) => {
      try {
        const respuesta = await fetch(request);
        if (respuesta.ok) await cache.put(request, respuesta.clone());
        return respuesta;
      } catch (error) {
        const guardada = await cache.match(request);
        if (guardada) return guardada;
        throw error;
      }
    })
  );
});
