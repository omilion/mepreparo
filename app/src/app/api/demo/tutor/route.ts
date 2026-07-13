// Tutor de la DEMO: una mini-sesión guiada con goal propio (distinto al tutor
// real). Rai da la bienvenida, enseña algo breve de la materia elegida y va
// proponiendo ejercicios. No persiste nada (es una prueba); no requiere auth.

import { NextRequest, NextResponse } from "next/server";
import { TUTOR } from "@/lib/tutor/personaje";
import { generar, tieneClave, MODELO_LITE } from "@/lib/tutor/gemini";
import { recuperar } from "@/lib/tutor/rag";
import { MATERIAS, type Materia } from "@/lib/profile";
import { chequearLimite } from "@/lib/rateLimit";

export const runtime = "nodejs";

type Turno = { de: "rai" | "nino"; texto: string };

interface Body {
  // "bienvenida" = Rai saluda e invita a elegir materia
  // "leccion"    = enseña algo breve de la materia elegida
  // "chat"       = responde durante los ejercicios
  fase: "bienvenida" | "leccion" | "chat";
  materia?: Materia;
  nombre?: string;
  ejercicioActual?: number; // 1..5
  pregunta?: string;
  historial?: Turno[];
}

const nombreMateria = (m?: Materia) =>
  MATERIAS.find((x) => x.id === m)?.label ?? "la materia";

export async function POST(req: NextRequest) {
  // demo es público (sin auth) → límite más estricto
  const limite = chequearLimite(req, { clave: "demo", max: 15, ventanaMs: 60_000 });
  if (limite) return limite;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const nombre = body.nombre?.trim() || "amigo";
  const materia = body.materia;

  // sistema según la fase de la mini-sesión
  let sistema = TUTOR.sistema + " Estás en una clase de PRUEBA gratuita, corta y motivadora. ";
  let usuario = "";
  let fuentes: string[] = [];

  if (body.fase === "bienvenida") {
    sistema +=
      "Saluda con mucho cariño y entusiasmo, preséntate en una frase y dile que hoy van a " +
      "aprender algo juntos en una clase corta. Cierra invitándolo a elegir qué le gustaría " +
      "practicar. Máximo 2 frases. No hagas más de una pregunta.";
    usuario = `El niño se llama ${nombre}. Comienza la clase de prueba.`;
  } else if (body.fase === "leccion") {
    // RAG para anclar la mini-lección al currículum
    const frags = await recuperar(`conceptos básicos de ${nombreMateria(materia)} 5 basico`, {
      materia,
      curso: "5basico",
      k: 2,
    });
    const contexto = frags.map((f, i) => `[${i + 1}] ${f.texto}`).join("\n\n");
    fuentes = frags.map((f) => f.fuente);
    sistema +=
      `Vas a enseñar algo BREVE y concreto de ${nombreMateria(materia)} para un niño de ~5° básico. ` +
      "Explica UN concepto simple con un ejemplo cercano y cotidiano, en 2-3 frases cálidas. " +
      "Al final, anímalo a resolver un primer ejercicio juntos. No des el ejercicio todavía.";
    usuario =
      (contexto ? `Apóyate en el currículum oficial:\n${contexto}\n\n` : "") +
      `Enséñale algo de ${nombreMateria(materia)} a ${nombre}.`;
  } else {
    // chat durante los ejercicios
    const frags = materia
      ? await recuperar(body.pregunta || nombreMateria(materia), { materia, curso: "5basico", k: 2 })
      : [];
    const contexto = frags.map((f, i) => `[${i + 1}] ${f.texto}`).join("\n\n");
    fuentes = frags.map((f) => f.fuente);
    sistema +=
      "Estás acompañando al niño mientras resuelve ejercicios. Guíalo a pensar (no des la " +
      "respuesta directa), felicítalo cuando avanza y mantén el ánimo alto. Frases cortas.";
    const hist = (body.historial || [])
      .slice(-6)
      .map((t) => `${t.de === "rai" ? "Rai" : "Niño"}: ${t.texto}`)
      .join("\n");
    usuario =
      (hist ? `Conversación:\n${hist}\n\n` : "") +
      (contexto ? `Currículum:\n${contexto}\n\n` : "") +
      `El niño dice: ${(body.pregunta || "").trim()}`;
  }

  if (tieneClave()) {
    try {
      const texto = await generar({
        sistema,
        usuario,
        maxTokens: 400,
        // la demo usa el modelo barato: es contenido de gancho, no crítico
        model: MODELO_LITE,
      });
      return NextResponse.json({ respuesta: texto, fuentes, modo: "gemini" });
    } catch (e) {
      console.error("Demo tutor Gemini falló:", e);
    }
  }

  // fallback simulado
  const sim =
    body.fase === "bienvenida"
      ? `¡Hola ${nombre}! Soy ${TUTOR.nombre}. Hoy vamos a aprender algo juntos, ¿qué te gustaría practicar?`
      : body.fase === "leccion"
        ? `Genial, ${nombre}. Veamos ${nombreMateria(materia)} con un ejemplo simple… ¿lo intentamos con un ejercicio?`
        : `¡Muy bien, ${nombre}! Vas por buen camino, sigamos.`;
  return NextResponse.json({ respuesta: sim, fuentes, modo: "simulado" });
}
