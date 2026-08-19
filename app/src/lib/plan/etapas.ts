// El "camino" de etapas por materia: la cara visible de la memoria por tema.
// La ruta sale del banco de preguntas (temas únicos ordenados por dificultad,
// generado en rutaEtapas.json); el ESTADO de cada etapa sale de TemaDominio
// (la memoria de Rai). Reprobar no castiga: la etapa queda "en refuerzo".

import RUTAS from "./rutaEtapas.json";
import type { Curso, Materia } from "@/lib/profile";
import {
  acumularEvidencia,
  evaluarPreparacion,
  type AcuerdoTutoria,
  type PreparacionPrueba,
  type SimulacroCierre,
} from "@/lib/tutor/acuerdo";

export type EstadoEtapa = "superada" | "actual" | "refuerzo" | "pendiente";

export interface Etapa {
  numero: number; // 1..n
  tema: string; // clave interna (la del banco / TemaDominio)
  titulo: string; // para mostrar ("resolucion_problemas" → "Resolución de problemas")
  estado: EstadoEtapa;
  // Si corresponde ofrecer la prueba formal de ESTA etapa — misma regla
  // determinista que usa Rai para el marcador <<PRUEBA>>. Antes el botón
  // "Rendir la prueba" del mapa no chequeaba nada; ahora los dos caminos
  // (Rai y el mapa) están de acuerdo siempre.
  preparacion: PreparacionPrueba;
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
    return {
      numero: i + 1,
      tema,
      titulo: tituloDeTema(tema),
      estado,
      preparacion: evaluarPreparacion(acuerdo, materia, tema),
    };
  });
}

// Progreso simple para mostrar (etapas superadas / total).
export function progresoDeMateria(etapas: Etapa[]): { superadas: number; total: number } {
  return {
    superadas: etapas.filter((e) => e.estado === "superada").length,
    total: etapas.length,
  };
}

// El CIERRE de una materia, más allá de "todas las etapas superadas" (ver
// registrarSimulacroCierre en acuerdo.ts). Antes, completar el camino era el
// final: no había ninguna verificación de que lo aprendido siguiera fresco.
export type FaseMateria =
  | "aprendiendo" // aún queda camino por recorrer
  | "simulacro_1_pendiente" // camino completo; falta el simulacro de cierre
  | "repaso" // el simulacro 1 reveló temas débiles, practicando esos antes del 2°
  | "simulacro_2_pendiente" // repaso resuelto, listo para el segundo simulacro
  | "materia_lista"; // aprobó el simulacro 1 o 2, o llegó al tope de 2 ciclos igual

// Práctica NUEVA (posterior al simulacro 1) exigida por tema débil antes de
// ofrecer el segundo simulacro. Más laxa que evaluarPreparacion (que exige 4
// ejercicios/75%): acá puede haber varios temas débiles a la vez, y el
// simulacro cronometrado ya es en sí mismo la prueba dura — esto solo evita
// arrancar el segundo simulacro sin haber tocado el tema en absoluto.
const MINIMO_REPASO_POR_TEMA = 2;
const UMBRAL_REPASO_POR_TEMA = 0.7;

// Temas del simulacro 1 que TODAVÍA no tienen práctica nueva suficiente.
// Vacío = el repaso está listo para el segundo simulacro.
function temasDebilesPendientes(
  acuerdo: AcuerdoTutoria | null | undefined,
  s1: SimulacroCierre
): string[] {
  return s1.temasDebiles.filter((tema) => {
    const dominio = (acuerdo?.temas ?? []).find((t) => t.tema === tema && t.materia === s1.materia);
    const acumulado = acumularEvidencia(dominio?.evidencias ?? [], "ejercicios", s1.fecha);
    const ratio = acumulado.total > 0 ? acumulado.correctos / acumulado.total : 0;
    return !(acumulado.total >= MINIMO_REPASO_POR_TEMA && ratio >= UMBRAL_REPASO_POR_TEMA);
  });
}

export function faseDeMateria(
  materia: Materia,
  curso: Curso,
  acuerdo?: AcuerdoTutoria | null
): FaseMateria {
  const etapas = etapasDeMateria(materia, curso, acuerdo);
  if (etapas.length === 0 || !etapas.every((e) => e.estado === "superada")) return "aprendiendo";

  const cierres = (acuerdo?.simulacrosCierre ?? []).filter((s) => s.materia === materia);
  const s1 = cierres.find((s) => s.numero === 1);
  if (!s1) return "simulacro_1_pendiente";
  if (s1.aprobado) return "materia_lista";

  // tope de 2 ciclos: si ya rindió el segundo, lista de todas formas
  // (aprobado o no — ver la nota en AcuerdoTutoria.simulacrosCierre).
  if (cierres.some((s) => s.numero === 2)) return "materia_lista";

  return temasDebilesPendientes(acuerdo, s1).length === 0 ? "simulacro_2_pendiente" : "repaso";
}

// Qué temas concretos tocar HOY en el repaso dirigido — el insumo directo
// para queHacerHoy() y para el contexto que Rai recibe en la charla.
export function temasEnRepaso(
  materia: Materia,
  curso: Curso,
  acuerdo?: AcuerdoTutoria | null
): string[] {
  if (faseDeMateria(materia, curso, acuerdo) !== "repaso") return [];
  const s1 = (acuerdo?.simulacrosCierre ?? []).find((s) => s.materia === materia && s.numero === 1);
  return s1 ? temasDebilesPendientes(acuerdo, s1) : [];
}
