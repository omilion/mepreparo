// Conteo aproximado de Objetivos de Aprendizaje (OA) por materia y curso.
// Se usa en el cálculo "mixto" de horas del plan de estudio.
//
// IMPORTANTE: son valores BASE razonables del currículum chileno para que el
// motor funcione ya. Gema puede reemplazarlos por el conteo EXACTO extraído del
// RAG (ver docs/PLAN-conteo-oa.md) sin que el motor cambie.

import type { Curso, Materia } from "@/lib/profile";

// nº de OA por materia y curso. Si falta un dato, se usa DEFAULT_OA.
const TABLA: Partial<Record<Materia, Partial<Record<Curso, number>>>> = {
  matematica: {
    "1basico": 22, "2basico": 24, "3basico": 24, "4basico": 26,
    "5basico": 28, "6basico": 28, "7basico": 22, "8basico": 22,
  },
  lenguaje: {
    "1basico": 26, "2basico": 28, "3basico": 30, "4basico": 30,
    "5basico": 30, "6basico": 30, "7basico": 24, "8basico": 24,
  },
  ciencias: {
    "1basico": 14, "2basico": 14, "3basico": 16, "4basico": 16,
    "5basico": 18, "6basico": 18, "7basico": 20, "8basico": 20,
  },
  historia: {
    "1basico": 16, "2basico": 16, "3basico": 18, "4basico": 18,
    "5basico": 20, "6basico": 20, "7basico": 20, "8basico": 20,
  },
  ingles: {
    "5basico": 16, "6basico": 16, "7basico": 16, "8basico": 16,
  },
};

const DEFAULT_OA = 20;

export function oaDe(materia: Materia, curso: Curso): number {
  return TABLA[materia]?.[curso] ?? DEFAULT_OA;
}
