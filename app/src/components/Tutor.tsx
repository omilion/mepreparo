"use client";

import { useEffect, useRef, useState } from "react";
import { type PerfilNino } from "@/lib/profile";
import { TUTOR } from "@/lib/tutor/personaje";
import { resumenPerfil } from "@/lib/tutor/resumenPerfil";
import { materiasDeHoy, diaDeHoy, type AcuerdoTutoria } from "@/lib/tutor/acuerdo";
import { AuraOrb } from "./AuraOrb";
import { TextoRevelado } from "./TextoRevelado";

interface Mensaje {
  de: "rai" | "nino";
  texto: string;
  fuentes?: string[];
  modo?: "gemini" | "simulado";
}

export function Tutor({
  perfil,
  onVolver,
  onGuardarPerfil,
}: {
  perfil: PerfilNino;
  onVolver: () => void;
  // guarda cambios en el perfil (p.ej. el acuerdo de tutoría recién creado)
  onGuardarPerfil?: (p: PerfilNino) => void;
}) {
  const nombre = perfil.nombre.trim() || "tú";
  const acuerdo = perfil.tutoria ?? null;
  const esPrimera = !acuerdo;

  // materia activa (para el color de la esfera y el RAG): la que toca hoy según
  // el horario; si hoy no hay, la primera del examen. Rai la maneja, no el niño.
  const materiasHoy = acuerdo ? materiasDeHoy(acuerdo) : [];
  const materia = materiasHoy[0] ?? perfil.examen.materias[0];
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  // la esfera empieza grande y centrada; tras la 1ª respuesta del niño sube a
  // la esquina para dar espacio a la conversación (transición fluida).
  const [compacta, setCompacta] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const inicioPedido = useRef(false);
  const inicioSesion = useRef(Date.now());

  function scrollAlFinal() {
    requestAnimationFrame(() =>
      finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    );
  }

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
      agregarRai(data);
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

  async function enviar() {
    const pregunta = texto.trim();
    if (!pregunta || cargando) return;
    const historial = [...historialPlano(), { de: "nino" as const, texto: pregunta }];
    setMensajes((m) => [...m, { de: "nino", texto: pregunta }]);
    setTexto("");
    setCargando(true);
    setCompacta(true); // primera (y siguientes) respuestas: esfera a la esquina

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
      agregarRai(data);
      quizasGuardarHorario(data.horario);
    } catch {
      setMensajes((m) => [
        ...m,
        { de: "rai", texto: "No pude conectarme. Intenta de nuevo en un momento." },
      ]);
    } finally {
      setCargando(false);
    }
  }

  function agregarRai(data: {
    respuesta?: string;
    fuentes?: string[];
    modo?: "gemini" | "simulado";
  }) {
    setMensajes((m) => [
      ...m,
      {
        de: "rai",
        texto: data.respuesta ?? "Ups, no pude responder ahora.",
        fuentes: data.fuentes,
        modo: data.modo,
      },
    ]);
  }

  // Si Rai cerró el acuerdo de horario, lo guardamos en el perfil.
  function quizasGuardarHorario(horario?: AcuerdoTutoria["horario"]) {
    if (!horario || perfil.tutoria) return; // solo la primera vez
    const nuevo: AcuerdoTutoria = {
      creadoEn: new Date().toISOString(),
      horario,
      notasNino: "",
      sesiones: [],
    };
    onGuardarPerfil?.({ ...perfil, tutoria: nuevo });
  }

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

      const nuevasSesiones = [...(acuerdo.sesiones || []), nuevaSesion];
      const tutoriaActualizada = {
        ...acuerdo,
        notasNino: data.notasNino || acuerdo.notasNino,
        sesiones: nuevasSesiones,
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
    <div className="mx-auto flex h-screen max-w-zen flex-col px-[22px]">
      {/* barra mínima: solo volver. Pantalla inmersiva, sin logo ni ajustes. */}
      <div className="flex items-center py-2">
        <button
          type="button"
          onClick={manejarVolver}
          aria-label="Volver"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:text-ink"
        >
          ←
        </button>
      </div>

      {/* la presencia: esfera centrada+grande al inicio; tras la 1ª respuesta
          del niño se encoge y sube a la esquina para abrir espacio al texto. */}
      <div
        className={
          "flex transition-all duration-700 ease-in-out " +
          (compacta
            ? "justify-start pt-0 pb-2"
            : "justify-center pt-6 pb-4")
        }
      >
        <AuraOrb materia={materia} activa={cargando} size={compacta ? 60 : 128} />
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
          />
        ))}
        {cargando && (
          <p className="text-[15px] italic text-ink-soft">
            {TUTOR.nombre} está escribiendo…
          </p>
        )}
        <div ref={finRef} />
      </div>

      {/* caja de escribir abajo, discreta */}
      <div className="flex items-center gap-2.5 py-3">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
          placeholder={
            esPrimera
              ? "Responde a Rai…"
              : `Escríbele a ${TUTOR.nombre}…`
          }
          className="flex-1 border-b border-hair bg-transparent px-1 py-2.5 text-center text-[16px] text-ink outline-none transition-colors focus:border-sage"
        />
        <button
          type="button"
          onClick={enviar}
          disabled={!texto.trim() || cargando}
          aria-label="Enviar"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-sage-deep transition-opacity hover:opacity-70 disabled:opacity-30"
        >
          ↑
        </button>
      </div>
    </div>
  );
}

// Una línea de conversación, solo texto. El texto de Rai es más grande que las
// preguntas del diagnóstico (23px) para que la charla se sienta protagonista.
// `animar` = revelar por palabras (solo el último mensaje recién llegado).
function Linea({
  m,
  animar = false,
  onTick,
}: {
  m: Mensaje;
  animar?: boolean;
  onTick?: () => void;
}) {
  if (m.de === "nino") {
    return (
      <p className="mx-auto max-w-[30ch] text-[17px] font-[560] leading-[1.4] text-ink-soft">
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
    </div>
  );
}
