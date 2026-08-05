import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { contenidoValidado } from "@/lib/db/schema";
import { generar, tieneClave } from "@/lib/tutor/gemini";
import { validarEjercicio } from "@/lib/tutor/checker";
import { esMuyParecida } from "./similitud";

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
  excluidas: Set<string>,
  // Enunciados que el niño YA vio en esta prueba (del banco o generados). Sin
  // esto la IA no tenía forma de saber qué se preguntó y devolvía siempre lo
  // más obvio del tema con otra redacción: una niña recibió 3 de 8 preguntas
  // que eran la misma.
  enunciadosUsados: string[] = []
): Promise<PreguntaGen | null> {
  // Todos los enunciados ya cacheados del tema: sirven para dos cosas distintas
  // —elegir uno sin usar, y evitar que la IA vuelva a inventar ese mismo.
  let enunciadosCacheados: string[] = [];
  // Lo que el niño ya vio en ESTA prueba. Empieza con lo que llega del banco y
  // se completa abajo con las generadas que ya se le sirvieron (esas no están
  // en el banco, así que quien llama no puede conocer su enunciado).
  const yaVistos = [...enunciadosUsados];

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
    enunciadosCacheados = cacheadas.map((r) => r.enunciado);
    // las generadas que ya se le sirvieron en esta misma prueba
    for (const r of cacheadas) if (excluidas.has(r.id)) yaVistos.push(r.enunciado);

    // No basta con descartar por id: la biblioteca quedó con variantes de la
    // misma pregunta, así que también se descarta lo que se PAREZCA a algo ya
    // preguntado en esta prueba.
    const disponibles = cacheadas.filter(
      (r) => !excluidas.has(r.id) && !esMuyParecida(r.enunciado, yaVistos)
    );
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
    // Se le muestra TODO lo que ya existe del tema (lo preguntado en esta
    // prueba y lo que hay en la biblioteca) para que apunte a otro aspecto.
    const yaExisten = [...new Set([...yaVistos, ...enunciadosCacheados])].slice(0, 20);
    const evitar = yaExisten.length
      ? `\n\nEstas preguntas YA EXISTEN sobre este tema. Genera una CLARAMENTE DISTINTA, ` +
        `que evalúe otro aspecto o habilidad del mismo tema — no vale la misma pregunta ` +
        `con otros números, otros nombres o el orden cambiado:\n` +
        yaExisten.map((e) => `- ${e}`).join("\n")
      : "";

    const usuario = `Materia: ${materia}
Curso: ${curso}
Tema: ${tema}
Dificultad: ${dificultad} (escala 1 a 3)${evitar}`;
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

    // Aunque se le pidió algo distinto, la IA insiste a veces con la misma
    // pregunta. Si salió parecida a algo ya preguntado en ESTA prueba, se
    // descarta: es preferible una pregunta menos a repetirle una al niño.
    if (esMuyParecida(obj.enunciado, yaVistos)) {
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
    // Solo se guarda si aporta algo NUEVO a la biblioteca. Cachear variantes
    // de lo mismo era lo que hacía que el problema creciera solo: cada prueba
    // dejaba más duplicados para las pruebas siguientes, de todos los niños.
    const aportaALaBiblioteca = !esMuyParecida(obj.enunciado, enunciadosCacheados);
    try {
      if (aportaALaBiblioteca) {
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
      }
    } catch (err) {
      console.error("No se pudo cachear la pregunta generada:", err);
    }

    return { id, enunciado: obj.enunciado, opciones: obj.opciones, correctaIndex: idx };
  } catch (err) {
    console.error("Fallo generando pregunta de prueba:", err);
    return null;
  }
}
