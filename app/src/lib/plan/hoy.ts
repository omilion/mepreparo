// "Qué hago hoy": la ÚNICA acción obvia que se le ofrece al niño al entrar,
// en vez de dejarlo decidir en el mapa. Una tarjeta, una frase, un botón.

import type { Curso, Materia, PerfilNino } from "@/lib/profile";
import { materiasDeHoy, type AcuerdoTutoria, type Dia } from "@/lib/tutor/acuerdo";
import { etapasDeMateria, faseDeMateria, temasEnRepaso, type Etapa } from "./etapas";

export interface PlanDeHoy {
  materia: Materia;
  minutos: number;
  // Presente en una sesión normal de camino (incluida una de repaso — ver
  // `enRepaso`). Ausente cuando lo que toca es rendir un simulacro de
  // cierre: ese no es "una etapa", es la evaluación mixta de la materia
  // entera, así que no tiene sentido forzarlo en esta forma.
  etapa?: Etapa;
  // Camino completo, simulacro 1 aprobado con temas débiles, y ya con
  // práctica nueva suficiente en esos temas (o directo, tras completar el
  // camino): toca rendir el simulacro 1 o el 2 de cierre.
  numeroSimulacro?: 1 | 2;
  // La etapa de arriba es un tema débil del simulacro 1, no un tema nuevo:
  // la sesión debería ser más corta y enfocada, no una clase normal.
  enRepaso?: boolean;
  // Si la materia agendada para hoy no tenía nada pendiente AHORA (ya
  // completó su camino, está esperando el simulacro, o ya está lista del
  // todo) se ofrece la siguiente materia del examen con algo por hacer —
  // esto avisa cuál fue la que se saltó, para celebrarla en vez de
  // solo cambiar de tema sin explicación.
  materiaRecienCompletada?: Materia;
}

// Sin esto, un niño que termina TODAS las materias del examen se topaba con
// "aún estamos preparando tu camino" — el mensaje exactamente opuesto a lo
// que pasó. queHacerHoy() ya no puede distinguir este caso de "todavía no
// hay datos" porque ambos devuelven null; por eso vive aparte. "Completo" es
// materia_lista de verdad (aprobó un simulacro de cierre, o llegó al tope de
// 2 ciclos) — no basta con tener todas las etapas superadas.
export function todoElCaminoCompleto(perfil: PerfilNino, curso: Curso): boolean {
  if (!perfil.tutoria) return false;
  return perfil.examen.materias.every(
    (m) => faseDeMateria(m, curso, perfil.tutoria) === "materia_lista"
  );
}

const MINUTOS_POR_DEFECTO = 20;
// El repaso dirigido es más corto que una clase normal a propósito: apunta a
// UN tema puntual, no a enseñar algo nuevo de cero.
const MINUTOS_REPASO = 12;

// Minutos sugeridos para HOY: reparte las horas/semana acordadas entre los
// días que de verdad tienen materias agendadas. Sin horario aún, usa un
// default razonable (mejor una cifra honesta que una que finja precisión).
function minutosSugeridos(perfil: PerfilNino, acuerdo: AcuerdoTutoria): number {
  const dias = Object.keys(acuerdo.horario) as Dia[];
  const diasConEstudio = dias.filter((d) => (acuerdo.horario[d]?.length ?? 0) > 0).length;
  if (diasConEstudio === 0) return MINUTOS_POR_DEFECTO;
  const minutos = Math.round((perfil.disponibilidad.horasSemana * 60) / diasConEstudio);
  return Math.min(60, Math.max(10, minutos));
}

// Elige la materia de hoy: la agendada en el horario; si no hay (o es fin de
// semana sin agenda), cae a la primera materia del examen para no dejar al
// niño sin nada que hacer.
function materiaDeHoy(perfil: PerfilNino, acuerdo: AcuerdoTutoria): Materia | null {
  const hoy = materiasDeHoy(acuerdo);
  if (hoy.length > 0) return hoy[0];
  return perfil.examen.materias[0] ?? null;
}

// Qué ofrecer para UNA materia puntual, según su fase de cierre. null =
// nada pendiente ahora para esta materia (aprendiendo sin etapa armada
// todavía, o materia_lista).
function planParaMateria(
  materia: Materia,
  curso: Curso,
  acuerdo: AcuerdoTutoria,
  minutos: number
): Omit<PlanDeHoy, "materiaRecienCompletada"> | null {
  const fase = faseDeMateria(materia, curso, acuerdo);

  if (fase === "aprendiendo") {
    const etapa = etapasDeMateria(materia, curso, acuerdo).find((e) => e.estado === "actual");
    return etapa ? { materia, etapa, minutos } : null;
  }
  if (fase === "simulacro_1_pendiente") return { materia, minutos, numeroSimulacro: 1 };
  if (fase === "simulacro_2_pendiente") return { materia, minutos, numeroSimulacro: 2 };
  if (fase === "repaso") {
    const temaDebil = temasEnRepaso(materia, curso, acuerdo)[0];
    const etapa = etapasDeMateria(materia, curso, acuerdo).find((e) => e.tema === temaDebil);
    return etapa ? { materia, etapa, minutos: MINUTOS_REPASO, enRepaso: true } : null;
  }
  return null; // materia_lista: nada que ofrecer hoy para esta materia
}

export function queHacerHoy(perfil: PerfilNino, curso: Curso): PlanDeHoy | null {
  const acuerdo = perfil.tutoria;
  if (!acuerdo) return null;

  const materiaHoy = materiaDeHoy(perfil, acuerdo);
  if (!materiaHoy) return null;

  const minutos = minutosSugeridos(perfil, acuerdo);
  const plan = planParaMateria(materiaHoy, curso, acuerdo, minutos);
  if (plan) return plan;

  // La materia de hoy no tiene nada pendiente ahora (recién completó su
  // camino, está en pausa esperando el simulacro más adelante, o ya quedó
  // lista del todo): se ofrece la siguiente materia del examen con algo
  // pendiente, avisando cuál fue la que se saltó.
  for (const otra of perfil.examen.materias) {
    if (otra === materiaHoy) continue;
    const planOtra = planParaMateria(otra, curso, acuerdo, minutos);
    if (planOtra) return { ...planOtra, materiaRecienCompletada: materiaHoy };
  }

  return null; // todo listo, o todo esperando su simulacro — ver todoElCaminoCompleto()
}

// ¿Ya tuvo una sesión de estudio hoy? (mismo día calendario, hora local).
export function yaEstudioHoy(perfil: PerfilNino): boolean {
  const sesiones = perfil.tutoria?.sesiones ?? [];
  if (sesiones.length === 0) return false;
  const hoy = new Date().toDateString();
  return sesiones.some((s) => new Date(s.fecha).toDateString() === hoy);
}
