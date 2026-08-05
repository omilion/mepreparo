// Qué materia está enseñando Rai AHORA.
//
// Vivía como un `const` suelto dentro de Tutor.tsx que solo miraba el horario
// del día, ignorando la etapa que el niño había elegido en el mapa. Cuando el
// niño cambiaba de materia en el mapa, la clase enseñaba un tema de Matemática
// "dentro" de Lenguaje: el RAG filtraba por la materia equivocada, la memoria
// inyectada era de otra materia, y al cerrar la sesión la evidencia quedaba en
// una combinación (tema, materia) que el mapa nunca lee — la etapa no avanzaba
// nunca. Se extrajo acá para poder probarlo.

import type { Materia } from "@/lib/profile";

// Prioridad: lo que el niño ELIGIÓ en el mapa gana sobre lo agendado. Si no
// eligió nada (charla libre o primera charla), manda el horario del día; y si
// hoy no toca nada, la primera materia de su examen.
export function materiaDeClase(
  materiaFoco: Materia | null | undefined,
  materiasHoy: Materia[],
  materiasExamen: Materia[]
): Materia {
  return materiaFoco ?? materiasHoy[0] ?? materiasExamen[0];
}

// ¿El niño se salió del horario? Sirve para que Rai lo mencione con
// naturalidad en vez de afirmar "hoy toca X" mientras enseña Y.
export function seSalioDelHorario(
  materiaClase: Materia,
  materiasHoy: Materia[]
): boolean {
  return materiasHoy.length > 0 && !materiasHoy.includes(materiaClase);
}
