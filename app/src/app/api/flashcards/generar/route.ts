import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { contenidoValidado } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { recuperar } from "@/lib/tutor/rag";
import { generar, tieneClave } from "@/lib/tutor/gemini";
import type { Materia, Curso } from "@/lib/profile";
import { chequearLimite } from "@/lib/rateLimit";

interface Tarjeta {
  frente: string;
  reverso: string;
}

// Semilla de tarjetas educativas por materia.
const SEMILLA: Record<string, { enunciado: string; tarjetas: Tarjeta[] }[]> = {
  matematica: [
    {
      enunciado: "Estudia las figuras geométricas básicas:",
      tarjetas: [
        { frente: "triangulo", reverso: "Figura geométrica que tiene tres lados y tres ángulos." },
        { frente: "circulo", reverso: "Línea curva y redonda cuyos puntos están a igual distancia del centro." },
        { frente: "cuadrado", reverso: "Figura geométrica con cuatro lados iguales y cuatro esquinas rectas." },
      ],
    },
    {
      enunciado: "Estudia estos conceptos clave de cálculo:",
      tarjetas: [
        { frente: "calculadora", reverso: "Máquina o dispositivo para hacer operaciones matemáticas rápidamente." },
        { frente: "libro", reverso: "Símbolo de conocimiento donde registramos y leemos problemas matemáticos." },
      ],
    },
  ],
  lenguaje: [
    {
      enunciado: "Estudia los componentes de la lectura:",
      tarjetas: [
        { frente: "libro", reverso: "Conjunto de hojas escritas que nos cuentan una historia o explican un tema." },
        { frente: "lapiz", reverso: "Herramienta con mina de grafito que usamos para escribir letras y dibujar." },
        { frente: "escuela", reverso: "Lugar donde nos reunimos para aprender a leer, escribir y compartir." },
      ],
    },
  ],
  ciencias: [
    {
      enunciado: "Estudia los componentes fundamentales del cuerpo y la ciencia:",
      tarjetas: [
        { frente: "corazon", reverso: "Órgano muscular que bombea la sangre para que circule por todo nuestro cuerpo." },
        { frente: "cerebro", reverso: "El centro del sistema nervioso que controla nuestros pensamientos y acciones." },
        { frente: "atomo", reverso: "La partícula más pequeña e invisible que compone todas las cosas del universo." },
        { frente: "microscopio", reverso: "Instrumento con lentes potentes para observar cosas pequeñísimas que no se ven a simple vista." },
      ],
    },
  ],
  historia: [
    {
      enunciado: "Conceptos clave de geografía y astronomía histórica:",
      tarjetas: [
        { frente: "planeta", reverso: "Cuerpo celeste que gira alrededor del Sol, como la Tierra donde vivimos." },
        { frente: "brujula", reverso: "Instrumento con una aguja imantada que sirve para orientarse y siempre apunta al norte." },
        { frente: "mapa", reverso: "Dibujo que representa la superficie de la Tierra o una parte de ella en plano." },
      ],
    },
  ],
};

async function tarjetasDeGemini(
  tema: string,
  materia: string,
  curso: string,
  contextoRAG: string
): Promise<{ enunciado: string; tarjetas: Tarjeta[] } | null> {
  if (!tieneClave()) return null;
  try {
    const sistema = `Eres un creador de fichas de estudio (flashcards) didácticas para educación básica en Chile.
Genera un enunciado y un conjunto de 3 o 4 fichas (tarjetas). Cada ficha tiene un 'frente' (un concepto corto o palabra, idealmente una sola palabra que coincida con útiles, ciencia o animales) y un 'reverso' (su explicación o definición corta, máximo una frase simple).
Responde SOLAMENTE con un objeto JSON en este formato:
{
  "enunciado": "consigna de estudio",
  "tarjetas": [
    { "frente": "cerebro", "reverso": "Órgano que controla el cuerpo." },
    { "frente": "atomo", "reverso": "Partícula más pequeña de la materia." }
  ]
}`;

    const usuario = `Tema: ${tema}
Materia: ${materia}
Curso: ${curso}
Contexto curricular:
${contextoRAG || "sin contexto"}`;

    const res = await generar({ sistema, usuario, maxTokens: 400, json: true });
    const obj = JSON.parse(res) as { enunciado?: string; tarjetas?: Tarjeta[] };
    if (!obj.enunciado || !Array.isArray(obj.tarjetas) || obj.tarjetas.length === 0) {
      return null;
    }
    return {
      enunciado: obj.enunciado.trim(),
      tarjetas: obj.tarjetas.map((t) => ({
        frente: t.frente.trim().toLowerCase(),
        reverso: t.reverso.trim(),
      })),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "flashcards", max: 30, ventanaMs: 60_000 });
  if (limite) return limite;

  const { searchParams } = new URL(req.url);
  const materia = searchParams.get("materia") || "matematica";
  const curso = searchParams.get("curso") || "5basico";
  const dificultad = parseInt(searchParams.get("dificultad") || "1", 10);
  const tema = searchParams.get("tema") || "";
  const oa = tema || "General";

  try {
    // 1. Buscar en caché de base de datos
    const existentes = await db
      .select()
      .from(contenidoValidado)
      .where(
        and(
          eq(contenidoValidado.materia, materia),
          eq(contenidoValidado.curso, curso),
          eq(contenidoValidado.tipo, "flashcards"),
          eq(contenidoValidado.oa, oa),
          eq(contenidoValidado.estado, "publicada")
        )
      );

    if (existentes.length > 0) {
      const elegida = existentes[Math.floor(Math.random() * existentes.length)];
      const d = elegida.datos as { enunciado: string; tarjetas: Tarjeta[] };
      return NextResponse.json({
        flashcards: {
          enunciado: d.enunciado,
          tarjetas: d.tarjetas,
        },
        fuente: "biblioteca_compartida",
      });
    }

    // 2. Generar con RAG o fallback semillas
    let contextoRAG = "";
    if (tieneClave() && tema) {
      const frags = await recuperar(
        `Conceptos clave, definiciones e ideas fundamentales de ${tema} en ${materia} para ${curso}`,
        { materia: materia as Materia, curso: curso as Curso, k: 2 }
      );
      contextoRAG = frags.map((f, i) => `[${i + 1}] ${f.texto}`).join("\n\n");
    }

    let datosMazo = await tarjetasDeGemini(tema, materia, curso, contextoRAG);
    if (!datosMazo || datosMazo.tarjetas.length === 0) {
      const lista = SEMILLA[materia] || SEMILLA.matematica;
      datosMazo = lista[Math.floor(Math.random() * lista.length)];
    }

    const datosGuardar = {
      tipoPlantilla: "flashcards",
      tema,
      enunciado: datosMazo.enunciado,
      tarjetas: datosMazo.tarjetas,
    };

    // 3. Cachear en la base de datos
    try {
      await db.insert(contenidoValidado).values({
        id: `flashcards-${crypto.randomUUID()}`,
        materia,
        curso,
        oa,
        dificultad,
        tipo: "flashcards",
        enunciado: datosMazo.enunciado,
        datos: datosGuardar,
        solucionPasoAPaso: datosMazo.tarjetas.map((t) => `${t.frente}: ${t.reverso}`),
        respuestaFinal: `${datosMazo.tarjetas.length} tarjetas`,
        estado: "publicada",
      });
    } catch (err) {
      console.error("No se pudo cachear el mazo de flashcards:", err);
    }

    return NextResponse.json({
      flashcards: {
        enunciado: datosMazo.enunciado,
        tarjetas: datosMazo.tarjetas,
      },
      fuente: "generada",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("Flashcards falló:", msg);
    return NextResponse.json({ error: "No se pudo generar el mazo de flashcards" }, { status: 500 });
  }
}
