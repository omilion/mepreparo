// API del tutor — el "middle". Arma un prompt CORTO según el momento de la
// tutoría (primera charla, saludo del día, o pregunta puntual), recupera
// contexto del currículum (RAG) y llama a Gemini. Si no hay clave o Gemini
// falla, responde en modo simulado (la app no se cae).
//
// La clave de Gemini vive solo aquí (servidor), nunca llega al navegador.

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { verifyStudentToken } from "@/lib/auth-student";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable } from "@/lib/db/schema";
import { chequearLimite } from "@/lib/rateLimit";
import { registrarEventoAsync } from "@/lib/telemetria";
import {
  TUTOR,
  sistemaPrimeraCharla,
  sistemaSesion,
  instruccionExtraerHorario,
  fechaHoraLegible,
} from "@/lib/tutor/personaje";
import { generarConUso, tieneClave, MODELO_CHAT, MODELO_LITE } from "@/lib/tutor/gemini";
import { normalizarIconosInline } from "@/lib/tutor/iconos";
import { recuperar } from "@/lib/tutor/rag";
import { rutaDeTemas, tituloDeTema } from "@/lib/plan/etapas";
import { emparejarConRuta, pareceEnunciado } from "@/lib/plan/claveTema";
import { MATERIAS, type Curso, type Materia } from "@/lib/profile";
import { evaluarPreparacion, type AcuerdoTutoria, type Dia } from "@/lib/tutor/acuerdo";

export const runtime = "nodejs"; // necesitamos fs para leer los chunks

const ACCIONES_VALIDAS = new Set(["saludo", "chat", "cerrar"]);
const MATERIAS_VALIDAS = new Set(MATERIAS.map((m) => m.id));
const MAX_HISTORIAL = 24;
const MAX_TEXTO_TURNO = 1_200;

type Turno = { de: "rai" | "nino"; texto: string };

interface Body {
  // "saludo" = Rai inicia (sin pregunta). "chat" = responde al niño. "cerrar" = resume la tutoría.
  accion: "saludo" | "chat" | "cerrar";
  // solo para telemetría de fallos: a qué niño le pasó (nunca su nombre)
  pupiloId?: string;
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
  // true cuando la sesión se acerca a su fin: Rai debe empezar a despedirse
  cerrandoSesion?: boolean;
}

function textoLimitado(valor: unknown, max: number): string {
  return typeof valor === "string" ? valor.trim().slice(0, max) : "";
}

// El contenido de la conversación es necesariamente libre, pero su forma y
// tamaño no. Esto evita prompts desmedidos o cuerpos malformados antes de
// llegar a Gemini.
function normalizarBody(crudo: unknown): Body | null {
  if (!crudo || typeof crudo !== "object") return null;
  const b = crudo as Record<string, unknown>;
  const accion = typeof b.accion === "string" ? b.accion : "chat";
  if (!ACCIONES_VALIDAS.has(accion)) return null;

  const historial = Array.isArray(b.historial)
    ? b.historial.slice(-MAX_HISTORIAL).flatMap((turno) => {
        if (!turno || typeof turno !== "object") return [];
        const t = turno as Record<string, unknown>;
        const de = t.de === "rai" || t.de === "nino" ? t.de : null;
        const texto = textoLimitado(t.texto, MAX_TEXTO_TURNO);
        return de && texto ? [{ de, texto }] : [];
      })
    : [];
  const materias = Array.isArray(b.materias)
    ? b.materias.filter((m): m is Materia => typeof m === "string" && MATERIAS_VALIDAS.has(m as Materia))
    : [];
  const materiasHoy = Array.isArray(b.materiasHoy)
    ? b.materiasHoy.filter((m): m is Materia => typeof m === "string" && MATERIAS_VALIDAS.has(m as Materia))
    : [];
  const materia = typeof b.materia === "string" && MATERIAS_VALIDAS.has(b.materia as Materia)
    ? b.materia as Materia
    : undefined;

  return {
    ...b,
    accion: accion as Body["accion"],
    pupiloId: textoLimitado(b.pupiloId, 120) || undefined,
    resumenPerfil: textoLimitado(b.resumenPerfil, 3_000),
    materias,
    materiasHoy,
    materia,
    curso: textoLimitado(b.curso, 24) as Curso,
    nombre: textoLimitado(b.nombre, 60) || undefined,
    pregunta: textoLimitado(b.pregunta, MAX_TEXTO_TURNO) || undefined,
    historial,
    temaFoco: textoLimitado(b.temaFoco, 120) || undefined,
    cerrandoSesion: b.cerrandoSesion === true,
  } as Body;
}

async function autorizarTutor(req: NextRequest, pupiloId: string | undefined): Promise<NextResponse | null> {
  if (!pupiloId) return NextResponse.json({ error: "Falta el pupilo" }, { status: 400 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const suyo = await db
      .select({ id: pupilosTable.id })
      .from(pupilosTable)
      .where(and(eq(pupilosTable.id, pupiloId), eq(pupilosTable.cuentaId, session.user.id)))
      .limit(1);
    return suyo.length ? null : NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? verifyStudentToken(authHeader.slice(7)) : null;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return token.pupiloId === pupiloId
    ? null
    : NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "tutor", max: 30, ventanaMs: 60_000 });
  if (limite) return limite;

  let body: Body;
  try {
    body = normalizarBody(await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

  const denegado = await autorizarTutor(req, body.pupiloId);
  if (denegado) return denegado;

  const esPrimera = !body.acuerdo;
  const accion = body.accion ?? "chat";

  // --- ACCIÓN: CERRAR (RESUMEN DE SESIÓN) ---
  if (accion === "cerrar") {
    const historialText = (body.historial || [])
      .map((t) => `${t.de === "rai" ? "Rai" : "Niño"}: ${t.texto}`)
      .join("\n");

    const materiaSesion = body.materia || "matematica";
    // Las claves REALES del camino de este niño. Se le dan a la IA para que
    // elija de ahí (el lever más fuerte) y además se usan para emparejar lo
    // que devuelva: sin esto se guardaban temas fantasma que el mapa no lee.
    const rutaDelNino = body.curso
      ? rutaDeTemas(materiaSesion as Materia, body.curso, body.acuerdo ?? null)
      : [];
    const listaTemas = rutaDelNino.length
      ? `\nCLAVES DE TEMA VÁLIDAS (usa EXACTAMENTE una de estas si el tema trabajado corresponde a alguna; si de verdad fue otro tema, escríbelo en minúsculas y con guion bajo): ${JSON.stringify(rutaDelNino)}`
      : "";

    const sistemaPrompt = `Eres un asistente del currículum escolar. Se te proporciona una conversación entre el tutor de estudio "Rai" y un niño.
Debes generar un resumen de la sesión y extraer la MEMORIA pedagógica del niño.
REGLA DE PRIVACIDAD ESTRICTA: las frases del niño que registres deben ser SOLO sobre el estudio (qué le cuesta, qué le gusta aprender, cómo se sintió estudiando). NUNCA registres datos de familia, salud, ubicación ni vida personal.
Retorna un objeto JSON con el siguiente formato exacto:
{
  "titulo": "Título corto del tema principal (ej: Suma de fracciones)",
  "resumen": "1 a 3 frases en tercera persona: qué se trabajó, dónde se quedó, qué reforzar.",
  "temasTrabajados": [
    { "tema": "clave del tema en minúsculas (ej: fracciones)", "materia": "${materiaSesion}", "resultado": "avanzo | le_costo | supero", "fraseDelNino": "frase TEXTUAL del niño sobre ese tema si dijo algo revelador, si no omítela" }
  ],
  "recuerdos": [
    { "tipo": "gusto | dificultad | logro | emocional", "texto": "observación breve con las palabras del niño si las hay (ej: dijo 'las fracciones se me hacen difíciles')", "tema": "tema relacionado o omitir" }
  ]
}
El "tema" es el CONCEPTO estudiado, NUNCA el enunciado de una actividad: "fracciones", no "une cada fracción con su dibujo".${listaTemas}
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
        const { texto: cruda, tokensIn, tokensOut } = await generarConUso({
          sistema: sistemaPrompt,
          usuario: `Conversación de estudio:\n${historialText}`,
          maxTokens: 520,
          json: true,
          model: MODELO_LITE,
        });
        registrarEventoAsync({
          tipo: "sesion_costo",
          origen: "servidor",
          pupiloId: body.pupiloId,
          materia: materiaSesion,
          meta: { tokensIn, tokensOut, modelo: MODELO_LITE },
        });

        const parsed = JSON.parse(cruda);

        // saneo: resultado válido, materia conocida, y la clave del tema
        // emparejada con el camino real del niño. Se descartan los enunciados
        // de actividad, que es lo que venía ensuciando la memoria.
        const temasTrabajados = (Array.isArray(parsed.temasTrabajados) ? parsed.temasTrabajados : [])
          .filter(
            (t: { tema?: string; resultado?: string }) =>
              t?.tema &&
              ["avanzo", "le_costo", "supero"].includes(t.resultado || "") &&
              !pareceEnunciado(String(t.tema))
          )
          .map((t: { tema: string; materia?: string; resultado: string; fraseDelNino?: string }) => ({
            tema: emparejarConRuta(String(t.tema), rutaDelNino),
            materia: MATERIAS.some((m) => m.id === t.materia) ? t.materia : materiaSesion,
            resultado: t.resultado,
            fraseDelNino: t.fraseDelNino ? String(t.fraseDelNino).slice(0, 140) : undefined,
          }))
          .filter((t: { tema: string }) => !!t.tema);

        const recuerdos = (Array.isArray(parsed.recuerdos) ? parsed.recuerdos : [])
          .filter(
            (r: { tipo?: string; texto?: string }) =>
              r?.texto && ["gusto", "dificultad", "logro", "emocional"].includes(r.tipo || "")
          )
          .map((r: { tipo: string; texto: string; tema?: string }) => ({
            tipo: r.tipo,
            texto: String(r.texto).slice(0, 180),
            // el recuerdo se ata al mismo tema canónico, si no se pierde el
            // vínculo con la etapa (memoriaParaHoy filtra por esta clave)
            tema: r.tema ? emparejarConRuta(String(r.tema), rutaDelNino) || undefined : undefined,
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

  // --- POR QUÉ AQUÍ NO HAY CACHÉ DE RESPUESTAS ---
  //
  // Hubo una: guardaba el texto de Rai con la llave
  // (pregunta normalizada + materia + curso) y lo reutilizaba entre niños.
  // Se quitó porque esa llave no incluye AL NIÑO, y el texto guardado sí lo
  // incluye a él. En una prueba real, 20 de 30 turnos de una clase salieron de
  // ahí, y la tabla tenía respuestas como "¡Qué entretenido, Emilia! A mí
  // también me gusta la música" listas para servírsele a cualquier otro niño de
  // 5º básico que escribiera algo parecido.
  //
  // Tres daños a la vez: filtraba el nombre y los gustos de una familia a otra;
  // rompía la continuidad (un "no entiendo" del ciclo del agua respondido con
  // lo que se le dijo a otro sobre las células); y saltaba el prompt, así que la
  // respuesta no llevaba ni la memoria del niño ni la traza de la actividad.
  //
  // NO REVIVIR sobre la respuesta cruda. Lo caro y reutilizable de verdad son
  // los interactivos, y para eso ya está `contenido_validado`, que sí es
  // impersonal. Una conversación con un tutor que dice tu nombre y se acuerda
  // de tu perro no es reutilizable por definición.

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
      fechaHoraLegible(),
      body.materia,
      body.temaFoco?.trim()
    );
  }

  // Lección de etapa: el niño tocó una etapa del camino → foco en ese tema.
  if (body.temaFoco?.trim()) {
    sistema +=
      `\nFOCO DE HOY: el niño eligió la etapa "${body.temaFoco.trim()}" de su camino. ` +
      "Centra la lección en ese tema. Como un buen tutor, sigue este orden: " +
      "(1) PRIMERO una INTRODUCCIÓN al tema MACRO: en 1-2 frases dile de qué se " +
      "trata en general, para qué sirve o por qué es interesante, con un ejemplo " +
      "cercano — dale el panorama antes del detalle. (2) LUEGO desglosa el tema en " +
      "sus partes y trabájalas UNA a la vez, comprobando que entendió antes de " +
      "pasar a la siguiente. Intercala preguntas y alguna actividad como dulce. " +
      "(3) Cuando lo notes listo, anímalo a rendir la prueba de la etapa desde su " +
      "camino. No cambies de tema salvo que él lo pida. Empieza SIEMPRE por la " +
      "introducción macro, nunca saltes directo a un subtema.";
  }

  // CIERRE NATURAL: la sesión se acerca a su fin. Rai NO corta en seco: redondea
  // con calma, felicita por el trabajo, resume en una frase qué avanzaron hoy y se
  // despide con cariño invitando a volver. NO abre temas nuevos ni lanza más
  // actividades (nada de marcadores <<...>>).
  if (body.cerrandoSesion) {
    sistema +=
      "\n\nIMPORTANTE — ESTAMOS CERRANDO LA SESIÓN DE HOY: ya trabajaron bastante " +
      "y es hora de terminar con calma. En tus próximos mensajes ve redondeando: " +
      "termina la idea en la que están, felicítalo por su esfuerzo, recuérdale en " +
      "una frase qué lograron hoy y despídete con cariño invitándolo a volver la " +
      "próxima. NO empieces temas nuevos ni lances actividades ni ejercicios " +
      "(ningún marcador). Si te hace una pregunta corta, respóndela breve y vuelve " +
      "a cerrar. Mantén el tono cálido y sereno.";
  }

  // --- RAG: el currículum a la vista mientras Rai enseña ---
  //
  // La consulta se arma del TEMA, no del texto literal del niño. En una clase
  // real la mayoría de los turnos son "sí", "ya", "no sé": esos vaciaban la
  // consulta (terminos() descarta palabras cortas y vacías) y el RAG devolvía
  // nada, así que Rai enseñaba sin currículum casi todo el tiempo. El tema del
  // foco es lo estable de la conversación; la pregunta del niño solo matiza.
  //
  // También corre en el SALUDO cuando hay tema: es el mensaje que abre la
  // lección con la introducción macro, justo el que más necesita apoyo.
  let fuentes: string[] = [];
  let contexto = "";
  const temaRag = body.temaFoco?.trim();
  const haceFaltaRag =
    !!body.materia && (accion === "chat" || (accion === "saludo" && !!temaRag));

  if (haceFaltaRag) {
    const consulta = [
      temaRag ? tituloDeTema(temaRag) : "",
      MATERIAS.find((m) => m.id === body.materia)?.label ?? body.materia,
      body.curso ?? "",
      accion === "chat" ? (body.pregunta ?? "").trim() : "",
    ]
      .filter(Boolean)
      .join(" ");

    const fragmentos = await recuperar(consulta, {
      materia: body.materia,
      curso: body.curso,
      // el saludo es breve por diseño: menos contexto para no volverlo denso
      k: accion === "saludo" ? 2 : 3,
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
    const inicioIA = Date.now();
    try {
      // C3. Enrutado de modelos:
      // - Saludos o primera charla: modelo barato (lite)
      // - Respuestas de chat con RAG y explicaciones: modelo completo
      const modeloElegido = (accion === "saludo" || esPrimera)
        ? MODELO_LITE
        : MODELO_CHAT;

      const { texto: cruda, tokensIn, tokensOut } = await generarConUso({
        sistema,
        usuario,
        // Enseñar necesita más espacio que saludar: antes era al revés (560 en
        // sesión) y cortaba las explicaciones a media frase. El saludo/primera
        // charla es breve por diseño, así que le basta menos.
        maxTokens: esPrimera ? 700 : 1000,
        model: modeloElegido,
      });
      registrarEventoAsync({
        tipo: "sesion_costo",
        origen: "servidor",
        pupiloId: body.pupiloId,
        materia: body.materia,
        meta: { tokensIn, tokensOut, modelo: modeloElegido },
      });

      const msIA = Date.now() - inicioIA;
      // Solo registramos las respuestas LENTAS: un niño esperando 10 segundos
      // frente a una esfera es el fallo, no el promedio.
      if (msIA > 8000) {
        registrarEventoAsync({
          tipo: "tutor_latencia",
          origen: "servidor",
          pupiloId: body.pupiloId,
          materia: body.materia,
          meta: { ms: msIA, accion },
        });
      }

      const { texto: sinHorario, horario } = separarHorario(cruda, body.materias || []);
      // extrae los marcadores <<EJERCICIO/SELECCION/SOPA/RUEDA/INTRUSO:tema>> de Rai
      const {
        texto,
        ejercicioTema,
        ejercicioFormato,
        ofrecerPrueba,
        sopaTema,
        ruedaTema,
        intrusoTema,
        conectorTema,
        clasificadorTema,
        secuenciaTema,
        flashcardsTema,
        actividadMateria,
      } = separarEjercicio(sinHorario);

      // Repara los iconos que Gemini a veces escribe como "[pizza]" en vez de
      // "[icono:pizza]" (si no, se ven como texto literal en el chat).
      const textoFinal = normalizarIconosInline(texto);

      // Rai puede EQUIVOCARSE de criterio (o el prompt puede fallar) y ofrecer
      // <<PRUEBA>> sin que haya práctica real detrás — el botón del mapa usa
      // esta MISMA función, así que si el código no está de acuerdo, no se
      // muestra, sin importar lo que haya escrito el modelo.
      const pruebaHabilitada =
        ofrecerPrueba &&
        !!body.materia &&
        !!body.temaFoco?.trim() &&
        evaluarPreparacion(body.acuerdo ?? null, body.materia, body.temaFoco.trim()) === "lista_para_prueba";

      return NextResponse.json({
        respuesta: textoFinal,
        fuentes,
        horario,
        ejercicioTema, // presente si Rai lanzó un ejercicio
        ejercicioFormato, // "opcion_multiple" | "seleccion_multiple"
        sopaTema, // presente si Rai lanzó una sopa de letras
        ruedaTema, // presente si Rai lanzó una rueda de letras
        intrusoTema, // presente si Rai lanzó "el intruso"
        conectorTema, // presente si Rai lanzó "el conector"
        clasificadorTema, // presente si Rai lanzó "el clasificador"
        secuenciaTema, // presente si Rai lanzó una secuencia
        flashcardsTema, // presente si Rai lanzó flashcards
        actividadMateria, // materia del interactivo, si Rai la especificó
        ofrecerPrueba: pruebaHabilitada, // mostrar el botón para ir directo a la prueba de la etapa
        modo: "gemini",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      console.error("Tutor Gemini falló:", msg);
      // El niño ve una respuesta de demostración y sigue; nosotros necesitamos
      // saber cuántas veces pasa y en qué materia.
      registrarEventoAsync({
        tipo: "tutor_ia_fallo",
        origen: "servidor",
        pupiloId: body.pupiloId,
        materia: body.materia,
        meta: { accion, ms: Date.now() - inicioIA, primera: esPrimera },
      });
      return NextResponse.json({
        respuesta: simulada(accion, esPrimera, body.nombre, body.pregunta),
        fuentes,
        modo: "simulado",
        aviso: "No se pudo contactar a Gemini; respuesta de demostración.",
      });
    }
  }

  // Sin API key la app igual responde, pero NO está enseñando de verdad. Si
  // esto aparece en producción es una alarma, no una curiosidad.
  registrarEventoAsync({
    tipo: "tutor_modo_simulado",
    origen: "servidor",
    pupiloId: body.pupiloId,
    materia: body.materia,
    meta: { accion },
  });

  return NextResponse.json({
    respuesta: simulada(accion, esPrimera, body.nombre, body.pregunta),
    fuentes,
    modo: "simulado",
  });
}

// Extrae el marcador <<EJERCICIO:tema>> del mensaje de Rai. Devuelve el texto
// limpio y el tema del ejercicio (si lo hubo), para que el front lo pida.
const MATERIAS_IDS = ["matematica", "lenguaje", "ciencias", "historia", "ingles"];

function separarEjercicio(cruda: string): {
  texto: string;
  ejercicioTema?: string;
  ejercicioFormato?: string; // "opcion_multiple" | "seleccion_multiple"
  sopaTema?: string;
  ruedaTema?: string;
  intrusoTema?: string;
  conectorTema?: string;
  clasificadorTema?: string;
  secuenciaTema?: string;
  flashcardsTema?: string;
  // materia de la actividad que Rai lanzó (si la incluyó en el marcador). Así el
  // interactivo se genera en la materia que Rai ENSEÑA, no en la agendada del día.
  actividadMateria?: string;
  // el niño dijo que quiere rendir la prueba y Rai lo aprueba
  ofrecerPrueba?: boolean;
} {
  let texto = cruda;
  let actividadMateria: string | undefined;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "_") || undefined;

  // Extrae <<TIPO:tema>> o <<TIPO:materia:tema>> (materia opcional, validada). Si
  // trae materia, la guarda en actividadMateria. Devuelve el tema normalizado.
  function sacar(tipo: string): string | undefined {
    const re = new RegExp(`<<${tipo}:([a-zñáéíóú_ :]+?)>>`, "i");
    const m = texto.match(re);
    if (!m) return undefined;
    texto = texto.replace(m[0], "");
    const partes = m[1].split(":").map((s) => s.trim()).filter(Boolean);
    if (partes.length >= 2 && MATERIAS_IDS.includes(partes[0].toLowerCase())) {
      actividadMateria = partes[0].toLowerCase();
      return norm(partes.slice(1).join(" "));
    }
    return norm(partes.join(" "));
  }

  // <<PRUEBA>> no lleva tema: la prueba es siempre la de la etapa en curso.
  // Sale del uso real: la niña le decía a Rai "voy a dar la prueba" y no tenía
  // por dónde ir, así que salía por el botón de inicio y perdía el hilo.
  let ofrecerPrueba = false;
  const mPrueba = texto.match(/<<PRUEBA>>/i);
  if (mPrueba) {
    texto = texto.replace(mPrueba[0], "");
    ofrecerPrueba = true;
  }

  const sopaTema = sacar("SOPA");
  const ruedaTema = sacar("RUEDA");
  const intrusoTema = sacar("INTRUSO");
  const conectorTema = sacar("CONECTOR");
  const clasificadorTema = sacar("CLASIFICADOR");
  const secuenciaTema = sacar("SECUENCIA");
  const flashcardsTema = sacar("FLASHCARDS");

  // Ejercicio: selección múltiple tiene prioridad sobre opción múltiple.
  let ejercicioTema = sacar("SELECCION");
  let ejercicioFormato = ejercicioTema ? "seleccion_multiple" : undefined;
  if (!ejercicioTema) {
    ejercicioTema = sacar("EJERCICIO");
    if (ejercicioTema) ejercicioFormato = "opcion_multiple";
  }

  return {
    texto: texto.trim(),
    ejercicioTema,
    ejercicioFormato,
    sopaTema,
    ruedaTema,
    intrusoTema,
    conectorTema,
    clasificadorTema,
    secuenciaTema,
    flashcardsTema,
    actividadMateria,
    ofrecerPrueba,
  };
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
