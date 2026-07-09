// Motor de diagnóstico adaptativo para UNA materia. Lógica pura (sin React).
//
// Idea: empezar en dificultad media (3). Si acierta, subir; si falla, bajar.
// Parar cuando el nivel se estabiliza o se agota el mínimo/máximo de preguntas.
// Al final estima un nivel 0..1 y lista las brechas (temas fallados).

import type { Curso, Materia } from "@/lib/profile";
import type {
  BancoPreguntas,
  Dificultad,
  Pregunta,
  ResultadoMateria,
} from "./tipos";

const DIFICULTAD_INICIAL: Dificultad = 3;
const MIN_PREGUNTAS = 5;
const MAX_PREGUNTAS = 8;

function clampDificultad(d: number): Dificultad {
  return Math.max(1, Math.min(5, d)) as Dificultad;
}

// Estado interno del diagnóstico de una materia.
export interface EstadoDiag {
  materia: Materia;
  curso: Curso;
  dificultad: Dificultad;
  hechas: Pregunta[]; // preguntas ya mostradas
  aciertos: boolean[]; // resultado por pregunta (alineado con `hechas`)
  usadasIds: Set<string>;
  pool: Pregunta[]; // preguntas disponibles de esta materia (cualquier curso cercano)
}

// Prepara el diagnóstico de una materia a partir del banco.
export function iniciarDiag(
  banco: BancoPreguntas,
  materia: Materia,
  curso: Curso
): EstadoDiag {
  // Preferimos preguntas del curso exacto; si el banco no las tiene,
  // caemos a cualquier pregunta de la materia (útil con el banco semilla).
  const delCurso = banco.filter((p) => p.materia === materia && p.curso === curso);
  const pool = delCurso.length > 0
    ? delCurso
    : banco.filter((p) => p.materia === materia);

  return {
    materia,
    curso,
    dificultad: DIFICULTAD_INICIAL,
    hechas: [],
    aciertos: [],
    usadasIds: new Set(),
    pool,
  };
}

// Elige la siguiente pregunta: la no usada más cercana a la dificultad objetivo.
export function siguientePregunta(e: EstadoDiag): Pregunta | null {
  const candidatas = e.pool.filter((p) => !e.usadasIds.has(p.id));
  if (candidatas.length === 0) return null;

  // Distancia a la dificultad objetivo; entre las igual de cercanas, elige al azar
  // para no mostrar siempre la misma pregunta ante el mismo estado.
  const distancia = (p: Pregunta) => Math.abs(p.dificultad - e.dificultad);
  const minDist = Math.min(...candidatas.map(distancia));
  const empatadas = candidatas.filter((p) => distancia(p) === minDist);
  const elegida = empatadas[Math.floor(Math.random() * empatadas.length)];

  // Barajar el orden de las opciones (evita el sesgo de posición: que la
  // correcta caiga siempre en la misma letra). NOTA: no corrige un banco donde
  // la correcta sea más larga; eso se arregla regenerando el banco.
  return barajarOpciones(elegida);
}

// Devuelve una copia de la pregunta con las opciones mezcladas y `correcta`
// recalculada al nuevo índice. No muta la original.
export function barajarOpciones(p: Pregunta): Pregunta {
  const indices = p.opciones.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    ...p,
    opciones: indices.map((i) => p.opciones[i]),
    correcta: indices.indexOf(p.correcta),
  };
}

// Registra la respuesta y ajusta la dificultad. Devuelve el estado nuevo.
export function responder(
  e: EstadoDiag,
  pregunta: Pregunta,
  opcionElegida: number
): EstadoDiag {
  const acierto = opcionElegida === pregunta.correcta;
  const usadasIds = new Set(e.usadasIds);
  usadasIds.add(pregunta.id);

  return {
    ...e,
    dificultad: clampDificultad(e.dificultad + (acierto ? 1 : -1)),
    hechas: [...e.hechas, pregunta],
    aciertos: [...e.aciertos, acierto],
    usadasIds,
  };
}

// ¿Terminó el diagnóstico de esta materia?
export function terminado(e: EstadoDiag): boolean {
  const n = e.hechas.length;
  if (n >= MAX_PREGUNTAS) return true;
  if (siguientePregunta(e) === null) return true; // sin más preguntas
  if (n < MIN_PREGUNTAS) return false;

  // Estabilización: si las últimas 3 respuestas alternan (acierto/fallo),
  // el nivel ya está acotado; podemos parar antes del máximo.
  const ult = e.aciertos.slice(-3);
  if (ult.length === 3 && ult[0] !== ult[1] && ult[1] !== ult[2]) return true;

  return false;
}

// Calcula el resultado final de la materia (nivel 0..1 + brechas).
export function resultado(e: EstadoDiag): ResultadoMateria {
  const total = e.hechas.length;
  const aciertos = e.aciertos.filter(Boolean).length;

  // Nivel: combina la proporción de aciertos con la dificultad alcanzada,
  // para que "acertar preguntas difíciles" valga más que "acertar fáciles".
  const propAciertos = total > 0 ? aciertos / total : 0;
  const difMedia =
    total > 0
      ? e.hechas.reduce((s, p) => s + p.dificultad, 0) / total
      : DIFICULTAD_INICIAL;
  const factorDif = difMedia / 5; // 0.2 .. 1
  const nivel = Math.round((propAciertos * 0.7 + factorDif * 0.3) * 100) / 100;

  // Brechas: temas donde falló, ordenados por frecuencia de fallo.
  const fallosPorTema = new Map<string, number>();
  e.hechas.forEach((p, i) => {
    if (!e.aciertos[i]) {
      fallosPorTema.set(p.tema, (fallosPorTema.get(p.tema) ?? 0) + 1);
    }
  });
  const brechas = [...fallosPorTema.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tema]) => tema);

  return {
    materia: e.materia,
    nivel,
    brechas,
    preguntasHechas: total,
    aciertos,
  };
}
