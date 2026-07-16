import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { contenidoValidado } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { recuperar } from "@/lib/tutor/rag";
import { generar, tieneClave } from "@/lib/tutor/gemini";
import type { Materia, Curso } from "@/lib/profile";
import { chequearLimite } from "@/lib/rateLimit";

// Respaldo por materia si Gemini no está o falla. El intruso nunca queda vacío.
const SEMILLA: Record<string, DatosIntruso[]> = {
  matematica: [
    { enunciado: "¿Cuál NO es múltiplo de 3?", opciones: ["9", "15", "22", "27"], intruso: "22", pista: "22 no se puede dividir exacto entre 3." },
  ],
  lenguaje: [
    { enunciado: "¿Cuál NO es un ser vivo?", opciones: ["Perro", "Gato", "Lápiz", "León"], intruso: "Lápiz", pista: "El lápiz es un objeto, no un ser vivo." },
  ],
  ciencias: [
    { enunciado: "¿Cuál NO es un mamífero?", opciones: ["Ballena", "Delfín", "Tiburón", "Foca"], intruso: "Tiburón", pista: "El tiburón es un pez; los demás son mamíferos." },
  ],
  historia: [
    { enunciado: "¿Cuál NO es un océano?", opciones: ["Pacífico", "Atlántico", "Andes", "Índico"], intruso: "Andes", pista: "Los Andes son una cordillera, no un océano." },
  ],
};

interface DatosIntruso {
  enunciado: string;
  opciones: string[];
  intruso: string;
  pista?: string;
}

// Baraja sin mutar (para que el intruso no quede siempre en la misma posición).
function revolver<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Valida que el objeto de Gemini sea jugable: 4-5 opciones, intruso incluido.
function esValido(d: Partial<DatosIntruso>): d is DatosIntruso {
  return (
    typeof d.enunciado === "string" &&
    Array.isArray(d.opciones) &&
    d.opciones.length >= 4 &&
    d.opciones.length <= 5 &&
    typeof d.intruso === "string" &&
    d.opciones.includes(d.intruso)
  );
}

async function intrusoDeGemini(
  tema: string,
  materia: string,
  curso: string,
  contextoRAG: string
): Promise<DatosIntruso | null> {
  if (!tieneClave()) return null;
  try {
    const sistema = `Eres un generador de acertijos "encuentra el intruso" para educación básica en Chile.
Crea un grupo de 4 o 5 elementos donde TODOS comparten una regla o categoría, MENOS UNO (el intruso).
Los elementos deben ser palabras o números cortos, del tema, apropiados para niños.
Responde SOLO un JSON:
{ "enunciado": "¿Cuál no corresponde?", "opciones": ["A","B","C","D"], "intruso": "C", "pista": "por qué C es el intruso, breve" }
El "intruso" DEBE ser idéntico a uno de "opciones".`;
    const usuario = `Tema: ${tema}
Materia: ${materia}
Curso: ${curso}
Contexto curricular:
${contextoRAG || "sin contexto"}`;
    const res = await generar({ sistema, usuario, maxTokens: 350, json: true });
    const obj = JSON.parse(res) as Partial<DatosIntruso>;
    return esValido(obj) ? obj : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "intruso", max: 30, ventanaMs: 60_000 });
  if (limite) return limite;

  const { searchParams } = new URL(req.url);
  const materia = searchParams.get("materia") || "matematica";
  const curso = searchParams.get("curso") || "5basico";
  const dificultad = parseInt(searchParams.get("dificultad") || "1", 10);
  const tema = searchParams.get("tema") || "";
  const oa = tema || "General";

  try {
    // 1. ¿Ya hay uno validado de este tema? (caché costo-cero)
    const existentes = await db
      .select()
      .from(contenidoValidado)
      .where(
        and(
          eq(contenidoValidado.materia, materia),
          eq(contenidoValidado.curso, curso),
          eq(contenidoValidado.tipo, "intruso"),
          eq(contenidoValidado.oa, oa),
          eq(contenidoValidado.estado, "publicada")
        )
      );
    if (existentes.length > 0) {
      const elegido = existentes[Math.floor(Math.random() * existentes.length)];
      const d = elegido.datos as DatosIntruso;
      return NextResponse.json({
        intruso: { ...d, opciones: revolver(d.opciones) },
        fuente: "biblioteca_compartida",
      });
    }

    // 2. Conseguir el intruso: Gemini (con RAG) o semilla.
    let contextoRAG = "";
    if (tieneClave() && tema) {
      const frags = await recuperar(
        `Conceptos y clasificaciones de ${tema} en ${materia} para ${curso}`,
        { materia: materia as Materia, curso: curso as Curso, k: 2 }
      );
      contextoRAG = frags.map((f, i) => `[${i + 1}] ${f.texto}`).join("\n\n");
    }
    let datos = await intrusoDeGemini(tema, materia, curso, contextoRAG);
    if (!datos) {
      const lista = SEMILLA[materia] || SEMILLA.matematica;
      datos = lista[Math.floor(Math.random() * lista.length)];
    }

    // 3. Guardar en la biblioteca para reutilizar gratis (best-effort).
    try {
      await db.insert(contenidoValidado).values({
        id: `intruso-${crypto.randomUUID()}`,
        materia,
        curso,
        oa,
        dificultad,
        tipo: "intruso",
        enunciado: datos.enunciado,
        datos: { tipoPlantilla: "intruso", tema, ...datos },
        solucionPasoAPaso: datos.pista ? [datos.pista] : [],
        respuestaFinal: datos.intruso,
        estado: "publicada",
      });
    } catch (err) {
      console.error("No se pudo cachear el intruso:", err);
    }

    return NextResponse.json({
      intruso: { ...datos, opciones: revolver(datos.opciones) },
      fuente: "generada",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("Intruso falló:", msg);
    return NextResponse.json({ error: "No se pudo generar el intruso" }, { status: 500 });
  }
}
