import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { contenidoValidado } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { recuperar } from "@/lib/tutor/rag";
import { generar, tieneClave } from "@/lib/tutor/gemini";
import type { Materia, Curso } from "@/lib/profile";
import { chequearLimite } from "@/lib/rateLimit";
import { catalogoParaPrompt } from "@/lib/tutor/iconos";

interface Item {
  texto: string;
  grupo: string;
}
interface DatosClasificador {
  enunciado: string;
  grupos: string[];
  items: Item[];
}

// Respaldo por materia si Gemini no está o falla. Nunca queda vacío.
const SEMILLA: Record<string, DatosClasificador> = {
  matematica: {
    enunciado: "Arrastra cada número a su grupo",
    grupos: ["Pares", "Impares"],
    items: [
      { texto: "2", grupo: "Pares" }, { texto: "7", grupo: "Impares" },
      { texto: "4", grupo: "Pares" }, { texto: "9", grupo: "Impares" },
      { texto: "6", grupo: "Pares" }, { texto: "3", grupo: "Impares" },
    ],
  },
  ciencias: {
    enunciado: "Arrastra cada uno a su grupo",
    grupos: ["Animales", "Plantas"],
    items: [
      { texto: "perro", grupo: "Animales" }, { texto: "flor", grupo: "Plantas" },
      { texto: "gato", grupo: "Animales" }, { texto: "arbol", grupo: "Plantas" },
      { texto: "pez", grupo: "Animales" }, { texto: "cactus", grupo: "Plantas" },
    ],
  },
  lenguaje: {
    enunciado: "Arrastra cada palabra a su tipo",
    grupos: ["Sustantivo", "Verbo"],
    items: [
      { texto: "perro", grupo: "Sustantivo" }, { texto: "correr", grupo: "Verbo" },
      { texto: "casa", grupo: "Sustantivo" }, { texto: "saltar", grupo: "Verbo" },
      { texto: "sol", grupo: "Sustantivo" }, { texto: "comer", grupo: "Verbo" },
    ],
  },
  historia: {
    enunciado: "Arrastra cada uno a su grupo",
    grupos: ["Transporte", "Edificios"],
    items: [
      { texto: "auto", grupo: "Transporte" }, { texto: "casa", grupo: "Edificios" },
      { texto: "avion", grupo: "Transporte" }, { texto: "iglesia", grupo: "Edificios" },
      { texto: "tren", grupo: "Transporte" }, { texto: "castillo", grupo: "Edificios" },
    ],
  },
};

// Valida: 2-3 grupos, 4-8 items, cada item de un grupo existente, al menos 2 por grupo.
function esValido(d: Partial<DatosClasificador>): d is DatosClasificador {
  if (typeof d.enunciado !== "string" || !Array.isArray(d.grupos) || !Array.isArray(d.items)) {
    return false;
  }
  if (d.grupos.length < 2 || d.grupos.length > 3) return false;
  if (d.items.length < 4 || d.items.length > 8) return false;
  const setG = new Set(d.grupos);
  if (!d.items.every((it) => it && typeof it.texto === "string" && it.texto.trim() && setG.has(it.grupo))) {
    return false;
  }
  // cada grupo con al menos 1 item
  return d.grupos.every((g) => d.items!.some((it) => it.grupo === g));
}

async function clasificadorDeGemini(
  tema: string,
  materia: string,
  curso: string,
  contextoRAG: string
): Promise<DatosClasificador | null> {
  if (!tieneClave()) return null;
  try {
    const sistema = `Eres un generador de actividades "clasificar / arrastrar a grupos" para educación básica en Chile.
Crea 2 o 3 grupos y de 4 a 6 elementos que el niño debe repartir en el grupo correcto (ej: Pares/Impares, Animales/Plantas, Sustantivo/Verbo). Cada grupo con al menos 2 elementos.

ICONOS: si TODOS los elementos pueden expresarse con un dibujo de esta lista,
usa el nombre EXACTO del icono en "texto" (minúsculas, sin tildes). El juego se
ve mucho mejor. Solo si TODOS caben; si no, usa palabras en todos (no mezcles).
${catalogoParaPrompt()}

Responde SOLO un JSON:
{ "enunciado": "Arrastra cada X a su grupo", "grupos": ["A","B"], "items": [ {"texto":"...","grupo":"A"}, ... ] }
El "grupo" de cada item DEBE ser uno de "grupos".`;
    const usuario = `Tema: ${tema}
Materia: ${materia}
Curso: ${curso}
Contexto curricular:
${contextoRAG || "sin contexto"}`;
    const res = await generar({ sistema, usuario, maxTokens: 500, json: true });
    const obj = JSON.parse(res) as Partial<DatosClasificador>;
    return esValido(obj) ? obj : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "clasificador", max: 30, ventanaMs: 60_000 });
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
          eq(contenidoValidado.tipo, "clasificador"),
          eq(contenidoValidado.oa, oa),
          eq(contenidoValidado.estado, "publicada")
        )
      );
    if (existentes.length > 0) {
      const elegido = existentes[Math.floor(Math.random() * existentes.length)];
      return NextResponse.json({ clasificador: elegido.datos, fuente: "biblioteca_compartida" });
    }

    // 2. Conseguirlo: Gemini (con RAG) o semilla.
    let contextoRAG = "";
    if (tieneClave() && tema) {
      const frags = await recuperar(
        `Clasificaciones y categorías de ${tema} en ${materia} para ${curso}`,
        { materia: materia as Materia, curso: curso as Curso, k: 2 }
      );
      contextoRAG = frags.map((f, i) => `[${i + 1}] ${f.texto}`).join("\n\n");
    }
    let datos = await clasificadorDeGemini(tema, materia, curso, contextoRAG);
    if (!datos) datos = SEMILLA[materia] || SEMILLA.matematica;

    const guardable = { tipoPlantilla: "clasificador", tema, ...datos };

    // 3. Guardar en la biblioteca para reutilizar gratis (best-effort).
    try {
      await db.insert(contenidoValidado).values({
        id: `clasif-${crypto.randomUUID()}`,
        materia,
        curso,
        oa,
        dificultad,
        tipo: "clasificador",
        enunciado: datos.enunciado,
        datos: guardable,
        solucionPasoAPaso: [],
        respuestaFinal: datos.items.map((it) => `${it.texto}:${it.grupo}`).join("; "),
        estado: "publicada",
      });
    } catch (err) {
      console.error("No se pudo cachear el clasificador:", err);
    }

    return NextResponse.json({ clasificador: guardable, fuente: "generada" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("Clasificador falló:", msg);
    return NextResponse.json({ error: "No se pudo generar el clasificador" }, { status: 500 });
  }
}
