"use client";

import { useEffect } from "react";

// Tras cada deploy, una pestaña que quedó abierta desde ANTES sigue con el
// JS viejo en memoria: cualquier acción de servidor o "chunk" que ya no
// existe en el build nuevo revienta con "Failed to find Server Action" o
// "Loading chunk X failed". No es un error del servidor: hay que traer la
// versión actual.
//
// Un simple location.reload() NO alcanza: el service worker (RegistrarSW)
// cachea los assets estáticos "cache-primero" y, si el navegador ya tenía
// algo cacheado con ese nombre, lo sigue sirviendo aunque se recargue la
// página — la recarga vuelve a pedirle los mismos archivos viejos al SW y
// el error se repite. Primero descontrolado (unregister) y borramos los
// cachés; recién ahí recargamos para que la petición vaya de verdad a la red.
const CLAVE_RECARGA = "mp-recarga-por-deploy";

function esErrorDeDeploy(mensaje: string): boolean {
  return (
    /Failed to find Server Action/i.test(mensaje) ||
    /Loading chunk .* failed/i.test(mensaje) ||
    /ChunkLoadError/i.test(mensaje)
  );
}

async function recargarUnaVez() {
  // guard con sessionStorage: si el error persistiera después de recargar
  // (no debería, ahora que limpiamos SW + cachés), esto evita un loop.
  if (sessionStorage.getItem(CLAVE_RECARGA)) return;
  sessionStorage.setItem(CLAVE_RECARGA, "1");
  try {
    if ("serviceWorker" in navigator) {
      const registros = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registros.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const claves = await caches.keys();
      await Promise.all(claves.map((k) => caches.delete(k)));
    }
  } catch {
    // si la limpieza falla, igual conviene recargar a que quedarse atascado
  } finally {
    window.location.reload();
  }
}

export function DetectorDespliegue() {
  useEffect(() => {
    function alError(e: ErrorEvent) {
      if (esErrorDeDeploy(e.message || "")) void recargarUnaVez();
    }
    function alRechazo(e: PromiseRejectionEvent) {
      const msg = e.reason?.message || String(e.reason || "");
      if (esErrorDeDeploy(msg)) void recargarUnaVez();
    }
    window.addEventListener("error", alError);
    window.addEventListener("unhandledrejection", alRechazo);
    return () => {
      window.removeEventListener("error", alError);
      window.removeEventListener("unhandledrejection", alRechazo);
    };
  }, []);

  return null;
}
