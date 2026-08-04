// Comentario de Rai al cierre de un simulacro: reusa el patrón de
// `raiExplicaError` (Tutor.tsx) pero para un resultado agregado por temas, no
// una pregunta suelta. Vive fuera de /api/tutor porque ese endpoint arma un
// prompt completo de sesión (requiere acuerdo, historial, etc.) que aquí no
// aplica: esto es un comentario breve de cierre, no una clase.

import { NextRequest, NextResponse } from "next/server";
import { chequearLimite } from "@/lib/rateLimit";
import { generar, tieneClave } from "@/lib/tutor/gemini";
import { TUTOR } from "@/lib/tutor/personaje";
import { tituloDeTema } from "@/lib/plan/etapas";
import { MATERIAS, type Materia } from "@/lib/profile";

interface DesgloseTema {
  tema: string;
  correctos: number;
  total: number;
}

interface Body {
  nombre?: string;
  materia?: Materia;
  correctos?: number;
  total?: number;
  desglose?: DesgloseTema[];
}

function comentarioSimulado(nombre: string, materiaLabel: string, correctos: number, total: number, flojos: string[]): string {
  const ratio = total > 0 ? correctos / total : 0;
  const quien = nombre || "amigo";
  const base =
    ratio >= 0.8
      ? `¡${quien}, lo hiciste muy bien en el simulacro de ${materiaLabel}! Respondiste ${correctos} de ${total}.`
      : ratio >= 0.5
        ? `Buen trabajo en el simulacro de ${materiaLabel}, ${quien}. Sacaste ${correctos} de ${total}, ya vas encaminado.`
        : `Gracias por rendir el simulacro de ${materiaLabel}, ${quien}. Sacaste ${correctos} de ${total}: es información valiosa para saber en qué enfocarnos.`;
  const refuerzo = flojos.length > 0 ? ` Lo que más conviene repasar: ${flojos.join(", ")}.` : "";
  return base + refuerzo;
}

export async function POST(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "simulacro-comentario", max: 20, ventanaMs: 60_000 });
  if (limite) return limite;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const nombre = (body.nombre || "").trim().slice(0, 40);
  const materia = body.materia;
  const materiaLabel = MATERIAS.find((m) => m.id === materia)?.label || "la materia";
  const total = Math.max(0, Math.floor(body.total ?? 0));
  const correctos = Math.max(0, Math.min(total, Math.floor(body.correctos ?? 0)));
  const desglose = (Array.isArray(body.desglose) ? body.desglose : []).slice(0, 12);

  // temas donde le fue peor (para "qué reforzar"), ordenados por peor ratio
  const flojos = desglose
    .filter((d) => d.total > 0 && d.correctos / d.total < 0.6)
    .sort((a, b) => a.correctos / a.total - b.correctos / b.total)
    .slice(0, 3)
    .map((d) => tituloDeTema(d.tema));

  if (!tieneClave()) {
    return NextResponse.json({
      respuesta: comentarioSimulado(nombre, materiaLabel, correctos, total, flojos),
      modo: "simulado",
    });
  }

  const desgloseTexto = desglose
    .map((d) => `- ${tituloDeTema(d.tema)}: ${d.correctos} de ${d.total}`)
    .join("\n");

  const sistema =
    TUTOR.sistema +
    "\n\nAhora el niño acaba de terminar un SIMULACRO de examen (varias preguntas de " +
    "distintos temas de una materia, cronometrado, sin tu ayuda). Coméntale el " +
    "resultado con cariño en 2-4 frases: celebra el esfuerzo de rendirlo, menciona " +
    "el puntaje general en palabras simples (no uses porcentajes fríos), y si hay " +
    "temas flojos propónle con calidez qué reforzar la próxima vez. Nunca uses un " +
    "tono de examen o nota escolar. No lances actividades ni marcadores. " +
    "IMPORTANTE: este comentario se muestra como texto plano (sin renderizado de " +
    "iconos), así que NO uses el vocabulario visual ni ningún corchete `[...]` — " +
    "solo palabras.";

  const usuario =
    `Nombre del niño: ${nombre || "el niño"}\n` +
    `Materia del simulacro: ${materiaLabel}\n` +
    `Resultado general: ${correctos} de ${total}\n` +
    (desgloseTexto ? `Desglose por tema:\n${desgloseTexto}` : "");

  try {
    const cruda = await generar({ sistema, usuario, maxTokens: 260 });
    // red de seguridad: si Gemini igual dejó corchetes (le pasa incluso con la
    // instrucción explícita), se limpian para no mostrar "[sonrisa]" literal.
    const respuesta = cruda.replace(/\[([^[\]]+)\]/g, "").replace(/\s{2,}/g, " ").trim();
    return NextResponse.json({ respuesta, modo: "gemini" });
  } catch (e) {
    console.error("Comentario de simulacro falló:", e instanceof Error ? e.message : e);
    return NextResponse.json({
      respuesta: comentarioSimulado(nombre, materiaLabel, correctos, total, flojos),
      modo: "simulado",
    });
  }
}
