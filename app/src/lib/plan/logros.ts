// Set corto de logros (NO puntos, NO ranking: acompañamos, no competimos).
// Cada uno es una condición derivada del perfil — nada nuevo que guardar
// salvo CUÁLES ya se celebraron (perfil.contexto.logrosVistos), para que la
// fiesta de partículas ocurra una sola vez por logro.

import type { Curso, PerfilNino } from "@/lib/profile";
import { etapasDeMateria } from "./etapas";

export type LogroId =
  | "primera_sesion"
  | "racha_3"
  | "primera_etapa"
  | "primer_simulacro"
  | "materia_completa";

export interface Logro {
  id: LogroId;
  titulo: string;
  descripcion: string;
}

// Set corto a propósito (ver plan de cierre, Fase 3.4): no es un sistema de
// puntos, son cinco hitos que de verdad importan en el camino a un examen.
export const LOGROS: Logro[] = [
  { id: "primera_sesion", titulo: "Primera sesión", descripcion: "Estudiaste con Rai por primera vez." },
  { id: "racha_3", titulo: "3 días seguidos", descripcion: "Volviste a estudiar 3 días seguidos." },
  { id: "primera_etapa", titulo: "Primera etapa superada", descripcion: "Superaste tu primera etapa del camino." },
  { id: "primer_simulacro", titulo: "Primer simulacro", descripcion: "Rendiste tu primer simulacro de examen." },
  { id: "materia_completa", titulo: "Materia completa", descripcion: "Superaste todas las etapas de una materia." },
];

const LOGROS_POR_ID = new Map(LOGROS.map((l) => [l.id, l]));

export function logroDe(id: LogroId): Logro {
  return LOGROS_POR_ID.get(id)!;
}

// Qué logros están desbloqueados AHORA, mirando el estado actual del perfil
// (no un historial: si algo se cumple, cuenta, sin importar cuándo pasó).
export function logrosDesbloqueados(perfil: PerfilNino, curso: Curso, racha: number): LogroId[] {
  const desbloqueados: LogroId[] = [];
  const sesiones = perfil.tutoria?.sesiones ?? [];
  const temas = perfil.tutoria?.temas ?? [];

  if (sesiones.length >= 1) desbloqueados.push("primera_sesion");
  if (racha >= 3) desbloqueados.push("racha_3");
  if (temas.some((t) => t.estado === "superado")) desbloqueados.push("primera_etapa");
  if (temas.some((t) => t.evidencias.some((e) => e.tipo === "simulacro"))) {
    desbloqueados.push("primer_simulacro");
  }

  const materiaCompleta = perfil.examen.materias.some((m) => {
    const etapas = etapasDeMateria(m, curso, perfil.tutoria);
    return etapas.length > 0 && etapas.every((e) => e.estado === "superada");
  });
  if (materiaCompleta) desbloqueados.push("materia_completa");

  return desbloqueados;
}

// Los desbloqueados que todavía NO se han celebrado (no están en "vistos").
export function logrosNuevos(desbloqueados: LogroId[], vistos: string[] | undefined): LogroId[] {
  const vistosSet = new Set(vistos ?? []);
  return desbloqueados.filter((id) => !vistosSet.has(id));
}
