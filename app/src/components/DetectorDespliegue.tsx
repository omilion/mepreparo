"use client";

import { useEffect } from "react";

// Tras cada deploy, una pestaña que quedó abierta desde ANTES sigue con el
// JS viejo cargado en memoria: cualquier acción de servidor o "chunk" que ya
// no existe en el build nuevo revienta con "Failed to find Server Action" o
// "Loading chunk X failed" — y algo (reintento, efecto) lo repite en ráfaga
// sin que se vea nada en pantalla. No es un error del servidor: recargar una
// vez trae la versión actual y se soluciona solo.
const CLAVE_RECARGA = "mp-recarga-por-deploy";

function esErrorDeDeploy(mensaje: string): boolean {
  return (
    /Failed to find Server Action/i.test(mensaje) ||
    /Loading chunk .* failed/i.test(mensaje) ||
    /ChunkLoadError/i.test(mensaje)
  );
}

function recargarUnaVez() {
  // sessionStorage (no localStorage): el guard dura lo que dura la pestaña.
  // Si el error persistiera después de recargar (no debería), esto evita un
  // loop de recargas infinito.
  if (sessionStorage.getItem(CLAVE_RECARGA)) return;
  sessionStorage.setItem(CLAVE_RECARGA, "1");
  window.location.reload();
}

export function DetectorDespliegue() {
  useEffect(() => {
    function alError(e: ErrorEvent) {
      if (esErrorDeDeploy(e.message || "")) recargarUnaVez();
    }
    function alRechazo(e: PromiseRejectionEvent) {
      const msg = e.reason?.message || String(e.reason || "");
      if (esErrorDeDeploy(msg)) recargarUnaVez();
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
