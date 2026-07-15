import { NextRequest, NextResponse } from "next/server";
import WordSearch from "@blex41/word-search";
import { db } from "@/lib/db/db";
import { contenidoValidado } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { recuperar } from "@/lib/tutor/rag";
import { generar, tieneClave } from "@/lib/tutor/gemini";
import type { Materia, Curso } from "@/lib/profile";
import { chequearLimite } from "@/lib/rateLimit";

// Palabras de respaldo por materia si Gemini no está o falla. Cortas, limpias,
// aptas para básica. La sopa NUNCA debe quedarse sin contenido.
const SEMILLA_PALABRAS: Record<string, string[]> = {
  matematica: ["SUMA", "RESTA", "NUMERO", "CERO", "MITAD", "DOBLE"],
  lenguaje: ["VERBO", "LETRA", "FRASE", "CUENTO", "RIMA", "SILABA"],
  ciencias: ["AGUA", "PLANTA", "SOL", "AIRE", "TIERRA", "ENERGIA"],
  historia: ["CHILE", "MAPA", "PUEBLO", "OCEANO", "ANDES", "SUR"],
};

// Anti-groserías básico (es-CL). La librería reintenta el grid si alguna se forma.
const PALABRAS_PROHIBIDAS = [
  "CULO", "PICO", "PENE", "TETA", "CACA", "MEAR", "COÑO", "PUTA",
  "PUTO", "MIERDA", "WEON", "ZORRA", "PErra",
].map((w) => w.toUpperCase());

// Normaliza a MAYÚSCULAS sin tildes/ñ (el grid trabaja así) y filtra por largo.
function limpiarPalabras(brutas: string[]): string[] {
  const vistas = new Set<string>();
  const out: string[] = [];
  for (const raw of brutas) {
    const w = raw
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // quita tildes (diacríticos combinantes)
      .replace(/[^a-zA-ZñÑ]/g, "") // solo letras (incluye ñ/Ñ)
      .toUpperCase();
    if (w.length < 3 || w.length > 9) continue;
    if (vistas.has(w)) continue;
    vistas.add(w);
    out.push(w);
    if (out.length >= 8) break;
  }
  return out;
}

// Pide a Gemini palabras del tema. Devuelve [] si no hay clave o falla.
async function palabrasDeGemini(
  tema: string,
  materia: string,
  curso: string,
  contextoRAG: string
): Promise<string[]> {
  if (!tieneClave()) return [];
  try {
    const sistema = `Eres un generador de vocabulario escolar para educación básica en Chile.
Devuelve entre 6 y 8 palabras clave del tema, en español, de una sola palabra cada una
(sin espacios ni guiones), de 3 a 9 letras, apropiadas para niños. Sin nombres propios
raros ni groserías. Responde SOLO un JSON con este formato: { "palabras": ["AGUA", "SOL"] }`;
    const usuario = `Tema: ${tema}
Materia: ${materia}
Curso: ${curso}
Contexto curricular:
${contextoRAG || "sin contexto"}`;
    const res = await generar({ sistema, usuario, maxTokens: 300, json: true });
    const obj = JSON.parse(res) as { palabras?: unknown };
    if (!Array.isArray(obj.palabras)) return [];
    return obj.palabras.map(String);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "sopa", max: 30, ventanaMs: 60_000 });
  if (limite) return limite;

  const { searchParams } = new URL(req.url);
  const materia = searchParams.get("materia") || "matematica";
  const curso = searchParams.get("curso") || "5basico";
  const dificultad = parseInt(searchParams.get("dificultad") || "1", 10);
  const tema = searchParams.get("tema") || "";
  const oa = tema || "General";

  try {
    // 1. ¿Ya hay una sopa validada de este tema? (caché costo-cero)
    const existentes = await db
      .select()
      .from(contenidoValidado)
      .where(
        and(
          eq(contenidoValidado.materia, materia),
          eq(contenidoValidado.curso, curso),
          eq(contenidoValidado.tipo, "sopa"),
          eq(contenidoValidado.oa, oa),
          eq(contenidoValidado.estado, "publicada")
        )
      );
    if (existentes.length > 0) {
      const elegida = existentes[Math.floor(Math.random() * existentes.length)];
      return NextResponse.json({ sopa: elegida.datos, fuente: "biblioteca_compartida" });
    }

    // 2. Conseguir palabras: Gemini (con RAG) o semilla.
    let contextoRAG = "";
    if (tieneClave() && tema) {
      const frags = await recuperar(
        `Vocabulario y conceptos de ${tema} en ${materia} para ${curso}`,
        { materia: materia as Materia, curso: curso as Curso, k: 2 }
      );
      contextoRAG = frags.map((f, i) => `[${i + 1}] ${f.texto}`).join("\n\n");
    }
    const brutas = await palabrasDeGemini(tema, materia, curso, contextoRAG);
    let palabras = limpiarPalabras(brutas);
    if (palabras.length < 4) {
      // respaldo por materia (o matemática por defecto)
      palabras = limpiarPalabras(SEMILLA_PALABRAS[materia] || SEMILLA_PALABRAS.matematica);
    }

    // 3. Generar el grid con la librería. Tamaño según la palabra más larga.
    const maxLargo = Math.max(...palabras.map((p) => p.length));
    const lado = Math.min(12, Math.max(8, maxLargo + 2));
    const ws = new WordSearch({
      cols: lado,
      rows: lado,
      dictionary: palabras,
      forbiddenWords: PALABRAS_PROHIBIDAS,
      upperCase: true,
      diacritics: false,
      backwardsProbability: 0.25,
      maxRetries: 15,
    });

    // Solo conservamos las palabras que la librería logró colocar Y que además
    // REALMENTE están en el grid en su path (verificación de integridad: releemos
    // las letras del grid siguiendo cada path y las comparamos con la palabra).
    // Así la lista mostrada nunca incluye una palabra que no está en la grilla.
    const grid = ws.grid;
    const enGrid = (path: { x: number; y: number }[], clean: string) =>
      path.length === clean.length &&
      path.every((c, i) => grid[c.y]?.[c.x] === clean[i]);

    const colocadas = ws.words
      .filter((w) => enGrid(w.path, w.clean))
      .map((w) => ({ clean: w.clean, path: w.path }));

    if (colocadas.length < 3) {
      return NextResponse.json(
        { error: "No se pudo armar una sopa jugable" },
        { status: 422 }
      );
    }

    const datos = {
      tipoPlantilla: "sopa",
      tema,
      grid: grid.map((fila: string[]) => fila.join("")),
      palabras: colocadas,
    };

    // 4. Guardar en la biblioteca para reutilizar gratis (best-effort).
    try {
      await db.insert(contenidoValidado).values({
        id: `sopa-${crypto.randomUUID()}`,
        materia,
        curso,
        oa,
        dificultad,
        tipo: "sopa",
        enunciado: `Sopa de letras de ${tema || materia}`,
        datos,
        solucionPasoAPaso: [],
        respuestaFinal: colocadas.map((c) => c.clean).join(", "),
        estado: "publicada",
      });
    } catch (err) {
      console.error("No se pudo cachear la sopa:", err);
    }

    return NextResponse.json({ sopa: datos, fuente: "generada" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("Sopa falló:", msg);
    return NextResponse.json({ error: "No se pudo generar la sopa" }, { status: 500 });
  }
}
