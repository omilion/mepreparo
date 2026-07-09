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
import { generar, tieneClave } from "@/lib/tutor/gemini";
import { recuperar } from "@/lib/tutor/rag";
import type { Curso, Materia } from "@/lib/profile";
import type { AcuerdoTutoria, Dia } from "@/lib/tutor/acuerdo";

export const runtime = "nodejs"; // necesitamos fs para leer los chunks

type Turno = { de: "rai" | "nino"; texto: string };

interface Body {
  // "saludo" = Rai inicia (sin pregunta). "chat" = responde al niño.
  accion: "saludo" | "chat";
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

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const esPrimera = !body.acuerdo;
  const accion = body.accion ?? "chat";

  if (accion === "chat" && !(body.pregunta || "").trim()) {
    return NextResponse.json({ error: "Falta la pregunta" }, { status: 400 });
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

  // --- RAG solo cuando hay una pregunta concreta (en el saludo no hace falta) ---
  let fuentes: string[] = [];
  let contexto = "";
  if (accion === "chat" && body.materia) {
    const fragmentos = recuperar(body.pregunta!.trim(), {
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
      const cruda = await generar({
        sistema,
        usuario,
        // el thinkingBudget (128) se descuenta de aquí, así que dejamos aire
        maxTokens: esPrimera ? 640 : 560,
      });
      const { texto, horario } = separarHorario(cruda, body.materias || []);
      return NextResponse.json({
        respuesta: texto,
        fuentes,
        horario, // presente solo si Rai cerró el acuerdo
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

// Extrae el bloque <<HORARIO>>{...}<<FIN>> si Rai lo incluyó, y devuelve el
// texto limpio (sin el bloque) + el horario parseado y saneado.
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
    return { texto }; // JSON malo: al menos devolvemos el texto limpio
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
