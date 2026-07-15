import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { contenidoValidado } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { recuperar } from "@/lib/tutor/rag";
import { generar, tieneClave } from "@/lib/tutor/gemini";
import type { Materia, Curso } from "@/lib/profile";
import { chequearLimite } from "@/lib/rateLimit";

// Respaldo por materia si Gemini no está o falla. La rueda nunca queda vacía.
const SEMILLA: Record<string, { enunciado: string; respuesta: string }[]> = {
  matematica: [
    { enunciado: "¿Cómo se llama el resultado de una suma?", respuesta: "TOTAL" },
    { enunciado: "Figura de tres lados:", respuesta: "TRIANGULO" },
  ],
  lenguaje: [
    { enunciado: "Palabra que nombra una acción:", respuesta: "VERBO" },
    { enunciado: "Cada sonido con el que dividimos una palabra:", respuesta: "SILABA" },
  ],
  ciencias: [
    { enunciado: "Astro que nos da luz de día:", respuesta: "SOL" },
    { enunciado: "Gas que respiramos para vivir:", respuesta: "OXIGENO" },
  ],
  historia: [
    { enunciado: "Cordillera larga del oeste de Chile:", respuesta: "ANDES" },
    { enunciado: "Océano que baña las costas de Chile:", respuesta: "PACIFICO" },
  ],
};

// Normaliza a MAYÚSCULAS sin tildes/ñ→N, solo letras (para la rueda y el grid).
function limpiarRespuesta(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ñ/gi, "N")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
}

// Baraja un array (Fisher-Yates) sin mutar el original.
function revolver<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pide a Gemini una pregunta + respuesta de UNA palabra corta del tema.
async function preguntaDeGemini(
  tema: string,
  materia: string,
  curso: string,
  contextoRAG: string
): Promise<{ enunciado: string; respuesta: string } | null> {
  if (!tieneClave()) return null;
  try {
    const sistema = `Eres un generador de acertijos escolares breves para educación básica en Chile.
Crea UNA pregunta corta y clara cuya respuesta sea UNA SOLA palabra (sin espacios ni guiones),
de 3 a 8 letras, del tema indicado y apropiada para niños. Sin nombres propios raros.
Responde SOLO un JSON: { "enunciado": "la pregunta", "respuesta": "PALABRA" }`;
    const usuario = `Tema: ${tema}
Materia: ${materia}
Curso: ${curso}
Contexto curricular:
${contextoRAG || "sin contexto"}`;
    const res = await generar({ sistema, usuario, maxTokens: 200, json: true });
    const obj = JSON.parse(res) as { enunciado?: string; respuesta?: string };
    if (!obj.enunciado || !obj.respuesta) return null;
    const respuesta = limpiarRespuesta(obj.respuesta);
    if (respuesta.length < 3 || respuesta.length > 8) return null;
    return { enunciado: obj.enunciado.trim(), respuesta };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "rueda", max: 30, ventanaMs: 60_000 });
  if (limite) return limite;

  const { searchParams } = new URL(req.url);
  const materia = searchParams.get("materia") || "matematica";
  const curso = searchParams.get("curso") || "5basico";
  const dificultad = parseInt(searchParams.get("dificultad") || "1", 10);
  const tema = searchParams.get("tema") || "";
  const oa = tema || "General";

  try {
    // 1. ¿Ya hay una rueda validada de este tema? (caché costo-cero)
    const existentes = await db
      .select()
      .from(contenidoValidado)
      .where(
        and(
          eq(contenidoValidado.materia, materia),
          eq(contenidoValidado.curso, curso),
          eq(contenidoValidado.tipo, "rueda"),
          eq(contenidoValidado.oa, oa),
          eq(contenidoValidado.estado, "publicada")
        )
      );
    if (existentes.length > 0) {
      const elegida = existentes[Math.floor(Math.random() * existentes.length)];
      // revolvemos las letras en cada entrega para que no salga siempre igual
      const d = elegida.datos as { respuesta: string; enunciado: string };
      const letras = revolver(d.respuesta.split(""));
      return NextResponse.json({
        rueda: { enunciado: d.enunciado, respuesta: d.respuesta, letras },
        fuente: "biblioteca_compartida",
      });
    }

    // 2. Conseguir pregunta+respuesta: Gemini (con RAG) o semilla.
    let contextoRAG = "";
    if (tieneClave() && tema) {
      const frags = await recuperar(
        `Conceptos y vocabulario de ${tema} en ${materia} para ${curso}`,
        { materia: materia as Materia, curso: curso as Curso, k: 2 }
      );
      contextoRAG = frags.map((f, i) => `[${i + 1}] ${f.texto}`).join("\n\n");
    }
    let pregunta = await preguntaDeGemini(tema, materia, curso, contextoRAG);
    if (!pregunta) {
      const lista = SEMILLA[materia] || SEMILLA.matematica;
      pregunta = lista[Math.floor(Math.random() * lista.length)];
    }

    const respuesta = limpiarRespuesta(pregunta.respuesta);
    if (respuesta.length < 3) {
      return NextResponse.json({ error: "Respuesta no válida" }, { status: 422 });
    }
    const datos = { tipoPlantilla: "rueda", tema, enunciado: pregunta.enunciado, respuesta };

    // 3. Guardar en la biblioteca para reutilizar gratis (best-effort).
    try {
      await db.insert(contenidoValidado).values({
        id: `rueda-${crypto.randomUUID()}`,
        materia,
        curso,
        oa,
        dificultad,
        tipo: "rueda",
        enunciado: pregunta.enunciado,
        datos,
        solucionPasoAPaso: [],
        respuestaFinal: respuesta,
        estado: "publicada",
      });
    } catch (err) {
      console.error("No se pudo cachear la rueda:", err);
    }

    return NextResponse.json({
      rueda: { enunciado: pregunta.enunciado, respuesta, letras: revolver(respuesta.split("")) },
      fuente: "generada",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("Rueda falló:", msg);
    return NextResponse.json({ error: "No se pudo generar la rueda" }, { status: 500 });
  }
}
