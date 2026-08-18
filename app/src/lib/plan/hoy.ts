// "Qué hago hoy": la ÚNICA acción obvia que se le ofrece al niño al entrar,
// en vez de dejarlo decidir en el mapa. Una tarjeta, una frase, un botón.

import type { Curso, Materia, PerfilNino } from "@/lib/profile";
import { materiasDeHoy, type AcuerdoTutoria, type Dia } from "@/lib/tutor/acuerdo";
import { etapasDeMateria, type Etapa } from "./etapas";

export interface PlanDeHoy {
  materia: Materia;
  etapa: Etapa;
  minutos: number;
  // Si la materia agendada para hoy ya está 100% completa, se ofrece la
  // siguiente materia del examen que aún tenga camino — esto avisa cuál fue
  // la que se saltó, para poder celebrarla en vez de solo cambiar de tema
  // sin explicación.
  materiaRecienCompletada?: Materia;
}

// Sin esto, un niño que termina TODAS las materias del examen se topaba con
// "aún estamos preparando tu camino" — el mensaje exactamente opuesto a lo
// que pasó. queHacerHoy() ya no puede distinguir este caso de "todavía no
// hay datos" porque ambos devuelven null; por eso vive aparte.
export function todoElCaminoCompleto(perfil: PerfilNino, curso: Curso): boolean {
  if (!perfil.tutoria) return false;
  return perfil.examen.materias.every((m) => {
    const etapas = etapasDeMateria(m, curso, perfil.tutoria);
    return etapas.length > 0 && etapas.every((e) => e.estado === "superada");
  });
}

const MINUTOS_POR_DEFECTO = 20;

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

export function queHacerHoy(perfil: PerfilNino, curso: Curso): PlanDeHoy | null {
  const acuerdo = perfil.tutoria;
  if (!acuerdo) return null;

  const materia = materiaDeHoy(perfil, acuerdo);
  if (!materia) return null;

  const minutos = minutosSugeridos(perfil, acuerdo);
  const etapas = etapasDeMateria(materia, curso, acuerdo);
  const etapa = etapas.find((e) => e.estado === "actual");
  if (etapa) return { materia, etapa, minutos };

  // La materia de hoy no tiene etapa "actual": o no hay camino armado para
  // ella (perfil recién creado — el `!etapa` de siempre), o YA ESTÁ 100%
  // completa. Solo en el segundo caso corresponde ofrecer otra materia; si
  // no hay etapas en absoluto, es el caso "sin camino todavía" de antes.
  const materiaCompleta = etapas.length > 0 && etapas.every((e) => e.estado === "superada");
  if (!materiaCompleta) return null;

  for (const otra of perfil.examen.materias) {
    if (otra === materia) continue;
    const etapasOtra = etapasDeMateria(otra, curso, acuerdo);
    const etapaOtra = etapasOtra.find((e) => e.estado === "actual");
    if (etapaOtra) return { materia: otra, etapa: etapaOtra, minutos, materiaRecienCompletada: materia };
  }

  return null; // todas las materias completas — ver todoElCaminoCompleto()
}

// ¿Ya tuvo una sesión de estudio hoy? (mismo día calendario, hora local).
export function yaEstudioHoy(perfil: PerfilNino): boolean {
  const sesiones = perfil.tutoria?.sesiones ?? [];
  if (sesiones.length === 0) return false;
  const hoy = new Date().toDateString();
  return sesiones.some((s) => new Date(s.fecha).toDateString() === hoy);
}
