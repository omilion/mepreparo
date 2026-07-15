// API del tutor — el "middle". Arma un prompt CORTO según el momento de la
// tutoría (primera charla, saludo del día, o pregunta puntual), recupera
// contexto del currículum (RAG) y llama a Gemini. Si no hay clave o Gemini
// falla, responde en modo simulado (la app no se cae).
//
// La clave de Gemini vive solo aquí (servidor), nunca llega al navegador.

import { NextRequest, NextResponse } from "next/server";
import { chequearLimite } from "@/lib/rateLimit";
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
  // si el niño entró desde el mapa de etapas: la lección se centra en este tema
  temaFoco?: string;
}

function normalizarPregunta(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .replace(/[¿?¡!.,:;_\-\(\)]/g, "")
    .replace(/\s+/g, " ");
}

export async function POST(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "tutor", max: 30, ventanaMs: 60_000 });
  if (limite) return limite;

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

    const materiaSesion = body.materia || "matematica";
    const sistemaPrompt = `Eres un asistente del currículum escolar. Se te proporciona una conversación entre el tutor de estudio "Rai" y un niño.
Debes generar un resumen de la sesión y extraer la MEMORIA pedagógica del niño.
REGLA DE PRIVACIDAD ESTRICTA: las frases del niño que registres deben ser SOLO sobre el estudio (qué le cuesta, qué le gusta aprender, cómo se sintió estudiando). NUNCA registres datos de familia, salud, ubicación ni vida personal.
Retorna un objeto JSON con el siguiente formato exacto:
{
  "titulo": "Título corto del tema principal (ej: Suma de fracciones)",
  "resumen": "1 a 3 frases en tercera persona: qué se trabajó, dónde se quedó, qué reforzar.",
  "temasTrabajados": [
    { "tema": "nombre corto del tema en minúsculas (ej: fracciones)", "materia": "${materiaSesion}", "resultado": "avanzo | le_costo | supero", "fraseDelNino": "frase TEXTUAL del niño sobre ese tema si dijo algo revelador, si no omítela" }
  ],
  "recuerdos": [
    { "tipo": "gusto | dificultad | logro | emocional", "texto": "observación breve con las palabras del niño si las hay (ej: dijo 'las fracciones se me hacen difíciles')", "tema": "tema relacionado o omitir" }
  ]
}
Incluye 1 a 3 temasTrabajados (solo los realmente tocados) y 0 a 2 recuerdos (solo si hubo algo memorable).`;

    const defaultResp = {
      titulo: `Sesión de ${body.materia ? (MATERIAS.find(m => m.id === body.materia)?.label ?? body.materia) : "estudio"}`,
      resumen: "Se realizó una sesión de tutoría y repaso de materias.",
      notasNino: body.acuerdo?.notasNino || "",
      temasTrabajados: [],
      recuerdos: [],
    };

    if (tieneClave()) {
      try {
        // C3. Enrutado de modelos: modelo barato (lite) para resúmenes
        const cruda = await generar({
          sistema: sistemaPrompt,
          usuario: `Conversación de estudio:\n${historialText}`,
          maxTokens: 520,
          json: true,
          model: MODELO_LITE,
        });

        const parsed = JSON.parse(cruda);

        // saneo: solo resultados válidos y materia conocida
        const temasTrabajados = (Array.isArray(parsed.temasTrabajados) ? parsed.temasTrabajados : [])
          .filter(
            (t: { tema?: string; resultado?: string }) =>
              t?.tema && ["avanzo", "le_costo", "supero"].includes(t.resultado || "")
          )
          .map((t: { tema: string; materia?: string; resultado: string; fraseDelNino?: string }) => ({
            tema: String(t.tema).toLowerCase().trim(),
            materia: MATERIAS.some((m) => m.id === t.materia) ? t.materia : materiaSesion,
            resultado: t.resultado,
            fraseDelNino: t.fraseDelNino ? String(t.fraseDelNino).slice(0, 140) : undefined,
          }));

        const recuerdos = (Array.isArray(parsed.recuerdos) ? parsed.recuerdos : [])
          .filter(
            (r: { tipo?: string; texto?: string }) =>
              r?.texto && ["gusto", "dificultad", "logro", "emocional"].includes(r.tipo || "")
          )
          .map((r: { tipo: string; texto: string; tema?: string }) => ({
            tipo: r.tipo,
            texto: String(r.texto).slice(0, 180),
            tema: r.tema ? String(r.tema).toLowerCase().trim() : undefined,
          }));

        return NextResponse.json({
          titulo: parsed.titulo || defaultResp.titulo,
          resumen: parsed.resumen || defaultResp.resumen,
          // notasNino se conserva tal cual (legado, sin truncados destructivos)
          notasNino: body.acuerdo?.notasNino || "",
          temasTrabajados,
          recuerdos,
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

  // Lección de etapa: el niño tocó una etapa del camino → foco en ese tema.
  if (body.temaFoco?.trim()) {
    sistema +=
      `\nFOCO DE HOY: el niño eligió la etapa "${body.temaFoco.trim()}" de su camino. ` +
      "Centra la lección en ese tema: explícalo paso a paso con ejemplos cercanos, " +
      "proponle mini-desafíos mentales y, cuando lo notes listo, anímalo a rendir " +
      "la prueba de la etapa desde su camino. No cambies de tema salvo que él lo pida.";
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

      const { texto: sinHorario, horario } = separarHorario(cruda, body.materias || []);
      // extrae el marcador <<EJERCICIO:tema>> si Rai lanzó un ejercicio
      const { texto, ejercicioTema } = separarEjercicio(sinHorario);

      // C2. Guardar respuesta en la tabla caché si corresponde (sin marcadores).
      // No cacheamos respuestas con ejercicio: el ejercicio es dinámico.
      if (
        accion === "chat" &&
        !ejercicioTema &&
        preguntaNormalizada.length > 5 &&
        body.materia &&
        body.curso &&
        texto
      ) {
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
        ejercicioTema, // presente si Rai lanzó un ejercicio (opción múltiple)
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

// Extrae el marcador <<EJERCICIO:tema>> del mensaje de Rai. Devuelve el texto
// limpio y el tema del ejercicio (si lo hubo), para que el front lo pida.
function separarEjercicio(cruda: string): {
  texto: string;
  ejercicioTema?: string;
} {
  // acepta <<EJERCICIO:tema>> (también tolera un :sufijo antiguo y lo ignora)
  const m = cruda.match(/<<EJERCICIO:([a-zñáéíóú_ ]+?)(?::[a-z_]+)?>>/i);
  if (!m) return { texto: cruda.trim() };
  const texto = cruda.replace(m[0], "").trim();
  const tema = m[1].trim().toLowerCase().replace(/\s+/g, "_");
  return { texto, ejercicioTema: tema || undefined };
}

function separarHorario(
  cruda: string,
  materias: Materia[]
): { texto: string; horario?: Partial<Record<Dia, Materia[]>> } {
  const m = cruda.match(/<<HORARIO>>([\s\S]*?)<<FIN>>/);
  if (!m) return { texto: cruda.trim() };

  const texto = cruda.replace(m[0], "").trim();
  const validas = new Set(materias);
  const diasValidos: Dia[] = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
  try {
    const crudo = JSON.parse(m[1].trim()) as Record<string, unknown>;
    // el objeto de días puede venir anidado en "dias" (formato nuevo) o plano
    // (formato viejo {lun:[...]}) — soportamos ambos.
    const fuenteDias = (crudo.dias && typeof crudo.dias === "object"
      ? crudo.dias
      : crudo) as Record<string, unknown>;

    const horario: Partial<Record<Dia, Materia[]>> = {};
    for (const d of diasValidos) {
      const arr = fuenteDias[d];
      if (Array.isArray(arr)) {
        const limpio = arr.filter(
          (x): x is Materia => typeof x === "string" && validas.has(x as Materia)
        );
        if (limpio.length) horario[d] = limpio;
      }
    }

    // Si no hubo días pero sí un reparto de HORAS por materia, derivamos un
    // horario repartiendo los ramos en días de la semana según sus horas.
    const tieneDias = Object.keys(horario).length > 0;
    if (!tieneDias && crudo.horas && typeof crudo.horas === "object") {
      const horas = crudo.horas as Record<string, unknown>;
      const derivado = horarioDesdeHoras(horas, validas, diasValidos);
      if (Object.keys(derivado).length) return { texto, horario: derivado };
    }

    return { texto, horario: tieneDias ? horario : undefined };
  } catch {
    return { texto };
  }
}

// Reparte materias en días de la semana (lun→vie primero) según sus horas
// acordadas: 1 bloque de estudio = 1 día. Da una base editable; el niño puede
// ajustarla después. Ej: {matematica:3, ciencias:3, lenguaje:2} → 8 bloques.
function horarioDesdeHoras(
  horas: Record<string, unknown>,
  validas: Set<Materia>,
  dias: Dia[]
): Partial<Record<Dia, Materia[]>> {
  // lista de bloques (una entrada por hora de cada materia)
  const bloques: Materia[] = [];
  for (const [k, v] of Object.entries(horas)) {
    if (!validas.has(k as Materia)) continue;
    const n = Math.max(0, Math.min(7, Math.round(Number(v) || 0)));
    for (let i = 0; i < n; i++) bloques.push(k as Materia);
  }
  if (bloques.length === 0) return {};
  // repartir de a uno por día de lun a dom, dando la vuelta si hay más de 7
  const horario: Partial<Record<Dia, Materia[]>> = {};
  bloques.forEach((mat, i) => {
    const dia = dias[i % dias.length];
    (horario[dia] ??= []).push(mat);
  });
  return horario;
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
