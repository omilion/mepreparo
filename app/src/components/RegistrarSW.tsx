"use client";

import { useEffect } from "react";
import { sincronizarColaEventos } from "@/lib/telemetriaCliente";

export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let desmontado = false;
    let recargando = false;
    let teniaControlador = Boolean(navigator.serviceWorker.controller);

    // Cuando el worker nuevo toma el control, una sola recarga alinea el JS
    // que ya estaba en memoria con el build actual. Una primera instalacion
    // no recarga la pagina de un usuario nuevo.
    function alCambiarControlador() {
      if (desmontado) return;
      if (!teniaControlador) {
        teniaControlador = true;
        return;
      }
      if (recargando) return;
      recargando = true;
      window.location.reload();
    }

    async function registrarOActualizar() {
      try {
        const registro = await navigator.serviceWorker.register("/sw.js", {
          // Evita que el propio script del worker salga del cache HTTP.
          updateViaCache: "none",
        });
        await registro.update();
      } catch {
        // La app funciona sin service worker; no bloquear al estudiante.
      }
    }

    function alVolverALaPestana() {
      if (document.visibilityState === "visible") void registrarOActualizar();
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      alCambiarControlador
    );
    document.addEventListener("visibilitychange", alVolverALaPestana);
    window.addEventListener("online", registrarOActualizar);
    void registrarOActualizar();

    return () => {
      desmontado = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        alCambiarControlador
      );
      document.removeEventListener("visibilitychange", alVolverALaPestana);
      window.removeEventListener("online", registrarOActualizar);
    };
  }, []);

  // La cola de evidencia sigue siendo local y se reintenta al recuperar red.
  useEffect(() => {
    sincronizarColaEventos();
    window.addEventListener("online", sincronizarColaEventos);
    return () => window.removeEventListener("online", sincronizarColaEventos);
  }, []);

  return null;
}
