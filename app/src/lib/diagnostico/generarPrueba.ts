import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { contenidoValidado } from "@/lib/db/schema";
import { generar, tieneClave } from "@/lib/tutor/gemini";
import { validarEjercicio } from "@/lib/tutor/checker";

// Pregunta de opción múltiple para la PRUEBA DE ETAPA, generada por Gemini cuando
// el banco estático es delgado (muchos temas tienen solo 1-2 preguntas). Se valida
// con el checker de dos niveles y se cachea en la biblioteca (tipo "prueba_gen"),
// así la 2ª vez sale gratis. correctaIndex es la posición de la correcta en
// `opciones` SIN barajar; quien la sirve baraja y calcula el HMAC.

export interface PreguntaGen {
  id: string;
  enunciado: string;
  opciones: string[];
  correctaIndex: number;
}

// SIEMPRE 4 opciones: el validador de respuestas (responder) prueba los índices
// 0..3, así que la correcta debe caer en ese rango.
const N_OPCIONES = 4;

export async function obtenerPreguntaGenerada(
  materia: string,
  curso: string,
  tema: string,
  dificultad: number,
  excluidas: Set<string>
): Promise<PreguntaGen | null> {
  // 1. ¿Ya hay alguna cacheada de este tema sin usar? (costo cero)
  try {
    const cacheadas = await db
      .select()
      .from(contenidoValidado)
      .where(
        and(
          eq(contenidoValidado.materia, materia),
          eq(contenidoValidado.curso, curso),
          eq(contenidoValidado.tipo, "prueba_gen"),
          eq(contenidoValidado.oa, tema),
          eq(contenidoValidado.estado, "publicada")
        )
      );
    const disponibles = cacheadas.filter((r) => !excluidas.has(r.id));
    if (disponibles.length > 0) {
      const r = disponibles[Math.floor(Math.random() * disponibles.length)];
      const opciones: string[] = (r.datos as { opciones?: string[] })?.opciones ?? [];
      const idx = opciones.indexOf(r.respuestaFinal);
      if (opciones.length === N_OPCIONES && idx >= 0) {
        return { id: r.id, enunciado: r.enunciado, opciones, correctaIndex: idx };
      }
    }
  } catch (err) {
    console.error("Error leyendo prueba_gen cacheadas:", err);
  }

  // 2. Generar una nueva con Gemini + checker.
  if (!tieneClave()) return null;
  try {
    const sistema = `Eres un generador de preguntas de opción múltiple para EVALUAR a un niño de educación básica en Chile sobre un tema específico.
Genera UNA pregunta clara con EXACTAMENTE 4 opciones plausibles y UNA sola correcta. Las opciones incorrectas deben ser errores creíbles, no absurdos.
Responde SOLO un JSON con este formato exacto:
{ "enunciado": "la pregunta", "opciones": ["a","b","c","d"], "respuestaFinal": "la opción correcta, idéntica a una de opciones" }`;
    const usuario = `Materia: ${materia}
Curso: ${curso}
Tema: ${tema}
Dificultad: ${dificultad} (escala 1 a 3)`;
    const cruda = await generar({ sistema, usuario, maxTokens: 600, json: true });
    const obj = JSON.parse(cruda) as {
      enunciado?: string;
      opciones?: string[];
      respuestaFinal?: string;
    };
    if (
      !obj.enunciado ||
      !Array.isArray(obj.opciones) ||
      obj.opciones.length !== N_OPCIONES ||
      !obj.respuestaFinal
    ) {
      return null;
    }

    // Checker de dos niveles (rechaza opciones duplicadas, correcta ausente, etc.)
    const check = await validarEjercicio(materia, {
      enunciado: obj.enunciado,
      datos: {},
      solucionPasoAPaso: [],
      respuestaFinal: obj.respuestaFinal,
      opciones: obj.opciones,
      tipoPlantilla: "opcion_multiple",
    });
    if (!check.esValido) return null;

    const idx = obj.opciones.indexOf(obj.respuestaFinal);
    if (idx < 0) return null;

    const id = `pruebagen-${crypto.randomUUID()}`;
    try {
      await db.insert(contenidoValidado).values({
        id,
        materia,
        curso,
        oa: tema,
        dificultad,
        tipo: "prueba_gen",
        enunciado: obj.enunciado,
        datos: { opciones: obj.opciones },
        solucionPasoAPaso: [],
        respuestaFinal: obj.respuestaFinal,
        estado: "publicada",
      });
    } catch (err) {
      console.error("No se pudo cachear la pregunta generada:", err);
    }

    return { id, enunciado: obj.enunciado, opciones: obj.opciones, correctaIndex: idx };
  } catch (err) {
    console.error("Fallo generando pregunta de prueba:", err);
    return null;
  }
}
