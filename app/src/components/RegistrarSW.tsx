"use client";

import { useEffect } from "react";
import { sincronizarColaEventos } from "@/lib/telemetriaCliente";

// Registra el service worker (Fase 5.1: cachea el shell para que la app abra
// sin internet). Silencioso: si el navegador no soporta SW o falla el
// registro, la app sigue funcionando exactamente igual, solo sin esta mejora.
export function RegistrarSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // Cola local de evidencia (Fase 5.1): al reconectar, reintenta lo que se
  // quedó sin mandar. También al montar, por si ya había vuelto la conexión
  // antes de que la pestaña terminara de cargar.
  useEffect(() => {
    sincronizarColaEventos();
    window.addEventListener("online", sincronizarColaEventos);
    return () => window.removeEventListener("online", sincronizarColaEventos);
  }, []);

  return null;
}
