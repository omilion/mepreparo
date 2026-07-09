// Motor del plan de estudio. Lógica pura (sin React).
//
// Toma el perfil (con diagnóstico, fecha de examen y horas/semana) y calcula:
//  - horas necesarias por materia (estimación MIXTA: nº de OA × factor de brecha)
//  - total de horas y su reparto
//  - veredicto: holgura | justo | apretado, comparando con el tiempo real
//  - si no alcanza: horas/semana que harían falta + orden de prioridad
//
// Ver docs/ARQUITECTURA-tecnica.md §5.

import {
  diasHastaExamen,
  type Materia,
  type PerfilNino,
} from "@/lib/profile";
import { oaDe } from "./oaPorCurso";

// Horas de estudio que toma "dominar" un OA cuando se parte de cero.
const HORAS_POR_OA = 0.9;
// Un OA ya dominado igual se repasa un poco (no cuesta 0).
const PISO_REPASO = 0.15;

export interface PlanMateria {
  materia: Materia;
  nivel: number; // 0..1 del diagnóstico
  horas: number; // horas estimadas para esta materia
  prioridad: number; // 1 = más urgente (menor nivel primero)
}

export type Veredicto = "holgura" | "justo" | "apretado";

export interface Plan {
  materias: PlanMateria[];
  horasTotales: number;
  diasRestantes: number | null;
  semanasRestantes: number | null;
  horasDisponibles: number | null; // hasta el examen, con las horas/sem actuales
  veredicto: Veredicto;
  // solo si veredicto = "apretado":
  horasSemanaSugeridas?: number;
}

// Factor de brecha: cuánto de la materia queda por trabajar según el nivel.
// nivel 1 (domina) -> casi solo repaso; nivel 0 -> todo por delante.
function factorBrecha(nivel: number): number {
  const n = Math.max(0, Math.min(1, nivel));
  return PISO_REPASO + (1 - PISO_REPASO) * (1 - n);
}

function horasMateria(materia: Materia, p: PerfilNino): number {
  const oa = oaDe(materia, p.curso);
  const nivel = p.diagnostico?.[materia]?.nivel ?? 0.5;
  const horas = oa * HORAS_POR_OA * factorBrecha(nivel);
  return Math.round(horas * 2) / 2; // redondeo a media hora
}

export function calcularPlan(p: PerfilNino): Plan {
  const materias: PlanMateria[] = p.examen.materias.map((m) => ({
    materia: m,
    nivel: p.diagnostico?.[m]?.nivel ?? 0.5,
    horas: horasMateria(m, p),
    prioridad: 0,
  }));

  // prioridad: menor nivel primero (1 = más urgente)
  [...materias]
    .sort((a, b) => a.nivel - b.nivel)
    .forEach((m, i) => {
      m.prioridad = i + 1;
    });

  const horasTotales = Math.round(
    materias.reduce((s, m) => s + m.horas, 0) * 2
  ) / 2;

  const dias = diasHastaExamen(p.examen.fecha);
  const semanas = dias !== null ? Math.max(0, dias / 7) : null;
  const horasSem = p.disponibilidad.horasSemana;
  const horasDisponibles =
    semanas !== null ? Math.round(semanas * horasSem * 2) / 2 : null;

  let veredicto: Veredicto = "justo";
  let horasSemanaSugeridas: number | undefined;

  if (horasDisponibles === null) {
    veredicto = "justo";
  } else if (horasDisponibles >= horasTotales * 1.2) {
    veredicto = "holgura";
  } else if (horasDisponibles >= horasTotales) {
    veredicto = "justo";
  } else {
    veredicto = "apretado";
    // horas/semana que harían falta para cubrir el total a tiempo
    if (semanas && semanas > 0) {
      horasSemanaSugeridas = Math.ceil(horasTotales / semanas);
    }
  }

  return {
    materias,
    horasTotales,
    diasRestantes: dias,
    semanasRestantes: semanas !== null ? Math.round(semanas * 10) / 10 : null,
    horasDisponibles,
    veredicto,
    horasSemanaSugeridas,
  };
}
