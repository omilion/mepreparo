// Contrato de datos del diagnóstico adaptativo.
// ESTE es el formato que el motor espera y que el banco de preguntas
// (semilla o generado por Gema desde el RAG) debe cumplir exactamente.

import type { Curso, Materia } from "@/lib/profile";

// Dificultad en 5 escalones. El motor empieza en 3 y se mueve según acierto.
export type Dificultad = 1 | 2 | 3 | 4 | 5;

export interface Pregunta {
  id: string; // estable y único, p.ej. "mat_5b_frac_003"
  materia: Materia;
  curso: Curso;
  dificultad: Dificultad;
  // "tema" agrupa por objetivo de aprendizaje / habilidad. Se usa para las brechas.
  tema: string; // p.ej. "fracciones", "comprension_lectora"
  enunciado: string;
  opciones: string[]; // 3 a 4 opciones
  correcta: number; // índice (0-based) de la opción correcta en `opciones`
  // Opcional: referencia al OA oficial, útil para trazabilidad (viene del RAG).
  oa?: string;
}

// Banco completo: un arreglo plano de preguntas. El motor filtra por
// materia + curso y navega por dificultad.
export type BancoPreguntas = Pregunta[];

// --- Resultado del diagnóstico de UNA materia ---
export interface ResultadoMateria {
  materia: Materia;
  nivel: number; // 0..1 (estimación final)
  brechas: string[]; // temas donde falló, más frecuentes primero
  preguntasHechas: number;
  aciertos: number;
}
