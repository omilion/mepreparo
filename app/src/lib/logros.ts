"use client";

// Dispara el correo de "logro" al apoderado cuando un tema recién se superó.
// Fire-and-forget: si falla, el niño no se entera ni se bloquea nada (el
// logro ya quedó guardado en tutoria.temas de todas formas).

import { leerSesionAlumno } from "./storage";
import type { Materia } from "./profile";

export function notificarLogros(pupiloId: string, nuevos: { tema: string; materia: Materia }[]): void {
  if (!pupiloId || nuevos.length === 0) return;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sesion = leerSesionAlumno();
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;

  for (const { tema, materia } of nuevos) {
    void fetch("/api/pupilo/logro", {
      method: "POST",
      headers,
      body: JSON.stringify({ pupiloId, tema, materia }),
      keepalive: true,
    }).catch(() => {});
  }
}
