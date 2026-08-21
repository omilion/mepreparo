"use client";

import { useEffect } from "react";
import {
  CLAVE_RECUPERACION_DESPLIEGUE,
  esCacheDeMePreparo,
  esErrorDeDespliegue,
  puedeIntentarRecuperacion,
} from "@/lib/despliegue";

function esWorkerDeMePreparo(registro: ServiceWorkerRegistration): boolean {
  const workers = [registro.active, registro.waiting, registro.installing];
  return workers.some((worker) => {
    if (!worker) return false;
    try {
      const url = new URL(worker.scriptURL);
      return url.origin === window.location.origin && url.pathname === "/sw.js";
    } catch {
      return false;
    }
  });
}

async function recuperarDespliegue() {
  const ultimoIntento = sessionStorage.getItem(
    CLAVE_RECUPERACION_DESPLIEGUE
  );
  if (!puedeIntentarRecuperacion(ultimoIntento)) return;

  // Se escribe antes de cualquier await para que dos errores simultaneos no
  // inicien dos limpiezas ni dos recargas.
  sessionStorage.setItem(
    CLAVE_RECUPERACION_DESPLIEGUE,
    String(Date.now())
  );

  try {
    if ("serviceWorker" in navigator) {
      const registros = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registros
          .filter(esWorkerDeMePreparo)
          .map((registro) => registro.unregister())
      );
    }

    if ("caches" in window) {
      const claves = await caches.keys();
      await Promise.all(
        claves.filter(esCacheDeMePreparo).map((clave) => caches.delete(clave))
      );
    }
  } catch {
    // Incluso si una limpieza parcial falla, la red puede resolver la recarga.
  } finally {
    // Nunca se toca localStorage: cuenta, alumnos y progreso se conservan.
    window.location.reload();
  }
}

export function DetectorDespliegue() {
  useEffect(() => {
    function alError(evento: ErrorEvent) {
      if (esErrorDeDespliegue(evento.message || "")) {
        void recuperarDespliegue();
      }
    }

    function alRechazo(evento: PromiseRejectionEvent) {
      const mensaje = evento.reason?.message || String(evento.reason || "");
      if (esErrorDeDespliegue(mensaje)) void recuperarDespliegue();
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
