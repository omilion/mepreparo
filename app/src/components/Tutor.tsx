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
  type AcuerdoTutoria,
  type TemaTrabajado,
  type RecuerdoNino,
} from "@/lib/tutor/acuerdo";
import { AuraOrb } from "./AuraOrb";
import { TextoRevelado } from "./TextoRevelado";
import { HomeButton } from "./HomeButton";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";
import { SopaLetras, type DatosSopa } from "./SopaLetras";
import { RuedaLetras, type DatosRueda } from "./RuedaLetras";
import { Intruso, type DatosIntruso } from "./Intruso";
import { Conector, type DatosConector } from "./Conector";
import { Fireworks } from "./Fireworks";
import { tocarLira } from "@/lib/audio/liraUI";
import { devToolsActivas } from "@/lib/devTools";
import { useApp } from "@/lib/app/AppProvider";

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
}

export function Tutor({
  perfil,
  onVolver,
  onGuardarPerfil,
  temaFoco,
}: {
  perfil: PerfilNino;
  onVolver: () => void;
  // guarda cambios en el perfil (p.ej. el acuerdo de tutoría recién creado)
  onGuardarPerfil?: (p: PerfilNino) => void;
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
  const finRef = useRef<HTMLDivElement>(null);
  const inicioPedido = useRef(false);
  const inicioSesion = useRef(Date.now());

  const scrollAlFinal = useCallback(() => {
    requestAnimationFrame(() =>
      finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    );
  }, []);

  useEffect(() => {
    scrollAlFinal();
  }, [mensajes, cargando]);

  // Rai INICIA la conversación al entrar (una sola vez).
  useEffect(() => {
    if (inicioPedido.current) return;
    inicioPedido.current = true;
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
      temaFoco, // si viene del mapa: la lección se centra en esta etapa
    };
  }

  function historialPlano(): { de: "rai" | "nino"; texto: string }[] {
    return mensajes.map((m) => ({ de: m.de, texto: m.texto }));
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
      setMensajes([
        {
          de: "rai",
          texto: `Hola ${nombre}, soy ${TUTOR.nombre}. Ahora no pude conectarme, intenta volver en un momento.`,
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

    // Verificar si esta respuesta supera el límite de presupuesto/duración
    const limiteAlcanzado = turnosKid >= 10 || duracionMs >= 25 * 60 * 1000;

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
        }),
      });
      const data = await res.json();

      if (limiteAlcanzado) {
        setSesionTerminada(true);
        setMensajes((m) => [
          ...m,
          {
            de: "rai",
            texto: "¡Hemos aprendido muchísimo hoy y trabajaste excelente! 🌟 Por hoy completamos nuestra meta de estudio. Es hora de descansar un ratito y jugar. ¡Presiona el botón de guardar progreso abajo!",
            modo: "simulado",
          },
        ]);
      } else {
        void agregarRai(data);
        quizasGuardarHorario(data.horario);
      }
    } catch {
      setMensajes((m) => [
        ...m,
        { de: "rai", texto: "No pude conectarme. Intenta de nuevo en un momento." },
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
  }) {
    // Si Rai lanzó una actividad, la resolvemos ANTES de pintar su mensaje y la
    // adjuntamos en el MISMO turno (texto + tarjeta juntos). Así evitamos depender
    // de un índice numérico, que llegaba desfasado.
    const ejercicio = data.ejercicioTema
      ? await obtenerEjercicio(data.ejercicioTema, data.ejercicioFormato)
      : null;
    const sopa = data.sopaTema ? await obtenerSopa(data.sopaTema) : null;
    const rueda = data.ruedaTema ? await obtenerRueda(data.ruedaTema) : null;
    const intruso = data.intrusoTema ? await obtenerIntruso(data.intrusoTema) : null;
    const conector = data.conectorTema
      ? await obtenerConector(data.conectorTema)
      : null;

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
      },
    ]);

    // RED DE SEGURIDAD: Rai prometió una actividad pero no llegó una válida; que
    // no quede el niño esperando un juego que nunca aparece.
    const prometioActividad = !!(
      data.ejercicioTema ||
      data.sopaTema ||
      data.ruedaTema ||
      data.intrusoTema ||
      data.conectorTema
    );
    const llegoActividad = !!(ejercicio || sopa || rueda || intruso || conector);
    if (prometioActividad && !llegoActividad) {
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
  async function obtenerEjercicio(
    tema: string,
    formato: string = "opcion_multiple"
  ): Promise<EjercicioChat | null> {
    try {
      const params = new URLSearchParams({
        materia,
        curso: perfil.curso,
        dificultad: "2",
        tema,
        tipoPlantilla: formato,
      });
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
  async function obtenerSopa(tema: string): Promise<DatosSopa | null> {
    try {
      const params = new URLSearchParams({
        materia,
        curso: perfil.curso,
        dificultad: "2",
        tema,
      });
      const res = await fetch(`/api/sopa/generar?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
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
  async function obtenerRueda(tema: string): Promise<DatosRueda | null> {
    try {
      const params = new URLSearchParams({
        materia,
        curso: perfil.curso,
        dificultad: "2",
        tema,
      });
      const res = await fetch(`/api/rueda/generar?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
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
  async function obtenerIntruso(tema: string): Promise<DatosIntruso | null> {
    try {
      const params = new URLSearchParams({
        materia,
        curso: perfil.curso,
        dificultad: "2",
        tema,
      });
      const res = await fetch(`/api/intruso/generar?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
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
  async function obtenerConector(tema: string): Promise<DatosConector | null> {
    try {
      const params = new URLSearchParams({
        materia,
        curso: perfil.curso,
        dificultad: "2",
        tema,
      });
      const res = await fetch(`/api/conector/generar?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
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

  // Publica las acciones dev en el panel dev GLOBAL mientras el tutor está en
  // pantalla, y las quita al salir. Así los botones viven en un solo lugar (el
  // panel flotante) en vez de ensuciar el chat. Usamos refs para que el efecto no
  // re-registre en cada render (las funciones se recrean).
  const lanzarSopaRef = useRef(lanzarSopaDev);
  const lanzarEjercicioRef = useRef(lanzarEjercicioDev);
  const lanzarRuedaRef = useRef(lanzarRuedaDev);
  const lanzarIntrusoRef = useRef(lanzarIntrusoDev);
  const lanzarConectorRef = useRef(lanzarConectorDev);
  lanzarSopaRef.current = lanzarSopaDev;
  lanzarEjercicioRef.current = lanzarEjercicioDev;
  lanzarRuedaRef.current = lanzarRuedaDev;
  lanzarIntrusoRef.current = lanzarIntrusoDev;
  lanzarConectorRef.current = lanzarConectorDev;
  useEffect(() => {
    if (!devToolsActivas()) return;
    setAccionesDevTutor({
      lanzarSopa: () => void lanzarSopaRef.current(),
      lanzarEjercicio: () => void lanzarEjercicioRef.current("opcion_multiple"),
      lanzarSeleccion: () => void lanzarEjercicioRef.current("seleccion_multiple"),
      lanzarRueda: () => void lanzarRuedaRef.current(),
      lanzarIntruso: () => void lanzarIntrusoRef.current(),
      lanzarConector: () => void lanzarConectorRef.current(),
    });
    return () => setAccionesDevTutor(null);
  }, [setAccionesDevTutor]);

  // El niño responde el ejercicio embebido: marca acierto y registra evidencia.
  // `seleccion` = opciones elegidas. En opción múltiple es 1; en selección
  // múltiple pueden ser varias (se valida el conjunto EXACTO: todo o nada).
  function responderEjercicio(msgIdx: number, seleccion: string[]) {
    const ej = mensajes[msgIdx]?.ejercicio;
    if (!ej || ej.respondido) return;
    const ok = evaluarEjercicio(ej, seleccion);

    setMensajes((m) =>
      m.map((msg, i) =>
        i === msgIdx && msg.ejercicio
          ? { ...msg, ejercicio: { ...msg.ejercicio, respondido: ok ? "ok" : "no" } }
          : msg
      )
    );

    if (acuerdo) {
      // evidencia dura de UN ejercicio en la charla (correctos/total)
      const tutoria = registrarEjercicios(acuerdo, ej.tema, materia, ok ? 1 : 0, 1);
      onGuardarPerfil?.({ ...perfil, tutoria });
    }

    // Si falló, le pedimos a Rai que le explique cuáles eran y por qué, para que
    // aprenda (no solo "incorrecto"). Es un mensaje de sistema al tutor.
    if (!ok) void raiExplicaError(ej, seleccion);
  }

  // El niño respondió "el intruso": registra evidencia y, si falló, Rai explica.
  function responderIntruso(msgIdx: number, acerto: boolean, elegido: string) {
    const it = mensajes[msgIdx]?.intruso;
    if (!it) return;
    if (acuerdo) {
      const tema = it.enunciado.slice(0, 40);
      const tutoria = registrarEjercicios(acuerdo, tema, materia, acerto ? 1 : 0, 1);
      onGuardarPerfil?.({ ...perfil, tutoria });
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
    const tema = c.enunciado.slice(0, 40);
    const tutoria = registrarEjercicios(acuerdo, tema, materia, acerto ? 1 : 0, 1);
    onGuardarPerfil?.({ ...perfil, tutoria });
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
    onGuardarPerfil?.({ ...perfil, tutoria: nuevo });
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
      className="mx-auto flex w-full max-w-zen flex-col px-[22px] md:w-[80%] md:max-w-[900px]"
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
        <AuraOrb materia={materia} activa={cargando} size={compacta ? 60 : 128} />
        {cargando && (
          <span className="text-[14px] italic text-ink-soft animate-pulse">
            Rai está escribiendo…
          </span>
        )}
      </div>

      {/* conversación: solo texto centrado, sin burbujas */}
      <div className="flex flex-1 flex-col gap-7 overflow-y-auto py-4 text-center">
        {mensajes.map((m, i) => (
          <Linea
            key={i}
            m={m}
            // solo el último mensaje de Rai se "escribe"; el resto ya está completo
            animar={m.de === "rai" && i === mensajes.length - 1}
            onTick={scrollAlFinal}
            onResponderEjercicio={(seleccion) => responderEjercicio(i, seleccion)}
            onResponderIntruso={(acerto, elegido) =>
              responderIntruso(i, acerto, elegido)
            }
            onResponderConector={(acerto) => responderConector(i, acerto)}
          />
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

  function enviar() {
    const pregunta = texto.trim();
    if (!pregunta || cargando) return;
    onEnviar(pregunta);
    setTexto("");
  }

  return (
    // input DESTACADO: caja con borde completo, fondo sutil, ~90% del ancho y
    // tipografía más grande — pensado para que el niño lo vea claro en tablet.
    <div className="flex flex-none justify-center py-3">
      <div className="flex w-[90%] items-center gap-2 rounded-2xl border border-hair bg-surface/60 px-3 py-1.5 transition-colors focus-within:border-sage">
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
            esPrimera ? "Responde a Rai…" : `Escríbele a ${tutorNombre}…`
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
}: {
  m: Mensaje;
  animar?: boolean;
  onTick?: () => void;
  onResponderEjercicio?: (seleccion: string[]) => void;
  onResponderIntruso?: (acerto: boolean, elegido: string) => void;
  onResponderConector?: (acerto: boolean) => void;
}) {
  if (m.de === "nino") {
    // el texto del niño en el acento salvia, para distinguirlo del de Rai (tinta)
    return (
      <p className="mx-auto max-w-[30ch] text-[17px] font-[600] leading-[1.4] text-sage-deep">
        {m.texto}
      </p>
    );
  }
  return (
    <div className="mx-auto flex w-[90%] max-w-[40ch] flex-col items-center gap-2">
      <p className="whitespace-pre-line text-[26px] font-serif leading-[1.35] text-ink">
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
        <div className="mt-3 w-[80vw] max-w-[480px]">
          <TarjetaEjercicioChat
            ejercicio={m.ejercicio}
            onResponder={onResponderEjercicio}
          />
        </div>
      )}
      {m.sopa && (
        // escapa el max-w-[40ch] del mensaje para ocupar ~90% de la PANTALLA
        // (con un tope en tablet), centrado bajo el texto de Rai.
        <div className="mt-3 w-[90vw] max-w-[520px]">
          <SopaLetras datos={m.sopa} />
        </div>
      )}
      {m.rueda && (
        <div className="mt-3 w-[85vw] max-w-[420px]">
          <RuedaLetras datos={m.rueda} />
        </div>
      )}
      {m.intruso && (
        <div className="mt-3 w-[85vw] max-w-[480px]">
          <Intruso datos={m.intruso} onResponder={onResponderIntruso} />
        </div>
      )}
      {m.conector && (
        <div className="mt-3 w-[85vw] max-w-[480px]">
          <Conector datos={m.conector} onResponder={onResponderConector} />
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
