"use client";

// Manda un evento de fallo desde el navegador. Silencioso y sin await por
// diseño: si la telemetría no llega, no pasa nada; si retrasa una clase, sí.
//
// Solo se llama en puntos donde algo se rompió o el sistema tuvo que corregir
// a la IA. Nunca lleva lo que el niño escribió (ver lib/telemetria).
//
// Fase 5.1 — "cola local... para sincronizar al volver": si no hay red, el
// evento no se pierde, se guarda en localStorage y se reintenta al reconectar
// (ver sincronizarColaEventos, llamado desde RegistrarSW.tsx en el evento
// "online" del navegador).

import { leerSesionAlumno } from "./storage";
import type { TipoEvento } from "./telemetria";

const CLAVE_COLA = "mp_cola_eventos";
const MAX_COLA = 50; // tope: un niño offline por horas no debe inflar esto sin límite

interface EventoEncolado {
  tipo: TipoEvento;
  pupiloId?: string;
  materia?: string;
  meta?: Record<string, number | boolean | string>;
}

function leerCola(): EventoEncolado[] {
  try {
    const crudo = localStorage.getItem(CLAVE_COLA);
    return crudo ? JSON.parse(crudo) : [];
  } catch {
    return [];
  }
}

function guardarCola(cola: EventoEncolado[]): void {
  try {
    localStorage.setItem(CLAVE_COLA, JSON.stringify(cola.slice(-MAX_COLA)));
  } catch {
    /* localStorage lleno o inaccesible: se pierde el evento, nunca la clase */
  }
}

function encabezados(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const sesion = leerSesionAlumno();
  if (sesion?.token) headers["Authorization"] = `Bearer ${sesion.token}`;
  return headers;
}

export function avisarEvento(
  tipo: TipoEvento,
  datos: { pupiloId?: string; materia?: string; meta?: Record<string, number | boolean | string> } = {}
): void {
  try {
    void fetch("/api/eventos", {
      method: "POST",
      headers: encabezados(),
      body: JSON.stringify({ tipo, ...datos }),
      keepalive: true, // sobrevive si el niño cierra la pestaña justo ahí
    }).catch(() => {
      guardarCola([...leerCola(), { tipo, ...datos }]);
    });
  } catch {
    // nunca interrumpe
  }
}

// Reintenta lo que quedó pendiente por falta de red. Vacía la cola ANTES de
// reintentar: lo que vuelva a fallar se reencola solo (avisarEvento hace lo
// mismo), así nunca hay doble-envío del mismo lote si esto se llama dos veces.
export function sincronizarColaEventos(): void {
  const cola = leerCola();
  if (cola.length === 0) return;
  guardarCola([]);

  for (const evento of cola) {
    void fetch("/api/eventos", {
      method: "POST",
      headers: encabezados(),
      body: JSON.stringify(evento),
    }).catch(() => {
      guardarCola([...leerCola(), evento]);
    });
  }
}
