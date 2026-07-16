import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { contenidoValidado } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { recuperar } from "@/lib/tutor/rag";
import { generar, tieneClave } from "@/lib/tutor/gemini";
import type { Materia, Curso } from "@/lib/profile";
import { chequearLimite } from "@/lib/rateLimit";

// Respaldo por materia si Gemini falla.
const SEMILLA: Record<string, { enunciado: string; pasosCorrectos: string[] }[]> = {
  matematica: [
    {
      enunciado: "Ordena los pasos para resolver la operación: 10 - 4 / 2",
      pasosCorrectos: ["Dividir 4 / 2", "Restar 10 - 2", "Resultado final 8"],
    },
    {
      enunciado: "Ordena las unidades de medida de menor a mayor longitud:",
      pasosCorrectos: ["Milímetro", "Centímetro", "Metro", "Kilómetro"],
    },
  ],
  lenguaje: [
    {
      enunciado: "Ordena las etapas del proceso de escribir un cuento:",
      pasosCorrectos: ["Planificar la idea", "Escribir el borrador", "Revisar la ortografía", "Publicar y compartir"],
    },
    {
      enunciado: "Ordena alfabéticamente las siguientes palabras:",
      pasosCorrectos: ["Árbol", "Barco", "Casa", "Dado"],
    },
  ],
  ciencias: [
    {
      enunciado: "Ordena las etapas del ciclo de vida de la mariposa:",
      pasosCorrectos: ["Huevo", "Oruga", "Crisálida", "Mariposa"],
    },
    {
      enunciado: "Ordena el ciclo de vida de una planta desde la semilla:",
      pasosCorrectos: ["Semilla", "Brote", "Planta", "Flor"],
    },
  ],
  historia: [
    {
      enunciado: "Ordena cronológicamente las etapas del día de un estudiante:",
      pasosCorrectos: ["Despertar por la mañana", "Clases en la escuela", "Hacer tareas y jugar", "Dormir por la noche"],
    },
    {
      enunciado: "Ordena las etapas de la vida humana desde el nacimiento:",
      pasosCorrectos: ["Bebé", "Niñez", "Adultez", "Vejez"],
    },
  ],
};

function revolver<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Baraja asegurando que el orden no quede igual al correcto
function barajarSecuencia(correctos: string[]): string[] {
  let barajado = revolver(correctos);
  // Si por azar queda idéntico al correcto, lo volvemos a mezclar (siempre que tenga >=2 items)
  if (correctos.length > 1 && correctos.every((val, index) => val === barajado[index])) {
    barajado = revolver(correctos);
  }
  return barajado;
}

async function secuenciaDeGemini(
  tema: string,
  materia: string,
  curso: string,
  contextoRAG: string
): Promise<{ enunciado: string; pasosCorrectos: string[] } | null> {
  if (!tieneClave()) return null;
  try {
    const sistema = `Eres un creador de secuencias lógicas y cronológicas breves para educación básica en Chile.
Genera una consigna u orden y un conjunto de entre 3 y 5 pasos u objetos en su ORDEN CORRECTO (de primero a último, de menor a mayor, o cronológicamente).
Los textos de los pasos deben ser cortos (1 a 4 palabras máximo por paso).
Responde SOLAMENTE con un objeto JSON con este formato:
{ "enunciado": "consigna de ordenación", "pasosCorrectos": ["paso 1", "paso 2", "paso 3"] }`;

    const usuario = `Tema: ${tema}
Materia: ${materia}
Curso: ${curso}
Contexto curricular:
${contextoRAG || "sin contexto"}`;

    const res = await generar({ sistema, usuario, maxTokens: 300, json: true });
    const obj = JSON.parse(res) as { enunciado?: string; pasosCorrectos?: string[] };
    if (!obj.enunciado || !Array.isArray(obj.pasosCorrectos) || obj.pasosCorrectos.length < 3) {
      return null;
    }
    return {
      enunciado: obj.enunciado.trim(),
      pasosCorrectos: obj.pasosCorrectos.map((p) => p.trim()),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "secuencia", max: 30, ventanaMs: 60_000 });
  if (limite) return limite;

  const { searchParams } = new URL(req.url);
  const materia = searchParams.get("materia") || "matematica";
  const curso = searchParams.get("curso") || "5basico";
  const dificultad = parseInt(searchParams.get("dificultad") || "1", 10);
  const tema = searchParams.get("tema") || "";
  const oa = tema || "General";

  try {
    // 1. Verificar biblioteca (caché costo-cero)
    const existentes = await db
      .select()
      .from(contenidoValidado)
      .where(
        and(
          eq(contenidoValidado.materia, materia),
          eq(contenidoValidado.curso, curso),
          eq(contenidoValidado.tipo, "secuencia"),
          eq(contenidoValidado.oa, oa),
          eq(contenidoValidado.estado, "publicada")
        )
      );

    if (existentes.length > 0) {
      const elegida = existentes[Math.floor(Math.random() * existentes.length)];
      const d = elegida.datos as { enunciado: string; pasosCorrectos: string[] };
      return NextResponse.json({
        secuencia: {
          enunciado: d.enunciado,
          pasosCorrectos: d.pasosCorrectos,
          pasosBarajados: barajarSecuencia(d.pasosCorrectos),
        },
        fuente: "biblioteca_compartida",
      });
    }

    // 2. Generar con RAG + Gemini o fallback semillas
    let contextoRAG = "";
    if (tieneClave() && tema) {
      const frags = await recuperar(
        `Ciclo, secuencia, etapas o proceso de ${tema} en ${materia} para ${curso}`,
        { materia: materia as Materia, curso: curso as Curso, k: 2 }
      );
      contextoRAG = frags.map((f, i) => `[${i + 1}] ${f.texto}`).join("\n\n");
    }

    let datosSecuencia = await secuenciaDeGemini(tema, materia, curso, contextoRAG);
    if (!datosSecuencia) {
      const lista = SEMILLA[materia] || SEMILLA.matematica;
      datosSecuencia = lista[Math.floor(Math.random() * lista.length)];
    }

    const datosGuardar = {
      tipoPlantilla: "secuencia",
      tema,
      enunciado: datosSecuencia.enunciado,
      pasosCorrectos: datosSecuencia.pasosCorrectos,
    };

    // 3. Cachear en biblioteca
    try {
      await db.insert(contenidoValidado).values({
        id: `secuencia-${crypto.randomUUID()}`,
        materia,
        curso,
        oa,
        dificultad,
        tipo: "secuencia",
        enunciado: datosSecuencia.enunciado,
        datos: datosGuardar,
        solucionPasoAPaso: datosSecuencia.pasosCorrectos,
        respuestaFinal: datosSecuencia.pasosCorrectos.join(" > "),
        estado: "publicada",
      });
    } catch (err) {
      console.error("No se pudo cachear la secuencia:", err);
    }

    return NextResponse.json({
      secuencia: {
        enunciado: datosSecuencia.enunciado,
        pasosCorrectos: datosSecuencia.pasosCorrectos,
        pasosBarajados: barajarSecuencia(datosSecuencia.pasosCorrectos),
      },
      fuente: "generada",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("Secuencias falló:", msg);
    return NextResponse.json({ error: "No se pudo generar la secuencia" }, { status: 500 });
  }
}
