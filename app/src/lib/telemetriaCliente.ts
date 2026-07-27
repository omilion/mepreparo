"use client";

// Manda un evento de fallo desde el navegador. Silencioso y sin await por
// diseño: si la telemetría no llega, no pasa nada; si retrasa una clase, sí.
//
// Solo se llama en puntos donde algo se rompió o el sistema tuvo que corregir
// a la IA. Nunca lleva lo que el niño escribió (ver lib/telemetria).

import { leerSesionAlumno } from "./storage";
import type { TipoEvento } from "./telemetria";

export function avisarEvento(
  tipo: TipoEvento,
  datos: { pupiloId?: string; materia?: string; meta?: Record<string, number | boolean | string> } = {}
): void {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // en modo alumno no hay cookie de apoderado: va el token del niño
    const sesion = leerSesionAlumno();
    if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;

    void fetch("/api/eventos", {
      method: "POST",
      headers,
      body: JSON.stringify({ tipo, ...datos }),
      keepalive: true, // sobrevive si el niño cierra la pestaña justo ahí
    }).catch(() => {});
  } catch {
    // nunca interrumpe
  }
}
