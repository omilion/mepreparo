import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { contenidoValidado } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { recuperar } from "@/lib/tutor/rag";
import { generar, tieneClave } from "@/lib/tutor/gemini";
import type { Materia, Curso } from "@/lib/profile";
import { chequearLimite } from "@/lib/rateLimit";

interface Par {
  izq: string;
  der: string;
}
interface DatosConector {
  enunciado: string;
  pares: Par[];
}

// Respaldo por materia si Gemini no está o falla. El conector nunca queda vacío.
const SEMILLA: Record<string, DatosConector> = {
  matematica: {
    enunciado: "Une cada operación con su resultado",
    pares: [
      { izq: "2 × 4", der: "8" },
      { izq: "3 × 3", der: "9" },
      { izq: "5 × 2", der: "10" },
      { izq: "6 × 2", der: "12" },
    ],
  },
  lenguaje: {
    enunciado: "Une cada palabra con su tipo",
    pares: [
      { izq: "correr", der: "verbo" },
      { izq: "perro", der: "sustantivo" },
      { izq: "azul", der: "adjetivo" },
    ],
  },
  ciencias: {
    enunciado: "Une cada órgano con su función",
    pares: [
      { izq: "Corazón", der: "Bombear sangre" },
      { izq: "Pulmones", der: "Respirar" },
      { izq: "Estómago", der: "Digerir" },
    ],
  },
  historia: {
    enunciado: "Une cada lugar con lo que es",
    pares: [
      { izq: "Andes", der: "Cordillera" },
      { izq: "Pacífico", der: "Océano" },
      { izq: "Atacama", der: "Desierto" },
    ],
  },
};

// Valida: 3-5 pares, textos no vacíos, izquierdas y derechas únicas.
function esValido(d: Partial<DatosConector>): d is DatosConector {
  if (typeof d.enunciado !== "string" || !Array.isArray(d.pares)) return false;
  if (d.pares.length < 3 || d.pares.length > 5) return false;
  if (!d.pares.every((p) => p && typeof p.izq === "string" && typeof p.der === "string" && p.izq.trim() && p.der.trim())) {
    return false;
  }
  const izqs = new Set(d.pares.map((p) => p.izq));
  const ders = new Set(d.pares.map((p) => p.der));
  return izqs.size === d.pares.length && ders.size === d.pares.length;
}

async function conectorDeGemini(
  tema: string,
  materia: string,
  curso: string,
  contextoRAG: string
): Promise<DatosConector | null> {
  if (!tieneClave()) return null;
  try {
    const sistema = `Eres un generador de actividades "unir con líneas" para educación básica en Chile.
Crea 3 o 4 pares donde cada elemento de la izquierda se une con UNO de la derecha (relación clara: operación↔resultado, palabra↔tipo, órgano↔función, etc.). Textos cortos, del tema, aptos para niños.
Responde SOLO un JSON:
{ "enunciado": "Une cada X con su Y", "pares": [ {"izq":"...","der":"..."}, ... ] }
Cada "izq" y cada "der" debe ser único (no repetir).`;
    const usuario = `Tema: ${tema}
Materia: ${materia}
Curso: ${curso}
Contexto curricular:
${contextoRAG || "sin contexto"}`;
    const res = await generar({ sistema, usuario, maxTokens: 450, json: true });
    const obj = JSON.parse(res) as Partial<DatosConector>;
    return esValido(obj) ? obj : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "conector", max: 30, ventanaMs: 60_000 });
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
          eq(contenidoValidado.tipo, "conector"),
          eq(contenidoValidado.oa, oa),
          eq(contenidoValidado.estado, "publicada")
        )
      );
    if (existentes.length > 0) {
      const elegido = existentes[Math.floor(Math.random() * existentes.length)];
      return NextResponse.json({ conector: elegido.datos, fuente: "biblioteca_compartida" });
    }

    // 2. Conseguir el conector: Gemini (con RAG) o semilla.
    let contextoRAG = "";
    if (tieneClave() && tema) {
      const frags = await recuperar(
        `Relaciones y conceptos de ${tema} en ${materia} para ${curso}`,
        { materia: materia as Materia, curso: curso as Curso, k: 2 }
      );
      contextoRAG = frags.map((f, i) => `[${i + 1}] ${f.texto}`).join("\n\n");
    }
    let datos = await conectorDeGemini(tema, materia, curso, contextoRAG);
    if (!datos) datos = SEMILLA[materia] || SEMILLA.matematica;

    const guardable = { tipoPlantilla: "conector", tema, ...datos };

    // 3. Guardar en la biblioteca para reutilizar gratis (best-effort).
    try {
      await db.insert(contenidoValidado).values({
        id: `conector-${crypto.randomUUID()}`,
        materia,
        curso,
        oa,
        dificultad,
        tipo: "conector",
        enunciado: datos.enunciado,
        datos: guardable,
        solucionPasoAPaso: [],
        respuestaFinal: datos.pares.map((p) => `${p.izq}=${p.der}`).join("; "),
        estado: "publicada",
      });
    } catch (err) {
      console.error("No se pudo cachear el conector:", err);
    }

    return NextResponse.json({ conector: guardable, fuente: "generada" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("Conector falló:", msg);
    return NextResponse.json({ error: "No se pudo generar el conector" }, { status: 500 });
  }
}
