"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import { type PerfilNino } from "@/lib/profile";
import { TUTOR } from "@/lib/tutor/personaje";
import { resumenPerfil } from "@/lib/tutor/resumenPerfil";
import {
  materiasDeHoy,
  diaDeHoy,
  aplicarCierre,
  sembrarTemasDesdeDiagnostico,
  registrarEjercicios,
  recordarContenidos,
  temasSuperadosNuevos,
  type AcuerdoTutoria,
  type TemaTrabajado,
  type RecuerdoNino,
} from "@/lib/tutor/acuerdo";
import { notificarLogros } from "@/lib/logros";
import { AuraOrb } from "./AuraOrb";
import { useExpresionRai } from "@/lib/tutor/useExpresionRai";
import { TextoRevelado } from "./TextoRevelado";
import { HomeButton } from "./HomeButton";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";
import { SopaLetras, type DatosSopa } from "./SopaLetras";
import { RuedaLetras, type DatosRueda } from "./RuedaLetras";
import { Intruso, type DatosIntruso } from "./Intruso";
import { Conector, type DatosConector } from "./Conector";
import { Clasificador, type DatosClasificador } from "./Clasificador";
import { Secuencia, type DatosSecuencia } from "./Secuencia";
import { Flashcards, type DatosFlashcards } from "./Flashcards";
import { Fireworks } from "./Fireworks";
import { tocarLira } from "@/lib/audio/liraUI";
import { devToolsActivas } from "@/lib/devTools";
import { useApp } from "@/lib/app/AppProvider";
import { avisarEvento } from "@/lib/telemetriaCliente";

// Rai necesita la API en vivo: sin internet no hay forma honesta de
// "conversar offline" (Fase 5.1). Un mensaje genérico de error confunde —
// mejor decir la verdad y dirigir a lo que SÍ funciona sin conexión (los
// juegos ya cargados).
function mensajeConexion(generico: string): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Ahora no tienes internet, así que no puedo conversar contigo. Mientras vuelve la conexión, puedes repasar los juegos que ya cargaste.";
  }
  return generico;
}

interface EjercicioChat {
  tema: string;
  enunciado: string;
  opciones: string[];
  respuestaFinal: string; // opción múltiple: la única correcta
  // selección múltiple: todas las correctas (>1). Si viene, la tarjeta cambia a
  // modo multi (el niño marca varias y confirma; se valida el conjunto exacto).
  respuestasCorrectas?: string[];
  respondido?: "ok" | "no";
  tipoPlantilla?: string; // "opcion_multiple" | "seleccion_multiple"
}

interface Mensaje {
  de: "rai" | "nino";
  texto: string;
  fuentes?: string[];
  modo?: "gemini" | "simulado";
  // si Rai lanzó un ejercicio en este turno, va embebido bajo su texto
  ejercicio?: EjercicioChat;
  // si Rai lanzó una sopa de letras, va embebida bajo su texto
  sopa?: DatosSopa;
  // si Rai lanzó una rueda de letras (formar la respuesta), va embebida
  rueda?: DatosRueda;
  // si Rai lanzó "el intruso" (tocar el que no encaja), va embebido
  intruso?: DatosIntruso;
  // si Rai lanzó "el conector" (unir columnas con líneas), va embebido
  conector?: DatosConector;
  // si Rai lanzó "el clasificador" (arrastrar a grupos), va embebido
  clasificador?: DatosClasificador;
  // si Rai lanzó "secuencia" (ordenar pasos)
  secuencia?: DatosSecuencia;
  // si Rai lanzó "flashcards" (fichas de estudio)
  flashcards?: DatosFlashcards;
  // el niño ya terminó la actividad de este turno (los ejercicios además guardan
  // si acertó en `ejercicio.respondido`)
  resuelto?: boolean;
}

// Qué tipo de actividad venía anunciada en la respuesta de Rai. Se usa solo
// para la telemetría de fallos: una etiqueta corta, nunca el tema que escribió
// el niño.
function marcadorDeActividad(data: Record<string, unknown>): string | null {
  const tipos: [string, unknown][] = [
    ["ejercicio", data.ejercicioTema],
    ["sopa", data.sopaTema],
    ["rueda", data.ruedaTema],
    ["intruso", data.intrusoTema],
    ["conector", data.conectorTema],
    ["clasificador", data.clasificadorTema],
    ["secuencia", data.secuenciaTema],
    ["flashcards", data.flashcardsTema],
  ];
  return tipos.find(([, tema]) => !!tema)?.[0] ?? null;
}

export function Tutor({
  perfil,
  onVolver,
  onGuardarPerfil,
  onHorarioCreado,
  temaFoco,
}: {
  perfil: PerfilNino;
  onVolver: () => void;
  // PERSISTE cambios del perfil SIN navegar (evidencia de interactivos, cierre de
  // sesión). No debe sacar al niño de la clase.
  onGuardarPerfil?: (p: PerfilNino) => void;
  // Solo la PRIMERA vez, cuando se acuerda el horario: persiste y pasa a "mundos".
  onHorarioCreado?: (p: PerfilNino) => void;
  // si viene del mapa de etapas: la lección se centra en este tema
  temaFoco?: string;
}) {
  const { setAccionesDevTutor } = useApp();
  const nombre = perfil.nombre.trim() || "tú";
  const acuerdo = perfil.tutoria ?? null;
  const esPrimera = !acuerdo;

  // materia activa (para el color de la esfera y el RAG): la que toca hoy según
  // el horario; si hoy no hay, la primera del examen. Rai la maneja, no el niño.
  const materiasHoy = acuerdo ? materiasDeHoy(acuerdo) : [];
  const materia = materiasHoy[0] ?? perfil.examen.materias[0];
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(false);
  // la esfera empieza grande y centrada; tras la 1ª respuesta del niño sube a
  // la esquina para dar espacio a la conversación (transición fluida).
  const [compacta, setCompacta] = useState(false);
  const [sesionTerminada, setSesionTerminada] = useState(false);
  // Lo que EXPRESA la esfera. Dos capas (ver useExpresionRai):
  //  · `reaccion` — puntual: asiente, celebra, anima, tiene una idea.
  //  · `faseBase` — de fondo: qué está haciendo Rai en la conversación.
  const { reaccion, reaccionar } = useExpresionRai();
  const [faseBase, setFaseBase] = useState<
    "reposo" | "hablando" | "duda" | "escuchando"
  >("reposo");
  // Contenidos que el niño YA vio en esta sesión. Se mandan a los generadores
  // para que no le devuelvan lo mismo: la biblioteca cachea un interactivo por
  // tema, así que sin esto el segundo juego del mismo tema salía idéntico.
  // Arranca con lo que este niño ya vio en clases ANTERIORES (viene en su
  // perfil y viaja con el sync). Antes esto nacía vacío en cada clase y a la
  // semana siguiente la biblioteca le devolvía el mismo juego.
  const vistos = useRef<Set<string>>(new Set(acuerdo?.contenidosVistos ?? []));
  // El acuerdo más reciente. `perfil` viene por props y se congela en cada
  // render: dos guardados seguidos en la misma clase (responder un juego y
  // recibir el siguiente) partían del mismo acuerdo viejo y el segundo pisaba
  // al primero. Perder evidencia que la niña ya ganó es lo peor que puede pasar.
  const acuerdoVivo = useRef<AcuerdoTutoria | null>(acuerdo);
  useEffect(() => {
    acuerdoVivo.current = perfil.tutoria ?? null;
  }, [perfil.tutoria]);
  // Control de ritmo de las actividades: no dos seguidas, y nunca una encima de
  // otra que el niño todavía no responde.
  const actividadPendiente = useRef(false);
  // Combinaciones tipo+tema ya entregadas y el tipo del último juego. Dos juegos
  // seguidos están bien; lo que no puede pasar es que sean LA MISMA experiencia.
  // Filas distintas no bastan: en una prueba real, dos "secuencia" del ciclo del
  // agua salieron con ids distintos y los mismos cuatro pasos.
  const combinacionesUsadas = useRef<Set<string>>(new Set());
  const ultimoTipo = useRef<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const ultimoRef = useRef<HTMLDivElement>(null);
  const inicioPedido = useRef(false);
  const inicioSesion = useRef(Date.now());

  const scrollAlFinal = useCallback(() => {
    requestAnimationFrame(() =>
      finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    );
  }, []);

  // Los mensajes de Rai pueden ser largos. Si la vista sigue el texto hasta el
  // final, el niño queda mirando la ÚLTIMA línea y tiene que subir a mano para
  // leer desde el principio. Alineamos el INICIO de su mensaje arriba, como
  // abrir un libro; lo que venga debajo (incluido el juego) se lee bajando.
  const mostrarInicioDeRai = useCallback(() => {
    requestAnimationFrame(() =>
      ultimoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }, []);

  useEffect(() => {
    // mientras Rai piensa, abajo (para ver el "está escribiendo"); cuando habla,
    // al principio de lo que dijo; si el último en hablar fue el niño, abajo.
    if (cargando) return scrollAlFinal();
    const ultimo = mensajes[mensajes.length - 1];
    if (ultimo?.de === "rai") mostrarInicioDeRai();
    else scrollAlFinal();
    // `mensajes.length` y no `mensajes`: marcar una actividad como resuelta
    // cambia el arreglo, y eso no debe mover la vista mientras el niño juega.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensajes.length, cargando]);

  // EL FLUJO BASE DE LA ESFERA — se deduce de la conversación, nadie lo agenda:
  //   habla mientras su texto se revela → si terminó preguntando, se ladea un
  //   momento (duda) → y queda escuchando, gruesa y quieta, con la palabra en el
  //   niño. Casi todo el tiempo de una clase Rai vive en estos tres estados.
  useEffect(() => {
    const ultimo = mensajes[mensajes.length - 1];
    if (!ultimo || ultimo.de !== "rai") return;
    // TextoRevelado revela ~1 palabra cada 90ms + 700ms de fundido de la última.
    const palabras = ultimo.texto.trim().split(/\s+/).length;
    const duracion = Math.min(8000, 700 + palabras * 90);
    // Rai casi siempre cierra invitando a participar; si preguntó, la esfera se
    // queda un instante en duda antes de abrirse a escuchar.
    const pregunto = /\?\s*$/.test(ultimo.texto.trim());

    setFaseBase("hablando");
    const t1 = setTimeout(
      () => setFaseBase(pregunto ? "duda" : "escuchando"),
      duracion
    );
    const t2 = pregunto
      ? setTimeout(() => setFaseBase("escuchando"), duracion + 1400)
      : undefined;
    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensajes.length]);

  // Rai INICIA la conversación al entrar (una sola vez): la esfera saluda —
  // se abre, se entibia y lanza un anillo — mientras pide su primer mensaje.
  useEffect(() => {
    if (inicioPedido.current) return;
    inicioPedido.current = true;
    reaccionar(["saludo", 4200]);
    avisarEvento("sesion_iniciada", { pupiloId: perfil.id, materia });
    void saludar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cuerpoBase() {
    return {
      acuerdo,
      resumenPerfil: resumenPerfil(perfil),
      materias: perfil.examen.materias,
      materiasHoy,
      horasSemana: perfil.disponibilidad.horasSemana,
      curso: perfil.curso,
      nombre: perfil.nombre,
      pupiloId: perfil.id, // solo para telemetría de fallos
      temaFoco, // si viene del mapa: la lección se centra en esta etapa
    };
  }

  // Qué actividad llevaba un turno de Rai, en una línea que la IA pueda leer.
  // SIN ESTO el historial que ve Gemini es solo su propio texto: el marcador se
  // le quita antes de guardarlo, así que no queda rastro de que el juego se
  // entregó ni de cómo le fue al niño. Por eso volvía a pedir el MISMO
  // interactivo turno tras turno hasta que se le pasaba.
  function trazaActividad(m: Mensaje): string | null {
    const tipos: [boolean, string][] = [
      [!!m.ejercicio, "un ejercicio"],
      [!!m.sopa, "una sopa de letras"],
      [!!m.rueda, "una rueda de letras"],
      [!!m.intruso, "el intruso"],
      [!!m.conector, "el conector (unir columnas)"],
      [!!m.clasificador, "el clasificador (arrastrar a grupos)"],
      [!!m.secuencia, "una secuencia para ordenar"],
      [!!m.flashcards, "un mazo de fichas"],
    ];
    const hallado = tipos.find(([hay]) => hay);
    if (!hallado) return null;

    const estado =
      m.ejercicio?.respondido === "ok"
        ? "el niño la respondió BIEN"
        : m.ejercicio?.respondido === "no"
          ? "el niño se equivocó"
          : m.resuelto
            ? "el niño la completó"
            : "el niño todavía no la responde";
    return `[YA le entregaste ${hallado[1]} en este turno — ${estado}. No lo repitas.]`;
  }

  function historialPlano(): { de: "rai" | "nino"; texto: string }[] {
    return mensajes.map((m) => {
      const traza = trazaActividad(m);
      return { de: m.de, texto: traza ? `${m.texto}
${traza}` : m.texto };
    });
  }

  // Orden en que se busca un reemplazo cuando el juego pedido repetiría la
  // experiencia. Arriba los más versátiles (sirven para casi cualquier tema).
  const ROTACION = [
    "ejercicio",
    "intruso",
    "conector",
    "clasificador",
    "secuencia",
    "flashcards",
    "rueda",
    "sopa",
  ] as const;

  // QUÉ JUEGO ENTREGAR. Rai propone; acá se decide si eso es repetirle algo.
  // Reglas, en orden:
  //   1. si la actividad anterior sigue sin responder, no se encima otra;
  //   2. dos juegos seguidos SÍ se permiten, pero nunca del mismo tipo;
  //   3. una combinación tipo+tema ya usada en la sesión no se repite;
  //   4. si el pedido choca con 2 o 3, se busca OTRO TIPO para el mismo tema —
  //      un clasificador del ciclo del agua no es lo mismo que una secuencia,
  //      aunque el tema sea idéntico. Solo si no queda ninguno, se suprime.
  function decidirActividad(
    tipoPedido: string | null,
    tema: string | undefined
  ): { tipo: string; cambiado: boolean } | null {
    if (!tipoPedido || !tema) return null;
    if (actividadPendiente.current) return null;

    const sirve = (t: string) =>
      t !== ultimoTipo.current && !combinacionesUsadas.current.has(`${t}:${tema}`);

    if (sirve(tipoPedido)) return { tipo: tipoPedido, cambiado: false };
    const alternativa = ROTACION.find(sirve);
    return alternativa ? { tipo: alternativa, cambiado: true } : null;
  }

  async function saludar() {
    setCargando(true);
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cuerpoBase(), accion: "saludo" }),
      });
      const data = await res.json();
      void agregarRai(data);
      quizasGuardarHorario(data.horario);
    } catch {
      // Sin conexión: Rai no está. Se aleja, pierde el color y se apaga de a
      // poco. No niega — negar sería responderle algo al niño, y aquí no hay
      // nadie respondiendo.
      reaccionar(["ausente", 5000]);
      avisarEvento("tutor_sin_conexion", {
        pupiloId: perfil.id,
        materia,
        meta: { accion: "saludo" },
      });
      setMensajes([
        {
          de: "rai",
          texto: mensajeConexion(
            `Hola ${nombre}, soy ${TUTOR.nombre}. Ahora no pude conectarme, intenta volver en un momento.`
          ),
        },
      ]);
    } finally {
      setCargando(false);
    }
  }

  async function enviar(pregunta: string) {
    if (!pregunta || cargando) return;
    const historial = [...historialPlano(), { de: "nino" as const, texto: pregunta }];
    setMensajes((m) => [...m, { de: "nino", texto: pregunta }]);
    setCargando(true);
    setCompacta(true); // primera (y siguientes) respuestas: esfera a la esquina

    const turnosKid = historial.filter((m) => m.de === "nino").length;
    const duracionMs = Date.now() - inicioSesion.current;
    const duracionMin = duracionMs / 60000;

    // Sesión de ~45 min / 30 turnos (una clase real; en 5 min un niño no aprende).
    // FASE DE CIERRE: cuando se acerca el final, le pedimos a Rai que redondee con
    // naturalidad (sin cortar en seco). Solo si el niño sigue más allá del TOPE
    // DURO cerramos nosotros, como red de seguridad.
    const cerrandose = turnosKid >= 26 || duracionMin >= 40;
    const topeDuro = turnosKid >= 32 || duracionMin >= 48;

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cuerpoBase(),
          accion: "chat",
          materia,
          pregunta,
          historial,
          cerrandoSesion: cerrandose, // Rai empieza a despedirse con calma
        }),
      });
      const data = await res.json();

      if (topeDuro) {
        // Red de seguridad: mostramos la respuesta de Rai (si la despedida ya vino
        // en ella, mejor) y cerramos la sesión.
        void agregarRai(data);
        setSesionTerminada(true);
      } else {
        void agregarRai(data);
        quizasGuardarHorario(data.horario);
      }
    } catch {
      reaccionar(["ausente", 5000]); // se cortó: Rai se aleja y se apaga
      avisarEvento("tutor_sin_conexion", {
        pupiloId: perfil.id,
        materia,
        meta: { accion: "chat" },
      });
      setMensajes((m) => [
        ...m,
        { de: "rai", texto: mensajeConexion("No pude conectarme. Intenta de nuevo en un momento.") },
      ]);
    } finally {
      setCargando(false);
    }
  }

  async function agregarRai(data: {
    respuesta?: string;
    fuentes?: string[];
    modo?: "gemini" | "simulado";
    ejercicioTema?: string;
    ejercicioFormato?: string;
    sopaTema?: string;
    ruedaTema?: string;
    intrusoTema?: string;
    conectorTema?: string;
    clasificadorTema?: string;
    secuenciaTema?: string;
    flashcardsTema?: string;
    actividadMateria?: string;
  }) {
    // Si Rai lanzó una actividad, la resolvemos ANTES de pintar su mensaje y la
    // adjuntamos en el MISMO turno (texto + tarjeta juntos). Así evitamos depender
    // de un índice numérico, que llegaba desfasado. La materia del interactivo es
    // la que Rai ENSEÑA (data.actividadMateria), no la agendada del día.
    const mat = data.actividadMateria || materia;

    // FRENO: si la actividad anterior sigue sin responder, o acaba de haber una,
    // se ignora el marcador y queda solo el texto. Es la garantía dura contra el
    // juego que aparecía una y otra vez mientras el niño ya lo tenía en pantalla.
    // Rai pidió un juego; acá se decide si ese juego repetiría la experiencia.
    const tipoPedido = marcadorDeActividad(data);
    const temaPedido = tipoPedido
      ? (data as Record<string, string | undefined>)[`${tipoPedido}Tema`]
      : undefined;
    const decision = decidirActividad(tipoPedido, temaPedido);

    if (tipoPedido && !decision) {
      avisarEvento("actividad_suprimida", {
        pupiloId: perfil.id,
        materia: mat,
        meta: { tipo: tipoPedido, pendiente: actividadPendiente.current },
      });
    }
    if (tipoPedido && decision?.cambiado) {
      // No es un fallo: es el sistema evitando que le llegue lo mismo otra vez.
      avisarEvento("actividad_cambiada", {
        pupiloId: perfil.id,
        materia: mat,
        meta: { de: tipoPedido, a: decision.tipo },
      });
    }

    // Un solo camino de descarga, según lo decidido (antes eran ocho ramas
    // fijas atadas a lo que hubiera pedido Rai).
    const tipoFinal = decision?.tipo ?? null;
    const tema = temaPedido ?? "";
    const traer = async (t: string) => {
      switch (t) {
        case "ejercicio":
          return { ejercicio: await obtenerEjercicio(tema, data.ejercicioFormato, mat) };
        case "sopa":
          return { sopa: await obtenerSopa(tema, mat) };
        case "rueda":
          return { rueda: await obtenerRueda(tema, mat) };
        case "intruso":
          return { intruso: await obtenerIntruso(tema, mat) };
        case "conector":
          return { conector: await obtenerConector(tema, mat) };
        case "clasificador":
          return { clasificador: await obtenerClasificador(tema, mat) };
        case "secuencia":
          return { secuencia: await obtenerSecuencia(tema, mat) };
        case "flashcards":
          return { flashcards: await obtenerFlashcards(tema, mat) };
        default:
          return {};
      }
    };
    const traida: {
      ejercicio?: EjercicioChat | null;
      sopa?: DatosSopa | null;
      rueda?: DatosRueda | null;
      intruso?: DatosIntruso | null;
      conector?: DatosConector | null;
      clasificador?: DatosClasificador | null;
      secuencia?: DatosSecuencia | null;
      flashcards?: DatosFlashcards | null;
    } = tipoFinal ? await traer(tipoFinal) : {};

    const ejercicio = traida.ejercicio ?? null;
    const sopa = traida.sopa ?? null;
    const rueda = traida.rueda ?? null;
    const intruso = traida.intruso ?? null;
    const conector = traida.conector ?? null;
    const clasificador = traida.clasificador ?? null;
    const secuencia = traida.secuencia ?? null;
    const flashcards = traida.flashcards ?? null;

    setMensajes((m) => [
      ...m,
      {
        de: "rai",
        texto: data.respuesta ?? "Ups, no pude responder ahora.",
        fuentes: data.fuentes,
        modo: data.modo,
        ejercicio: ejercicio ?? undefined,
        sopa: sopa ?? undefined,
        rueda: rueda ?? undefined,
        intruso: intruso ?? undefined,
        conector: conector ?? undefined,
        clasificador: clasificador ?? undefined,
        secuencia: secuencia ?? undefined,
        flashcards: flashcards ?? undefined,
      },
    ]);

    const llegoActividad = !!(
      ejercicio || sopa || rueda || intruso || conector || clasificador || secuencia || flashcards
    );

    // queda una actividad esperando respuesta: no se le encima otra
    if (llegoActividad && tipoFinal) {
      actividadPendiente.current = true;
      ultimoTipo.current = tipoFinal;
      combinacionesUsadas.current.add(`${tipoFinal}:${tema}`);
    }

    // CÓMO ENTRA EL MENSAJE DE RAI:
    //  · si trae una actividad, la esfera destella una "idea" y lanza un anillo
    //    justo cuando aparece la tarjeta (la novedad es el juego);
    //  · si no, y Rai está respondiendo que SÍ o que NO a algo que preguntó el
    //    niño, la esfera lo dice antes que el texto: asiente o niega. Miramos
    //    solo el ARRANQUE del mensaje, que es donde va la respuesta directa.
    const respuesta = (data.respuesta ?? "").trimStart();
    if (llegoActividad) {
      reaccionar(["idea", 1900]);
    } else if (/^[¡"'“]*\s*no\b/i.test(respuesta)) {
      reaccionar(["no", 1400]);
    } else if (
      /^[¡"'“]*\s*(s[íi]|claro|exacto|correcto|as[íi] es|eso es|justo|tal cual)\b/i.test(
        respuesta
      )
    ) {
      reaccionar(["si", 950]);
    }

    // RED DE SEGURIDAD: Rai prometió una actividad pero no llegó una válida; que
    // no quede el niño esperando un juego que nunca aparece.
    const prometioActividad = !!(
      data.ejercicioTema ||
      data.sopaTema ||
      data.ruedaTema ||
      data.intrusoTema ||
      data.conectorTema ||
      data.clasificadorTema ||
      data.secuenciaTema ||
      data.flashcardsTema
    );
    if (prometioActividad && !llegoActividad) {
      avisarEvento("actividad_prometida_sin_llegar", {
        pupiloId: perfil.id,
        materia: mat,
        meta: { tipo: marcadorDeActividad(data) || "otro" },
      });
      reaccionar(["ausente", 2200]); // se le perdió la actividad: se aleja un momento
      setMensajes((m) => [
        ...m,
        {
          de: "rai",
          texto:
            "¡Uy! Se me traspapeló la actividad 😅. Mejor sigamos conversando y " +
            "lo intentamos de nuevo en un ratito. ¿Qué parte te gustaría repasar?",
        },
      ]);
    }
  }

  // Pide un ejercicio a la biblioteca validada y lo devuelve listo (o null si no
  // hay uno válido). `formato` = "opcion_multiple" | "seleccion_multiple".
  // NO toca el estado: quien llama decide dónde lo adjunta.
  // Params comunes de los generadores, con lo ya visto excluido.
  function paramsActividad(tema: string, mat: string): URLSearchParams {
    const p = new URLSearchParams({
      materia: mat,
      curso: perfil.curso,
      dificultad: "2",
      tema,
    });
    if (vistos.current.size > 0) {
      p.set("excluir", Array.from(vistos.current).join(","));
    }
    return p;
  }

  // ÚNICA puerta para guardar avance. Aplica el cambio sobre el acuerdo vivo y
  // deja el resultado como nuevo punto de partida, así dos guardados seguidos
  // se encadenan en vez de pisarse.
  function guardarAvance(cambio: (a: AcuerdoTutoria) => AcuerdoTutoria) {
    const base = acuerdoVivo.current;
    if (!base) return;
    const tutoria = cambio(base);
    acuerdoVivo.current = tutoria;
    onGuardarPerfil?.({ ...perfil, tutoria });
  }

  // Anota el contenido entregado para no repetírselo: primero en memoria (para
  // el resto de esta clase) y luego en su perfil (para las próximas).
  function anotarVisto(id?: string) {
    if (!id || vistos.current.has(id)) return;
    vistos.current.add(id);
    guardarAvance((a) => recordarContenidos(a, [id]));
  }

  async function obtenerEjercicio(
    tema: string,
    formato: string = "opcion_multiple",
    mat: string = materia
  ): Promise<EjercicioChat | null> {
    try {
      const params = paramsActividad(tema, mat);
      params.set("tipoPlantilla", formato);
      const res = await fetch(`/api/ejercicios/obtener?${params}`);
      const data = await res.json();
      const e = data.ejercicio;
      const opciones: string[] = e?.datos?.opciones ?? e?.opciones ?? [];
      const respuestaFinal = String(e?.respuestaFinal ?? "");
      const tipoPlantilla =
        e?.tipoPlantilla ?? e?.datos?.tipoPlantilla ?? "opcion_multiple";
      const respuestasCorrectas: string[] =
        e?.datos?.respuestasCorrectas ?? e?.respuestasCorrectas ?? [];

      const esMulti = tipoPlantilla === "seleccion_multiple";
      const esValido = esMulti
        ? !!(
            e?.enunciado &&
            opciones.length >= 3 &&
            respuestasCorrectas.length >= 1 &&
            respuestasCorrectas.every((r) => opciones.includes(r))
          )
        : !!(
            e?.enunciado &&
            opciones.length >= 2 &&
            opciones.includes(respuestaFinal)
          );
      if (!esValido) return null;
      anotarVisto(e?.id);

      return {
        tema,
        enunciado: rellenar(e.enunciado, e.datos?.variables),
        opciones,
        respuestaFinal,
        respuestasCorrectas: esMulti ? respuestasCorrectas : undefined,
        tipoPlantilla,
      };
    } catch {
      return null;
    }
  }

  // Pide una sopa de letras del tema a la biblioteca/generador. Devuelve los
  // datos listos (grid + palabras con su path) o null si no se pudo armar.
  async function obtenerSopa(tema: string, mat: string = materia): Promise<DatosSopa | null> {
    try {
      const params = paramsActividad(tema, mat);
      const res = await fetch(`/api/sopa/generar?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      anotarVisto(data.id);
      const s = data.sopa;
      const gridOk = Array.isArray(s?.grid) && s.grid.length > 0;
      const palabrasOk = Array.isArray(s?.palabras) && s.palabras.length >= 3;
      if (!gridOk || !palabrasOk) return null;
      return { grid: s.grid, palabras: s.palabras };
    } catch {
      return null;
    }
  }

  // Pide una rueda de letras del tema (pregunta + respuesta a formar). Devuelve
  // los datos listos o null si no se pudo generar.
  async function obtenerRueda(tema: string, mat: string = materia): Promise<DatosRueda | null> {
    try {
      const params = paramsActividad(tema, mat);
      const res = await fetch(`/api/rueda/generar?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      anotarVisto(data.id);
      const r = data.rueda;
      const ok =
        typeof r?.enunciado === "string" &&
        typeof r?.respuesta === "string" &&
        Array.isArray(r?.letras) &&
        r.letras.length >= 3;
      if (!ok) return null;
      return { enunciado: r.enunciado, respuesta: r.respuesta, letras: r.letras };
    } catch {
      return null;
    }
  }

  // Pide "el intruso" del tema (consigna + opciones + cuál sobra). Devuelve los
  // datos listos o null si no se pudo generar.
  async function obtenerIntruso(tema: string, mat: string = materia): Promise<DatosIntruso | null> {
    try {
      const params = paramsActividad(tema, mat);
      const res = await fetch(`/api/intruso/generar?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      anotarVisto(data.id);
      const it = data.intruso;
      const ok =
        typeof it?.enunciado === "string" &&
        Array.isArray(it?.opciones) &&
        it.opciones.length >= 4 &&
        typeof it?.intruso === "string" &&
        it.opciones.includes(it.intruso);
      if (!ok) return null;
      return {
        enunciado: it.enunciado,
        opciones: it.opciones,
        intruso: it.intruso,
        pista: it.pista,
      };
    } catch {
      return null;
    }
  }

  // Pide "el conector" del tema (consigna + pares izq↔der). Devuelve los datos
  // listos o null si no se pudo generar.
  async function obtenerConector(tema: string, mat: string = materia): Promise<DatosConector | null> {
    try {
      const params = paramsActividad(tema, mat);
      const res = await fetch(`/api/conector/generar?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      anotarVisto(data.id);
      const c = data.conector;
      const ok =
        typeof c?.enunciado === "string" &&
        Array.isArray(c?.pares) &&
        c.pares.length >= 3 &&
        c.pares.every(
          (p: unknown) =>
            !!p &&
            typeof (p as { izq?: unknown }).izq === "string" &&
            typeof (p as { der?: unknown }).der === "string"
        );
      if (!ok) return null;
      return { enunciado: c.enunciado, pares: c.pares };
    } catch {
      return null;
    }
  }

  // Pide "el clasificador" del tema (grupos + items). Devuelve los datos listos
  // o null si no se pudo generar.
  async function obtenerClasificador(
    tema: string,
    mat: string = materia
  ): Promise<DatosClasificador | null> {
    try {
      const params = paramsActividad(tema, mat);
      const res = await fetch(`/api/clasificador/generar?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      anotarVisto(data.id);
      const c = data.clasificador;
      const ok =
        typeof c?.enunciado === "string" &&
        Array.isArray(c?.grupos) &&
        c.grupos.length >= 2 &&
        Array.isArray(c?.items) &&
        c.items.length >= 4 &&
        c.items.every(
          (it: unknown) =>
            !!it &&
            typeof (it as { texto?: unknown }).texto === "string" &&
            c.grupos.includes((it as { grupo?: unknown }).grupo)
        );
      if (!ok) return null;
      return { enunciado: c.enunciado, grupos: c.grupos, items: c.items };
    } catch {
      return null;
    }
  }

  async function obtenerSecuencia(tema: string, mat: string = materia): Promise<DatosSecuencia | null> {
    try {
      const params = paramsActividad(tema, mat);
      const res = await fetch(`/api/secuencia/generar?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      anotarVisto(data.id);
      const s = data.secuencia;
      const ok =
        typeof s?.enunciado === "string" &&
        Array.isArray(s?.pasosCorrectos) &&
        s.pasosCorrectos.length >= 3 &&
        Array.isArray(s?.pasosBarajados) &&
        s.pasosBarajados.length === s.pasosCorrectos.length;
      if (!ok) return null;
      return {
        enunciado: s.enunciado,
        pasosCorrectos: s.pasosCorrectos,
        pasosBarajados: s.pasosBarajados,
      };
    } catch {
      return null;
    }
  }

  async function obtenerFlashcards(tema: string, mat: string = materia): Promise<DatosFlashcards | null> {
    try {
      const params = paramsActividad(tema, mat);
      const res = await fetch(`/api/flashcards/generar?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      anotarVisto(data.id);
      const f = data.flashcards;
      const ok =
        typeof f?.enunciado === "string" &&
        Array.isArray(f?.tarjetas) &&
        f.tarjetas.length >= 2 &&
        f.tarjetas.every(
          (t: any) => typeof t?.frente === "string" && typeof t?.reverso === "string"
        );
      if (!ok) return null;
      return { enunciado: f.enunciado, tarjetas: f.tarjetas };
    } catch {
      return null;
    }
  }

  // DEV ONLY: lanza un ejercicio sin pasar por Rai, para probar la tarjeta
  // on-demand. `formato` = "opcion_multiple" | "seleccion_multiple".
  async function lanzarEjercicioDev(formato: string = "opcion_multiple") {
    // Resolvemos el ejercicio PRIMERO y lo adjuntamos en el MISMO mensaje que lo
    // presenta, en un solo setMensajes. Así no dependemos de un índice numérico
    // (que llegaba en -1 porque el updater async no lo asignaba a tiempo).
    const ejercicio = await obtenerEjercicio("prueba", formato);
    const etiqueta =
      formato === "seleccion_multiple"
        ? "(dev) Selección múltiple 👇"
        : "(dev) Ejercicio de alternativas 👇";
    setMensajes((m) => [
      ...m,
      { de: "rai", texto: etiqueta, ejercicio: ejercicio ?? undefined },
    ]);
    if (!ejercicio) {
      setMensajes((m) => [
        ...m,
        { de: "rai", texto: "(dev) No se pudo obtener el ejercicio." },
      ]);
    }
  }

  // DEV ONLY: lanza una sopa de letras sin pasar por Rai.
  async function lanzarSopaDev() {
    const sopa = await obtenerSopa("prueba");
    setMensajes((m) => [
      ...m,
      { de: "rai", texto: "(dev) Sopa de letras 👇", sopa: sopa ?? undefined },
    ]);
    if (!sopa) {
      setMensajes((m) => [
        ...m,
        { de: "rai", texto: "(dev) No se pudo generar la sopa." },
      ]);
    }
  }

  // DEV ONLY: lanza una rueda de letras sin pasar por Rai.
  async function lanzarRuedaDev() {
    const rueda = await obtenerRueda("prueba");
    setMensajes((m) => [
      ...m,
      { de: "rai", texto: "(dev) Rueda de letras 👇", rueda: rueda ?? undefined },
    ]);
    if (!rueda) {
      setMensajes((m) => [
        ...m,
        { de: "rai", texto: "(dev) No se pudo generar la rueda." },
      ]);
    }
  }

  // DEV ONLY: lanza "el intruso" sin pasar por Rai.
  async function lanzarIntrusoDev() {
    const intruso = await obtenerIntruso("prueba");
    setMensajes((m) => [
      ...m,
      { de: "rai", texto: "(dev) El intruso 👇", intruso: intruso ?? undefined },
    ]);
    if (!intruso) {
      setMensajes((m) => [
        ...m,
        { de: "rai", texto: "(dev) No se pudo generar el intruso." },
      ]);
    }
  }

  // DEV ONLY: lanza "el conector" sin pasar por Rai.
  async function lanzarConectorDev() {
    const conector = await obtenerConector("prueba");
    setMensajes((m) => [
      ...m,
      { de: "rai", texto: "(dev) El conector 👇", conector: conector ?? undefined },
    ]);
    if (!conector) {
      setMensajes((m) => [
        ...m,
        { de: "rai", texto: "(dev) No se pudo generar el conector." },
      ]);
    }
  }

  // DEV ONLY: lanza "el clasificador" sin pasar por Rai.
  async function lanzarClasificadorDev() {
    const clasificador = await obtenerClasificador("prueba");
    setMensajes((m) => [
      ...m,
      {
        de: "rai",
        texto: "(dev) El clasificador 👇",
        clasificador: clasificador ?? undefined,
      },
    ]);
    if (!clasificador) {
      setMensajes((m) => [
        ...m,
        { de: "rai", texto: "(dev) No se pudo generar el clasificador." },
      ]);
    }
  }

  // DEV ONLY: lanza "secuencia" sin pasar por Rai.
  async function lanzarSecuenciaDev() {
    const secuencia = await obtenerSecuencia("prueba");
    setMensajes((m) => [
      ...m,
      { de: "rai", texto: "(dev) Secuencia 👇", secuencia: secuencia ?? undefined },
    ]);
    if (!secuencia) {
      setMensajes((m) => [
        ...m,
        { de: "rai", texto: "(dev) No se pudo generar la secuencia." },
      ]);
    }
  }

  // DEV ONLY: lanza "flashcards" sin pasar por Rai.
  async function lanzarFlashcardsDev() {
    const flashcards = await obtenerFlashcards("prueba");
    setMensajes((m) => [
      ...m,
      { de: "rai", texto: "(dev) Flashcards 👇", flashcards: flashcards ?? undefined },
    ]);
    if (!flashcards) {
      setMensajes((m) => [
        ...m,
        { de: "rai", texto: "(dev) No se pudo generar el mazo de flashcards." },
      ]);
    }
  }

  // Publica las acciones dev en el panel dev GLOBAL mientras el tutor está en
  // pantalla, y las quita al salir. Así los botones viven en un solo lugar (el
  // panel flotante) en vez de ensuciar el chat. Usamos refs para que el efecto no
  // re-registre en cada render (las funciones se recrean).
  const lanzarSopaRef = useRef(lanzarSopaDev);
  const lanzarEjercicioRef = useRef(lanzarEjercicioDev);
  const lanzarRuedaRef = useRef(lanzarRuedaDev);
  const lanzarIntrusoRef = useRef(lanzarIntrusoDev);
  const lanzarConectorRef = useRef(lanzarConectorDev);
  const lanzarClasificadorRef = useRef(lanzarClasificadorDev);
  const lanzarSecuenciaRef = useRef(lanzarSecuenciaDev);
  const lanzarFlashcardsRef = useRef(lanzarFlashcardsDev);
  lanzarSopaRef.current = lanzarSopaDev;
  lanzarEjercicioRef.current = lanzarEjercicioDev;
  lanzarRuedaRef.current = lanzarRuedaDev;
  lanzarIntrusoRef.current = lanzarIntrusoDev;
  lanzarConectorRef.current = lanzarConectorDev;
  lanzarClasificadorRef.current = lanzarClasificadorDev;
  lanzarSecuenciaRef.current = lanzarSecuenciaDev;
  lanzarFlashcardsRef.current = lanzarFlashcardsDev;
  useEffect(() => {
    if (!devToolsActivas()) return;
    setAccionesDevTutor({
      lanzarSopa: () => void lanzarSopaRef.current(),
      lanzarEjercicio: () => void lanzarEjercicioRef.current("opcion_multiple"),
      lanzarSeleccion: () => void lanzarEjercicioRef.current("seleccion_multiple"),
      lanzarRueda: () => void lanzarRuedaRef.current(),
      lanzarIntruso: () => void lanzarIntrusoRef.current(),
      lanzarConector: () => void lanzarConectorRef.current(),
      lanzarClasificador: () => void lanzarClasificadorRef.current(),
      lanzarSecuencia: () => void lanzarSecuenciaRef.current(),
      lanzarFlashcards: () => void lanzarFlashcardsRef.current(),
    });
    return () => setAccionesDevTutor(null);
  }, [setAccionesDevTutor]);

  // CÓMO REACCIONA RAI A UNA RESPUESTA DEL NIÑO. Un solo lugar para las ocho
  // actividades, así ninguna se comporta distinto sin querer.
  //   Acierto → ASIENTE ("sí, es esa") y recién después celebra. El orden
  //   importa: primero te responde, después festeja.
  //   Error   → NIEGA (la respuesta no era esa: hay que decírselo claro) y
  //   enseguida se queda en ánimo — se adelgaza, baja el ritmo y acompaña. El
  //   "no" es sobre la respuesta; lo que viene después es sobre el niño.
  // El niño terminó la actividad de ese turno: queda anotado para la traza del
  // historial (así Rai sabe que ya la hizo y puede comentarla) y se libera el
  // freno para que más adelante pueda proponer otra.
  function marcarResuelto(msgIdx: number) {
    actividadPendiente.current = false;
    setMensajes((m) =>
      m.map((msg, i) => (i === msgIdx ? { ...msg, resuelto: true } : msg))
    );
  }

  function reaccionarARespuesta(acerto: boolean) {
    if (acerto) reaccionar(["si", 800], ["celebracion", 2600]);
    else reaccionar(["no", 1300], ["animo", 2800]);
  }

  // El niño responde el ejercicio embebido: marca acierto y registra evidencia.
  // `seleccion` = opciones elegidas. En opción múltiple es 1; en selección
  // múltiple pueden ser varias (se valida el conjunto EXACTO: todo o nada).
  function responderEjercicio(msgIdx: number, seleccion: string[]) {
    const ej = mensajes[msgIdx]?.ejercicio;
    if (!ej || ej.respondido) return;
    const ok = evaluarEjercicio(ej, seleccion);

    reaccionarARespuesta(ok);
    marcarResuelto(msgIdx);

    setMensajes((m) =>
      m.map((msg, i) =>
        i === msgIdx && msg.ejercicio
          ? { ...msg, ejercicio: { ...msg.ejercicio, respondido: ok ? "ok" : "no" } }
          : msg
      )
    );

    if (acuerdo) {
      // evidencia dura de UN ejercicio en la charla (correctos/total)
      guardarAvance((a) => registrarEjercicios(a, ej.tema, materia, ok ? 1 : 0, 1));
    }

    // Si falló, le pedimos a Rai que le explique cuáles eran y por qué, para que
    // aprenda (no solo "incorrecto"). Es un mensaje de sistema al tutor.
    if (!ok) void raiExplicaError(ej, seleccion);
  }

  // El niño respondió "el intruso": registra evidencia y, si falló, Rai explica.
  function responderIntruso(msgIdx: number, acerto: boolean, elegido: string) {
    const it = mensajes[msgIdx]?.intruso;
    if (!it) return;

    reaccionarARespuesta(acerto);
    marcarResuelto(msgIdx);

    if (acuerdo) {
      const tema = it.enunciado.slice(0, 40);
      guardarAvance((a) => registrarEjercicios(a, tema, materia, acerto ? 1 : 0, 1));
    }
    if (!acerto) void raiExplicaIntruso(it, elegido);
  }

  // Rai explica por qué el intruso era ese (usa la pista si Gemini la dio).
  async function raiExplicaIntruso(it: DatosIntruso, elegido: string) {
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cuerpoBase(),
          accion: "chat",
          materia,
          pregunta:
            `[Sistema] En "${it.enunciado}" el niño tocó "${elegido}", pero el ` +
            `intruso era "${it.intruso}"${it.pista ? ` (${it.pista})` : ""}. ` +
            `Explícale con cariño y en 1-2 frases por qué ese era el intruso. ` +
            `No lances otra actividad.`,
          historial: historialPlano(),
        }),
      });
      const data = await res.json();
      if (data?.respuesta) {
        setMensajes((m) => [
          ...m,
          { de: "rai", texto: data.respuesta, fuentes: data.fuentes, modo: data.modo },
        ]);
        scrollAlFinal();
      }
    } catch {
      /* si falla, el niño ya vio el intruso correcto en la tarjeta */
    }
  }

  // El niño terminó "el conector": registra evidencia. No hace falta que Rai
  // explique — la tarjeta ya muestra en rojo las uniones equivocadas.
  function responderConector(msgIdx: number, acerto: boolean) {
    const c = mensajes[msgIdx]?.conector;
    if (!c || !acuerdo) return;

    reaccionarARespuesta(acerto);
    marcarResuelto(msgIdx);

    const tema = c.enunciado.slice(0, 40);
    guardarAvance((a) => registrarEjercicios(a, tema, materia, acerto ? 1 : 0, 1));
  }

  // El niño terminó "el clasificador": registra evidencia. La tarjeta ya muestra
  // en verde/rojo qué quedó bien, así que Rai no necesita explicar.
  function responderClasificador(msgIdx: number, acerto: boolean) {
    const c = mensajes[msgIdx]?.clasificador;
    if (!c || !acuerdo) return;

    reaccionarARespuesta(acerto);
    marcarResuelto(msgIdx);

    const tema = c.enunciado.slice(0, 40);
    guardarAvance((a) => registrarEjercicios(a, tema, materia, acerto ? 1 : 0, 1));
  }

  function responderSopa(msgIdx: number) {
    // sopa, rueda, secuencia y flashcards solo se completan bien: siempre acierto
    reaccionarARespuesta(true);
    marcarResuelto(msgIdx);
    const s = mensajes[msgIdx]?.sopa;
    if (s && acuerdo) {
      const tema = s.palabras[0]?.clean || "sopa de letras";
      guardarAvance((a) => registrarEjercicios(a, tema, materia, 1, 1));
    }
  }

  function responderRueda(msgIdx: number) {
    // sopa, rueda, secuencia y flashcards solo se completan bien: siempre acierto
    reaccionarARespuesta(true);
    marcarResuelto(msgIdx);
    const r = mensajes[msgIdx]?.rueda;
    if (r && acuerdo) {
      const tema = r.respuesta;
      guardarAvance((a) => registrarEjercicios(a, tema, materia, 1, 1));
    }
  }

  function responderSecuencia(msgIdx: number) {
    // sopa, rueda, secuencia y flashcards solo se completan bien: siempre acierto
    reaccionarARespuesta(true);
    marcarResuelto(msgIdx);
    const s = mensajes[msgIdx]?.secuencia;
    if (s && acuerdo) {
      const tema = s.pasosCorrectos[0] || "secuencia";
      guardarAvance((a) => registrarEjercicios(a, tema, materia, 1, 1));
    }
  }

  function responderFlashcards(msgIdx: number) {
    // sopa, rueda, secuencia y flashcards solo se completan bien: siempre acierto
    reaccionarARespuesta(true);
    marcarResuelto(msgIdx);
    const f = mensajes[msgIdx]?.flashcards;
    if (f && acuerdo) {
      const tema = f.enunciado.slice(0, 40);
      guardarAvance((a) => registrarEjercicios(a, tema, materia, 1, 1));
    }
  }

  // ¿La selección del niño es correcta? Todo o nada.
  function evaluarEjercicio(ej: EjercicioChat, seleccion: string[]): boolean {
    const norm = (s: string) => s.trim().toLowerCase();
    const correctas = (ej.respuestasCorrectas?.length
      ? ej.respuestasCorrectas
      : [ej.respuestaFinal]
    ).map(norm);
    const elegidas = seleccion.map(norm);
    const set = (a: string[]) => new Set(a);
    const A = set(correctas);
    const B = set(elegidas);
    return A.size === B.size && [...A].every((x) => B.has(x));
  }

  // Pide a Rai una explicación breve de por qué la respuesta fue incorrecta,
  // nombrando las correctas, y la agrega a la conversación como turno suyo.
  async function raiExplicaError(ej: EjercicioChat, seleccion: string[]) {
    const correctas = ej.respuestasCorrectas?.length
      ? ej.respuestasCorrectas
      : [ej.respuestaFinal];
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cuerpoBase(),
          accion: "chat",
          materia,
          pregunta:
            `[Sistema] El niño respondió el ejercicio "${ej.enunciado}". ` +
            `Marcó: ${seleccion.join(", ") || "nada"}. ` +
            `La(s) respuesta(s) correcta(s) era(n): ${correctas.join(", ")}. ` +
            `Explícale con cariño y en 1-2 frases cuál era la correcta y por qué, ` +
            `para que lo entienda. No lances otro ejercicio.`,
          historial: historialPlano(),
        }),
      });
      const data = await res.json();
      if (data?.respuesta) {
        setMensajes((m) => [
          ...m,
          { de: "rai", texto: data.respuesta, fuentes: data.fuentes, modo: data.modo },
        ]);
        scrollAlFinal();
      }
    } catch {
      /* si falla, el niño ya vio las correctas en la tarjeta; no bloqueamos */
    }
  }

  // Si Rai cerró el acuerdo de horario, lo guardamos en el perfil.
  // Al crearlo, sembramos la memoria por tema desde el diagnóstico: así Rai
  // sabe desde el día 1 qué le cuesta al niño ("brecha detectada").
  function guardarHorario(horario: AcuerdoTutoria["horario"]) {
    if (perfil.tutoria) return; // solo la primera vez
    const base: AcuerdoTutoria = {
      creadoEn: new Date().toISOString(),
      horario,
      notasNino: "",
      sesiones: [],
    };
    const nuevo = sembrarTemasDesdeDiagnostico(base, perfil.diagnostico);
    // Primera vez: persiste y navega a "mundos". Si no hay callback dedicado,
    // cae al de persistir (compatibilidad).
    (onHorarioCreado ?? onGuardarPerfil)?.({ ...perfil, tutoria: nuevo });
  }

  function quizasGuardarHorario(horario?: AcuerdoTutoria["horario"]) {
    if (!horario) return;
    guardarHorario(horario);
  }

  // Red de seguridad: si Rai olvidó emitir el bloque de horario, el niño no debe
  // quedar colgado. Reparte las materias del examen en días de la semana y cierra.
  function cerrarConHorarioPorDefecto() {
    const dias = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;
    const horario: AcuerdoTutoria["horario"] = {};
    perfil.examen.materias.forEach((mat, i) => {
      const d = dias[i % dias.length];
      (horario[d] ??= []).push(mat);
    });
    guardarHorario(horario);
  }

  // ¿mostrar la red de seguridad? primera charla, ya conversaron, sin horario aún
  const turnosNinoActual = mensajes.filter((m) => m.de === "nino").length;
  const mostrarEscapeHorario = esPrimera && !perfil.tutoria && turnosNinoActual >= 4;

  // Al salir de la tutoría, cerramos sesión de forma estructurada si hubo interacción
  async function manejarVolver() {
    // La despedida usa el mismo gesto que la llegada: la esfera se abre, se
    // entibia y lanza un anillo. Rai se va como llegó.
    reaccionar(["saludo", 2600]);
    const turnosNino = mensajes.filter((m) => m.de === "nino").length;
    // Si no hay acuerdo o el niño conversó menos de 2 turnos, no guardamos sesión
    if (turnosNino < 2 || !acuerdo) {
      onVolver();
      return;
    }

    setCargando(true);
    const duracionMin = Math.max(1, Math.round((Date.now() - inicioSesion.current) / 60000));
    const nMensajes = mensajes.length;

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cuerpoBase(),
          accion: "cerrar",
          materia,
          historial: historialPlano(),
        }),
      });

      const data = await res.json();
      const nuevaSesion = {
        fecha: new Date().toISOString(),
        duracionMin,
        dia: diaDeHoy(),
        materia,
        titulo: data.titulo || `Sesión de ${materia}`,
        resumen: data.resumen || "Se realizó una sesión de tutoría.",
        nMensajes,
      };

      // fusiona la memoria por tema + recuerdos que reportó el cierre
      const conMemoria = aplicarCierre(acuerdo, {
        temasTrabajados: (data.temasTrabajados ?? []) as TemaTrabajado[],
        recuerdos: (data.recuerdos ?? []) as Omit<RecuerdoNino, "fecha">[],
      });
      notificarLogros(perfil.id, temasSuperadosNuevos(acuerdo.temas, conMemoria.temas));

      const tutoriaActualizada: AcuerdoTutoria = {
        ...conMemoria,
        notasNino: data.notasNino || acuerdo.notasNino,
        sesiones: [...(acuerdo.sesiones || []), nuevaSesion],
      };

      onGuardarPerfil?.({
        ...perfil,
        tutoria: tutoriaActualizada,
      });
    } catch (e) {
      console.error("Error al cerrar la sesión:", e);
      // Fallback: guardar la sesión localmente con datos genéricos
      const nuevaSesion = {
        fecha: new Date().toISOString(),
        duracionMin,
        dia: diaDeHoy(),
        materia,
        titulo: `Sesión de ${materia}`,
        resumen: "Se realizó una sesión de tutoría.",
        nMensajes,
      };
      const nuevasSesiones = [...(acuerdo.sesiones || []), nuevaSesion];
      const tutoriaActualizada = {
        ...acuerdo,
        sesiones: nuevasSesiones,
      };
      onGuardarPerfil?.({
        ...perfil,
        tutoria: tutoriaActualizada,
      });
    } finally {
      setCargando(false);
      onVolver();
    }
  }

  return (
    // 100dvh = altura REAL del viewport en móvil (se ajusta a la barra del
    // navegador y al teclado, a diferencia de 100vh/h-screen que dejaba el
    // input fuera de pantalla al hacer scroll). minHeight de respaldo.
    // Ancho responsive: en móvil la columna zen (560px, buena legibilidad); en
    // tablet+ ocupa ~80% del ancho con un tope, para no dejar márgenes enormes.
    <div
      className="zen-page flex flex-col"
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      {/* Barra superior de herramientas idéntica a otras vistas */}
      <div className="flex h-[58px] flex-none items-center justify-end gap-2.5">
        <HomeButton onHome={manejarVolver} />
        <SoundToggle />
        <ThemeToggle />
      </div>

      {/* la presencia: esfera centrada+grande al inicio; tras la 1ª respuesta
          del niño se encoge y sube a la esquina para abrir espacio al texto. */}
      <div
        className={
          "flex items-center gap-3 transition-all duration-700 ease-in-out " +
          (compacta
            ? "justify-start pt-0 pb-2"
            : "justify-center pt-4 pb-4")
        }
      >
        <AuraOrb
          materia={materia}
          size={compacta ? 60 : 128}
          // Prioridad: la reacción puntual manda mientras dura; si no hay
          // ninguna, la esfera muestra qué está haciendo Rai en la conversación.
          estado={reaccion ?? (cargando ? "pensando" : faseBase)}
        />
        {cargando && (
          <span className="text-[14px] italic text-ink-soft animate-pulse">
            Rai está escribiendo…
          </span>
        )}
      </div>

      {/* conversación: solo texto centrado, sin burbujas */}
      <div className="flex flex-1 flex-col gap-7 overflow-y-auto py-4 text-center">
        {mensajes.map((m, i) => (
          <div
            key={i}
            ref={i === mensajes.length - 1 ? ultimoRef : undefined}
            // scroll-mt: al alinear arriba, deja aire bajo la esfera
            className="scroll-mt-3"
          >
          <Linea
            m={m}
            // solo el último mensaje de Rai se "escribe"; el resto ya está completo
            animar={m.de === "rai" && i === mensajes.length - 1}
            onTick={mostrarInicioDeRai}
            onResponderEjercicio={(seleccion) => responderEjercicio(i, seleccion)}
            onResponderIntruso={(acerto, elegido) =>
              responderIntruso(i, acerto, elegido)
            }
            onResponderConector={(acerto) => responderConector(i, acerto)}
            onResponderSopa={() => responderSopa(i)}
            onResponderRueda={() => responderRueda(i)}
            onResponderClasificador={(acerto) => responderClasificador(i, acerto)}
            onResponderSecuencia={() => responderSecuencia(i)}
            onResponderFlashcards={() => responderFlashcards(i)}
          />
          </div>
        ))}

        <div ref={finRef} />
      </div>

      {/* caja de escribir abajo, discreta */}
      {sesionTerminada ? (
        <div className="flex flex-col items-center gap-3 py-4 w-full">
          <button
            type="button"
            onClick={manejarVolver}
            disabled={cargando}
            className="cta w-[220px]"
          >
            {cargando ? "Guardando Progreso…" : "Terminar y Guardar ✅"}
          </button>
        </div>
      ) : (
        <>
          {mostrarEscapeHorario && (
            <div className="flex justify-center pb-1">
              <button
                type="button"
                onClick={cerrarConHorarioPorDefecto}
                disabled={cargando}
                className="text-[13px] text-sage-deep underline underline-offset-4 hover:opacity-80 disabled:opacity-40"
              >
                Ya tenemos nuestro horario, ¡a preparar todo! →
              </button>
            </div>
          )}
          {/* Los controles dev (sopa/ejercicio) ya NO viven aquí: se publican al
              panel dev flotante global (ver useEffect + setAccionesDevTutor), así
              todo lo dev está en un solo lugar y se quita de un tiro. */}
          <CajaTexto
            onEnviar={enviar}
            cargando={cargando}
            esPrimera={esPrimera}
            tutorNombre={TUTOR.nombre}
          />
        </>
      )}
    </div>
  );
}

// Componente de entrada aislado para evitar re-renderizados del chat durante la escritura (flickering bug fix)
function CajaTexto({
  onEnviar,
  cargando,
  esPrimera,
  tutorNombre,
}: {
  onEnviar: (texto: string) => void;
  cargando: boolean;
  esPrimera: boolean;
  tutorNombre: string;
}) {
  const [texto, setTexto] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [soportaVoz, setSoportaVoz] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSoportaVoz(true);
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = "es-CL";

        rec.onresult = (e: any) => {
          const transcript = Array.from(e.results)
            .map((result: any) => result[0].transcript)
            .join("");
          setTexto(transcript);
        };

        rec.onerror = (e: any) => {
          console.warn("Error en el micrófono", e);
          setEscuchando(false);
        };

        rec.onend = () => {
          setEscuchando(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, []);

  function toggleEscuchar() {
    if (!recognitionRef.current) return;
    if (escuchando) {
      recognitionRef.current.stop();
      setEscuchando(false);
    } else {
      try {
        recognitionRef.current.start();
        setEscuchando(true);
      } catch (err) {
        console.error("No se pudo iniciar el micrófono", err);
      }
    }
  }

  function enviar() {
    const pregunta = texto.trim();
    if (!pregunta || cargando) return;
    if (escuchando && recognitionRef.current) {
      recognitionRef.current.stop();
      setEscuchando(false);
    }
    onEnviar(pregunta);
    setTexto("");
  }

  return (
    // input DESTACADO: caja con borde completo, fondo sutil, ~90% del ancho y
    // tipografía más grande — pensado para que el niño lo vea claro en tablet.
    <div className="flex flex-none justify-center py-3">
      <div className="flex w-[90%] items-center gap-2 rounded-2xl border border-hair bg-surface/60 px-3 py-1.5 transition-colors focus-within:border-sage">
        {soportaVoz && (
          <button
            type="button"
            onClick={toggleEscuchar}
            disabled={cargando}
            title={escuchando ? "Detener micrófono" : "Hablar con el micrófono"}
            aria-label="Hablar por micrófono"
            className={`flex h-11 w-11 flex-none items-center justify-center rounded-full text-[19px] transition-all ${
              escuchando
                ? "bg-red-500 text-white animate-pulse shadow-lg scale-105"
                : "bg-surface-elevated text-sage-deep hover:bg-sage/20"
            }`}
          >
            🎙️
          </button>
        )}
        <input
          type="text"
          value={texto}
          disabled={cargando}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          // al enfocar (teclado móvil abre), aseguramos que el input quede visible
          onFocus={(e) =>
            setTimeout(
              () => e.target.scrollIntoView({ block: "center", behavior: "smooth" }),
              300
            )
          }
          placeholder={
            escuchando
              ? "Te estoy escuchando..."
              : esPrimera
              ? "Responde a Rai o usa el micrófono…"
              : `Escríbele o háblale a ${tutorNombre}…`
          }
          className="flex-1 border-none bg-transparent px-1 py-2 text-[19px] text-ink outline-none focus:outline-none focus:ring-0 placeholder:text-ink-soft/60"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={!texto.trim() || cargando}
          aria-label="Enviar"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sage-deep text-[18px] text-white transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// rellena "{cajas} cajas" con datos.variables.cajas (ejercicios con plantilla)
function rellenar(enunciado: string, variables?: Record<string, unknown>): string {
  if (!variables) return enunciado;
  return enunciado.replace(/\{(\w+)\}/g, (_, k) =>
    variables[k] !== undefined ? String(variables[k]) : `{${k}}`
  );
}

// Una línea de conversación, solo texto. El texto de Rai es más grande que las
// preguntas del diagnóstico (23px) para que la charla se sienta protagonista.
// `animar` = revelar por palabras (solo el último mensaje recién llegado).
const Linea = memo(function Linea({
  m,
  animar = false,
  onTick,
  onResponderEjercicio,
  onResponderIntruso,
  onResponderConector,
  onResponderSopa,
  onResponderRueda,
  onResponderClasificador,
  onResponderSecuencia,
  onResponderFlashcards,
}: {
  m: Mensaje;
  animar?: boolean;
  onTick?: () => void;
  onResponderEjercicio?: (seleccion: string[]) => void;
  onResponderIntruso?: (acerto: boolean, elegido: string) => void;
  onResponderConector?: (acerto: boolean) => void;
  onResponderSopa?: () => void;
  onResponderRueda?: () => void;
  onResponderClasificador?: (acerto: boolean) => void;
  onResponderSecuencia?: () => void;
  onResponderFlashcards?: () => void;
}) {
  if (m.de === "nino") {
    // el texto del niño en el acento salvia, para distinguirlo del de Rai (tinta)
    return (
      <p className="mx-auto max-w-[30ch] text-[17px] font-[600] leading-[1.4] text-sage-deep md:max-w-[40ch] md:text-[18px]">
        {m.texto}
      </p>
    );
  }
  return (
    <div className="mx-auto flex w-[90%] max-w-[40ch] flex-col items-center gap-2 md:max-w-[46ch]">
      <p className="whitespace-pre-line text-[26px] font-serif leading-[1.35] text-ink md:text-[29px]">
        {animar ? (
          <TextoRevelado texto={m.texto} onTick={onTick} />
        ) : (
          m.texto
        )}
      </p>
      {m.fuentes && m.fuentes.length > 0 && (
        <span className="text-[11px] text-ink-soft">
          basado en el currículum oficial · {m.fuentes[0]}
        </span>
      )}
      {m.modo === "simulado" && (
        <span className="text-[11px] text-clay">
          modo demostración (sin IA conectada)
        </span>
      )}
      {m.ejercicio && (
        // escapa el max-w-[40ch] del mensaje para ocupar ~80% de la pantalla
        <div className="mt-3 w-[80vw] max-w-[480px] md:w-full md:max-w-[620px]">
          <TarjetaEjercicioChat
            ejercicio={m.ejercicio}
            onResponder={onResponderEjercicio}
          />
        </div>
      )}
      {m.sopa && (
        // escapa el max-w-[40ch] del mensaje para ocupar ~90% de la PANTALLA
        // (con un tope en tablet), centrado bajo el texto de Rai.
        <div className="mt-3 w-[90vw] max-w-[520px] md:w-full md:max-w-[660px]">
          <SopaLetras datos={m.sopa} onCompleta={onResponderSopa} />
        </div>
      )}
      {m.rueda && (
        <div className="mt-3 w-[85vw] max-w-[420px] md:w-full md:max-w-[520px]">
          <RuedaLetras datos={m.rueda} onCompleta={onResponderRueda} />
        </div>
      )}
      {m.intruso && (
        <div className="mt-3 w-[85vw] max-w-[480px] md:w-full md:max-w-[620px]">
          <Intruso datos={m.intruso} onResponder={onResponderIntruso} />
        </div>
      )}
      {m.conector && (
        <div className="mt-3 w-[85vw] max-w-[480px] md:w-full md:max-w-[620px]">
          <Conector datos={m.conector} onResponder={onResponderConector} />
        </div>
      )}
      {m.clasificador && (
        <div className="mt-3 w-[85vw] max-w-[480px] md:w-full md:max-w-[620px]">
          <Clasificador
            datos={m.clasificador}
            onResponder={onResponderClasificador}
          />
        </div>
      )}
      {m.secuencia && (
        <div className="mt-3 w-[90vw] max-w-[480px] md:w-full md:max-w-[620px]">
          <Secuencia datos={m.secuencia} onCompleta={onResponderSecuencia} />
        </div>
      )}
      {m.flashcards && (
        <div className="mt-3 w-[90vw] max-w-[480px] md:w-full md:max-w-[620px]">
          <Flashcards datos={m.flashcards} onCompleta={onResponderFlashcards} />
        </div>
      )}
    </div>
  );
});

// Tarjeta de ejercicio embebida en la conversación con Rai. Soporta dos modos:
// - opción múltiple: una sola correcta, se responde al tocar.
// - selección múltiple (respuestasCorrectas): el niño marca varias y confirma.
// Sin marco (encaja en el flujo zen). Al acertar, fuegos artificiales sutiles.
function TarjetaEjercicioChat({
  ejercicio,
  onResponder,
}: {
  ejercicio: EjercicioChat;
  onResponder?: (seleccion: string[]) => void;
}) {
  const resuelto = !!ejercicio.respondido;
  const esMulti = !!ejercicio.respuestasCorrectas?.length;
  const correctas = esMulti
    ? ejercicio.respuestasCorrectas!
    : [ejercicio.respuestaFinal];

  // en modo multi, las opciones marcadas antes de confirmar
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const estaMarcada = (op: string) => marcadas.includes(op);
  const alternar = (op: string) =>
    setMarcadas((prev) =>
      prev.includes(op) ? prev.filter((x) => x !== op) : [...prev, op]
    );

  function elegir(op: string, i: number) {
    if (resuelto) return;
    if (esMulti) {
      alternar(op);
      tocarLira(i); // selección múltiple: cada opción suena distinto
    } else {
      tocarLira(); // respuesta única: una sola nota al responder
      onResponder?.([op]);
    }
  }

  return (
    <div className="relative text-center">
      {resuelto && ejercicio.respondido === "ok" && <Fireworks />}

      <p className="mb-1 font-serif text-[18px] leading-[1.3] text-ink">
        {ejercicio.enunciado}
      </p>
      {esMulti && !resuelto && (
        <p className="mb-3 text-[12px] text-ink-soft">
          Puede haber más de una respuesta. Márcalas y confirma.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {ejercicio.opciones.map((op, i) => {
          const esCorrecta = correctas.includes(op);
          const marcada = estaMarcada(op);
          // colores tras resolver: verde en las correctas, tenue en el resto;
          // si marcó una incorrecta, se resalta en clay.
          const clase = resuelto
            ? esCorrecta
              ? "border-sage bg-sage/10 text-ink"
              : marcada
                ? "border-clay/50 text-clay opacity-70"
                : "border-hair text-ink-soft opacity-50"
            : marcada
              ? "border-sage bg-sage/10 text-ink"
              : "border-hair text-ink enabled:hover:border-sage disabled:opacity-60";
          return (
            <button
              key={i}
              onClick={() => elegir(op, i)}
              disabled={resuelto}
              className={"rounded-xl border px-3 py-2 text-[15px] transition-colors " + clase}
            >
              {op}
            </button>
          );
        })}
      </div>

      {/* botón Confirmar (solo en modo multi, antes de resolver) */}
      {esMulti && !resuelto && (
        <button
          onClick={() => onResponder?.(marcadas)}
          disabled={marcadas.length === 0}
          className="mt-3 rounded-xl bg-sage-deep px-5 py-2 text-[14px] font-[600] text-white transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          Confirmar
        </button>
      )}

      {resuelto &&
        (ejercicio.respondido === "ok" ? (
          <p className="relative mt-4 font-serif text-[20px] font-[600] text-sage-deep">
            ¡Correcto!
          </p>
        ) : (
          <p className="mt-4 text-[15px] text-clay">
            {correctas.length > 1
              ? `Las correctas eran: ${correctas.join(", ")}.`
              : `La respuesta era: ${correctas[0]}.`}
          </p>
        ))}
    </div>
  );
}
