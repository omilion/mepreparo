// API del tutor — el "middle". Arma un prompt CORTO según el momento de la
// tutoría (primera charla, saludo del día, o pregunta puntual), recupera
// contexto del currículum (RAG) y llama a Gemini. Si no hay clave o Gemini
// falla, responde en modo simulado (la app no se cae).
//
// La clave de Gemini vive solo aquí (servidor), nunca llega al navegador.

import { NextRequest, NextResponse } from "next/server";
import {
  TUTOR,
  sistemaPrimeraCharla,
  sistemaSesion,
  instruccionExtraerHorario,
  fechaHoraLegible,
} from "@/lib/tutor/personaje";
import { generar, tieneClave, MODELO_CHAT, MODELO_LITE } from "@/lib/tutor/gemini";
import { recuperar } from "@/lib/tutor/rag";
import { MATERIAS, type Curso, type Materia } from "@/lib/profile";
import type { AcuerdoTutoria, Dia } from "@/lib/tutor/acuerdo";
import { db } from "@/lib/db/db";
import { cacheRespuestas as cacheRespuestasTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs"; // necesitamos fs para leer los chunks

type Turno = { de: "rai" | "nino"; texto: string };

interface Body {
  // "saludo" = Rai inicia (sin pregunta). "chat" = responde al niño. "cerrar" = resume la tutoría.
  accion: "saludo" | "chat" | "cerrar";
  // primera charla si no hay acuerdo; sesión recurrente si lo hay
  acuerdo?: AcuerdoTutoria | null;
  resumenPerfil: string;
  materias: Materia[]; // ramos del examen (para primera charla)
  materiasHoy?: Materia[]; // lo que toca hoy (sesión)
  horasSemana?: number;
  materia?: Materia; // materia activa (para RAG en chat)
  curso?: Curso;
  nombre?: string;
  pregunta?: string; // solo en accion "chat"
  historial?: Turno[]; // conversación previa (para dar continuidad)
}

function normalizarPregunta(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .replace(/[¿?¡!.,:;_\-\(\)]/g, "")
    .replace(/\s+/g, " ");
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const esPrimera = !body.acuerdo;
  const accion = body.accion ?? "chat";

  // --- ACCIÓN: CERRAR (RESUMEN DE SESIÓN) ---
  if (accion === "cerrar") {
    const historialText = (body.historial || [])
      .map((t) => `${t.de === "rai" ? "Rai" : "Niño"}: ${t.texto}`)
      .join("\n");

    const sistemaPrompt = `Eres un asistente del currículum escolar. Se te proporciona una conversación entre el tutor de estudio "Rai" y un niño.
Debes generar un resumen de la sesión de estudio y extraer información clave del niño.
Retorna un objeto JSON con el siguiente formato exacto:
{
  "titulo": "Título corto y descriptivo del tema principal de estudio (ej: Suma de fracciones, Comprensión lectora de fábulas, etc.)",
  "resumen": "Resumen breve (1 a 3 frases en tercera persona y español simple) de lo que se trabajó, dónde se quedó y qué se debe reforzar.",
  "nuevasNotas": "Información nueva descubierta sobre el niño (ej. le cuestan los denominadores, se distrae con facilidad, le gustan los dinosaurios, etc.). Si no hay nada nuevo, déjalo vacío. Máximo 150 caracteres."
}`;

    const defaultResp = {
      titulo: `Sesión de ${body.materia ? (MATERIAS.find(m => m.id === body.materia)?.label ?? body.materia) : "estudio"}`,
      resumen: "Se realizó una sesión de tutoría y repaso de materias.",
      notasNino: body.acuerdo?.notasNino || "",
    };

    if (tieneClave()) {
      try {
        // C3. Enrutado de modelos: modelo barato (lite) para resúmenes
        const cruda = await generar({
          sistema: sistemaPrompt,
          usuario: `Conversación de estudio:\n${historialText}`,
          maxTokens: 400,
          json: true,
          model: MODELO_LITE,
        });

        const parsed = JSON.parse(cruda);
        const nuevasNotas = parsed.nuevasNotas || "";
        let notasFusionadas = body.acuerdo?.notasNino || "";
        if (nuevasNotas.trim()) {
          if (notasFusionadas) {
            notasFusionadas = `${notasFusionadas} ${nuevasNotas.trim()}`;
          } else {
            notasFusionadas = nuevasNotas.trim();
          }
          if (notasFusionadas.length > 400) {
            notasFusionadas = notasFusionadas.slice(0, 397) + "...";
          }
        }

        return NextResponse.json({
          titulo: parsed.titulo || defaultResp.titulo,
          resumen: parsed.resumen || defaultResp.resumen,
          notasNino: notasFusionadas,
        });
      } catch (e) {
        console.error("Fallo al resumir sesión con Gemini:", e);
        return NextResponse.json(defaultResp);
      }
    }

    return NextResponse.json(defaultResp);
  }

  if (accion === "chat" && !(body.pregunta || "").trim()) {
    return NextResponse.json({ error: "Falta la pregunta" }, { status: 400 });
  }

  // --- C2. CACHÉ DE RESPUESTAS DEL TUTOR ---
  const preguntaNormalizada = normalizarPregunta(body.pregunta || "");
  if (accion === "chat" && preguntaNormalizada.length > 5 && body.materia && body.curso) {
    try {
      const cacheRecords = await db
        .select()
        .from(cacheRespuestasTable)
        .where(
          and(
            eq(cacheRespuestasTable.preguntaNormalizada, preguntaNormalizada),
            eq(cacheRespuestasTable.materia, body.materia),
            eq(cacheRespuestasTable.curso, body.curso)
          )
        )
        .limit(1);

      if (cacheRecords.length > 0) {
        return NextResponse.json({
          respuesta: cacheRecords[0].respuesta,
          fuentes: [],
          modo: "cache_respuestas",
        });
      }
    } catch (err) {
      console.error("Error al consultar caché de respuestas:", err);
    }
  }

  // --- Prompt de sistema según el momento ---
  let sistema: string;
  if (esPrimera) {
    sistema =
      sistemaPrimeraCharla(
        body.resumenPerfil || "",
        body.materias || [],
        body.horasSemana ?? 6
      ) +
      "\n\n" +
      instruccionExtraerHorario(body.materias || []);
  } else {
    sistema = sistemaSesion(
      body.resumenPerfil || "",
      body.acuerdo!,
      body.materiasHoy || [],
      fechaHoraLegible()
    );
  }

  // --- RAG solo cuando hay una pregunta concreta ---
  let fuentes: string[] = [];
  let contexto = "";
  if (accion === "chat" && body.materia) {
    const fragmentos = await recuperar(body.pregunta!.trim(), {
      materia: body.materia,
      curso: body.curso,
      k: 3,
    });
    contexto = fragmentos.map((f, i) => `[${i + 1}] ${f.texto}`).join("\n\n");
    fuentes = fragmentos.map((f) => f.fuente);
  }

  // --- Mensaje de usuario: historial breve + contexto + turno actual ---
  const historial = (body.historial || [])
    .slice(-6) // solo lo reciente, para no gastar tokens
    .map((t) => `${t.de === "rai" ? "Rai" : "Niño"}: ${t.texto}`)
    .join("\n");

  const usuario =
    (historial ? `Conversación hasta ahora:\n${historial}\n\n` : "") +
    (contexto
      ? `Apóyate en este contenido del currículum oficial:\n${contexto}\n\n`
      : "") +
    (accion === "saludo"
      ? "Comienza tú la conversación ahora."
      : `El niño dice: ${body.pregunta!.trim()}`);

  // --- CAPA IA (con fallback simulado) ---
  if (tieneClave()) {
    try {
      // C3. Enrutado de modelos:
      // - Saludos o primera charla: modelo barato (lite)
      // - Respuestas de chat con RAG y explicaciones: modelo completo
      const modeloElegido = (accion === "saludo" || esPrimera)
        ? MODELO_LITE
        : MODELO_CHAT;

      const cruda = await generar({
        sistema,
        usuario,
        maxTokens: esPrimera ? 640 : 560,
        model: modeloElegido,
      });

      const { texto, horario } = separarHorario(cruda, body.materias || []);

      // C2. Guardar respuesta en la tabla caché si corresponde
      if (accion === "chat" && preguntaNormalizada.length > 5 && body.materia && body.curso && texto) {
        try {
          await db.insert(cacheRespuestasTable).values({
            id: crypto.randomUUID(),
            preguntaNormalizada,
            materia: body.materia,
            curso: body.curso,
            respuesta: texto,
          });
        } catch (err) {
          console.error("Error al registrar respuesta en cache_respuestas:", err);
        }
      }

      return NextResponse.json({
        respuesta: texto,
        fuentes,
        horario,
        modo: "gemini",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      console.error("Tutor Gemini falló:", msg);
      return NextResponse.json({
        respuesta: simulada(accion, esPrimera, body.nombre, body.pregunta),
        fuentes,
        modo: "simulado",
        aviso: "No se pudo contactar a Gemini; respuesta de demostración.",
      });
    }
  }

  return NextResponse.json({
    respuesta: simulada(accion, esPrimera, body.nombre, body.pregunta),
    fuentes,
    modo: "simulado",
  });
}

function separarHorario(
  cruda: string,
  materias: Materia[]
): { texto: string; horario?: Partial<Record<Dia, Materia[]>> } {
  const m = cruda.match(/<<HORARIO>>([\s\S]*?)<<FIN>>/);
  if (!m) return { texto: cruda.trim() };

  const texto = cruda.replace(m[0], "").trim();
  try {
    const crudo = JSON.parse(m[1].trim()) as Record<string, unknown>;
    const validas = new Set(materias);
    const diasValidos: Dia[] = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
    const horario: Partial<Record<Dia, Materia[]>> = {};
    for (const d of diasValidos) {
      const arr = crudo[d];
      if (Array.isArray(arr)) {
        const limpio = arr.filter(
          (x): x is Materia => typeof x === "string" && validas.has(x as Materia)
        );
        if (limpio.length) horario[d] = limpio;
      }
    }
    return { texto, horario: Object.keys(horario).length ? horario : undefined };
  } catch {
    return { texto };
  }
}

function simulada(
  accion: "saludo" | "chat",
  esPrimera: boolean,
  nombre?: string,
  pregunta?: string
): string {
  const quien = nombre?.trim() || "amigo";
  if (accion === "saludo") {
    return esPrimera
      ? `¡Hola ${quien}! Soy ${TUTOR.nombre} y voy a acompañarte a estudiar. ` +
          "Antes de partir, cuéntame: ¿qué días de la semana te acomoda estudiar? " +
          "(Esta es una respuesta de demostración; conecta la IA para la charla real.)"
      : `¡Hola de nuevo, ${quien}! Soy ${TUTOR.nombre}. ¿Retomamos donde quedamos? ` +
          "(Respuesta de demostración; conecta la IA.)";
  }
  return (
    `Buena pregunta, ${quien}. Cuando el tutor esté conectado te explicaré paso a paso ` +
    `"${(pregunta || "").trim()}" con ejemplos pensados para ti. (Modo demostración.)`
  );
}
