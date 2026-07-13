// El "camino" de etapas por materia: la cara visible de la memoria por tema.
// La ruta sale del banco de preguntas (temas únicos ordenados por dificultad,
// generado en rutaEtapas.json); el ESTADO de cada etapa sale de TemaDominio
// (la memoria de Rai). Reprobar no castiga: la etapa queda "en refuerzo".

import RUTAS from "./rutaEtapas.json";
import type { Curso, Materia } from "@/lib/profile";
import type { AcuerdoTutoria } from "@/lib/tutor/acuerdo";

export type EstadoEtapa = "superada" | "actual" | "refuerzo" | "pendiente";

export interface Etapa {
  numero: number; // 1..n
  tema: string; // clave interna (la del banco / TemaDominio)
  titulo: string; // para mostrar ("resolucion_problemas" → "Resolución de problemas")
  estado: EstadoEtapa;
}

// Títulos humanos para los temas del banco (fallback: capitalizar).
const TITULOS: Record<string, string> = {
  numeros: "Números",
  multiplicacion: "Multiplicación",
  division: "División",
  decimales: "Decimales",
  fracciones: "Fracciones",
  algebra: "Álgebra",
  geometria: "Geometría",
  resolucion_problemas: "Resolución de problemas",
  comprension_lectora: "Comprensión lectora",
  gramatica: "Gramática",
  vocabulario: "Vocabulario",
  ortografia: "Ortografía",
  escritura: "Escritura",
};

export function tituloDeTema(tema: string): string {
  if (TITULOS[tema]) return TITULOS[tema];
  const limpio = tema.replace(/_/g, " ");
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// La secuencia de temas de una materia+curso. Prioridad: el plan generado por
// la IA en el onboarding (si existe) → si no, el orden del banco por dificultad.
export function rutaDeTemas(
  materia: Materia,
  curso: Curso,
  acuerdo?: AcuerdoTutoria | null
): string[] {
  const plan = acuerdo?.planMaterias?.find((p) => p.materia === materia);
  if (plan && plan.temas.length > 0) return plan.temas;
  const rutas = RUTAS as Record<string, string[]>;
  return rutas[`${materia}|${curso}`] ?? [];
}

// Construye las etapas con su estado a partir de la memoria del niño.
// Reglas: superado→superada; le_cuesta→refuerzo; la etapa "actual" es la
// PRIMERA no superada (una en refuerzo puede ser la actual: es accionable).
export function etapasDeMateria(
  materia: Materia,
  curso: Curso,
  acuerdo?: AcuerdoTutoria | null
): Etapa[] {
  const ruta = rutaDeTemas(materia, curso, acuerdo);
  const temas = acuerdo?.temas ?? [];

  let actualAsignada = false;
  return ruta.map((tema, i) => {
    const dominio = temas.find((t) => t.tema === tema && t.materia === materia);
    let estado: EstadoEtapa;
    if (dominio?.estado === "superado") {
      estado = "superada";
    } else if (!actualAsignada) {
      // la primera no superada es la actual (aunque esté en refuerzo)
      estado = "actual";
      actualAsignada = true;
    } else if (dominio?.estado === "le_cuesta") {
      estado = "refuerzo";
    } else {
      estado = "pendiente";
    }
    return { numero: i + 1, tema, titulo: tituloDeTema(tema), estado };
  });
}

// Progreso simple para mostrar (etapas superadas / total).
export function progresoDeMateria(etapas: Etapa[]): { superadas: number; total: number } {
  return {
    superadas: etapas.filter((e) => e.estado === "superada").length,
    total: etapas.length,
  };
}
