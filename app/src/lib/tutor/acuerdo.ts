// El "acuerdo de tutoría": la memoria persistente entre Rai y el niño.
// Se arma en la PRIMERA charla (Rai propone un horario semanal y conoce al niño)
// y se recuerda en cada sesión siguiente. Vive dentro del PerfilNino, así se
// guarda con el resto (localStorage hoy; Supabase mañana).

import type { Materia } from "@/lib/profile";

// Días de la semana en el orden en que los mostramos/planificamos.
export type Dia = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

export const DIAS: { id: Dia; label: string; corto: string }[] = [
  { id: "lun", label: "Lunes", corto: "Lun" },
  { id: "mar", label: "Martes", corto: "Mar" },
  { id: "mie", label: "Miércoles", corto: "Mié" },
  { id: "jue", label: "Jueves", corto: "Jue" },
  { id: "vie", label: "Viernes", corto: "Vie" },
  { id: "sab", label: "Sábado", corto: "Sáb" },
  { id: "dom", label: "Domingo", corto: "Dom" },
];

// Resumen de UNA sesión, para que Rai recuerde de qué hablaron la vez pasada.
export interface SesionTutoria {
  fecha: string; // ISO date-time del inicio de la sesión
  dia: Dia;
  materia?: Materia; // ramo trabajado ese día, si aplica
  resumen: string; // 1-2 frases: qué hicieron, dónde quedaron, qué reforzar
}

export interface AcuerdoTutoria {
  creadoEn: string; // ISO — cuándo se hizo la primera charla
  // Qué ramo(s) toca cada día. Un día puede no tener ramo (descanso).
  horario: Partial<Record<Dia, Materia[]>>;
  // Notas que Rai aprendió del niño (qué le cuesta, le gusta, cómo se anima).
  notasNino: string;
  // Historial de sesiones, la más reciente al final.
  sesiones: SesionTutoria[];
}

// Día de hoy como Dia (lun..dom), a partir de getDay() (0=domingo).
export function diaDeHoy(d = new Date()): Dia {
  const map: Dia[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
  return map[d.getDay()];
}

// ¿Qué materia(s) toca hoy según el acuerdo?
export function materiasDeHoy(acuerdo: AcuerdoTutoria, hoy = diaDeHoy()): Materia[] {
  return acuerdo.horario[hoy] ?? [];
}

// La última sesión registrada (para "recordar de qué hablamos la vez pasada").
export function ultimaSesion(acuerdo: AcuerdoTutoria): SesionTutoria | null {
  return acuerdo.sesiones.at(-1) ?? null;
}
