// Genera el PLAN de etapas por materia al terminar el onboarding ("preparar los
// mundos"). Para cada materia del examen: la IA ordena los temas del banco de
// forma pedagógica (lo base primero, priorizando las brechas del diagnóstico) y
// define un objetivo. Este plan es la columna vertebral que da temporalidad a
// las conversaciones con Rai. Si la IA falla, cae al orden del banco.

import { NextRequest, NextResponse } from "next/server";
import { generar, tieneClave, MODELO_LITE } from "@/lib/tutor/gemini";
import { MATERIAS, type Curso, type Materia } from "@/lib/profile";
import { rutaDeTemas } from "@/lib/plan/etapas";
import type { PlanMateria } from "@/lib/tutor/acuerdo";

export const runtime = "nodejs";

interface Body {
  curso: Curso;
  materias: Materia[];
  nombre?: string;
  // diagnóstico: nivel + brechas por materia (para priorizar)
  diagnostico?: Partial<Record<Materia, { nivel: number; brechas: string[] }>>;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const materias = body.materias || [];
  const planMaterias: PlanMateria[] = [];

  for (const materia of materias) {
    const temasBanco = rutaDeTemas(materia, body.curso);
    if (temasBanco.length === 0) continue; // sin banco para esa combinación

    const diag = body.diagnostico?.[materia];
    const brechas = diag?.brechas ?? [];
    const nombreMateria = MATERIAS.find((m) => m.id === materia)?.label ?? materia;

    let plan: PlanMateria = {
      materia,
      objetivo: `Prepararte en ${nombreMateria} para tu examen.`,
      temas: temasBanco, // fallback: orden del banco
      generadoEn: new Date().toISOString(),
    };

    if (tieneClave()) {
      try {
        const sistema =
          "Eres un planificador pedagógico del currículum chileno de educación básica. " +
          "Ordenas los temas de una materia en una secuencia de aprendizaje coherente: lo " +
          "más básico y prerrequisito primero, construyendo hacia lo complejo. Si hay temas " +
          "donde el niño tiene brechas, van temprano (pero respetando prerrequisitos). " +
          "Respondes SOLO con JSON válido, sin texto extra.";
        const usuario =
          `Materia: ${nombreMateria}. Curso: ${body.curso}. ` +
          `Temas disponibles (usa EXACTAMENTE estas claves, no inventes otras): ${JSON.stringify(temasBanco)}. ` +
          (brechas.length ? `Temas donde el niño tiene dificultad (priorizar): ${JSON.stringify(brechas)}. ` : "") +
          'Responde: {"objetivo":"una frase motivadora de la meta de esta materia para el examen","temas":["clave1","clave2",...]}. ' +
          "El arreglo temas debe contener TODAS las claves disponibles, ordenadas pedagógicamente.";

        const cruda = await generar({
          sistema,
          usuario,
          maxTokens: 400,
          json: true,
          model: MODELO_LITE,
        });
        const parsed = JSON.parse(cruda);

        // saneo: solo claves válidas del banco, sin duplicar, y completamos las
        // que la IA haya omitido (nunca perdemos un tema)
        const validos = new Set(temasBanco);
        const orden: string[] = [];
        for (const t of Array.isArray(parsed.temas) ? parsed.temas : []) {
          const clave = String(t).toLowerCase().trim();
          if (validos.has(clave) && !orden.includes(clave)) orden.push(clave);
        }
        for (const t of temasBanco) if (!orden.includes(t)) orden.push(t);

        plan = {
          materia,
          objetivo:
            typeof parsed.objetivo === "string" && parsed.objetivo.trim()
              ? parsed.objetivo.trim().slice(0, 160)
              : plan.objetivo,
          temas: orden,
          generadoEn: new Date().toISOString(),
        };
      } catch (e) {
        console.error(`Plan de ${materia} falló, uso orden del banco:`, e);
        // plan ya tiene el fallback del banco
      }
    }

    planMaterias.push(plan);
  }

  return NextResponse.json({ planMaterias });
}
