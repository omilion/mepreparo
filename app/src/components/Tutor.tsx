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

interface EjercicioChat {
  tema: string;
  enunciado: string;
  opciones: string[];
  respuestaFinal: string;
  respondido?: "ok" | "no";
}

interface Mensaje {
  de: "rai" | "nino";
  texto: string;
  fuentes?: string[];
  modo?: "gemini" | "simulado";
  // si Rai lanzó un ejercicio en este turno, va embebido bajo su texto
  ejercicio?: EjercicioChat;
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
        agregarRai(data);
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

  function agregarRai(data: {
    respuesta?: string;
    fuentes?: string[];
    modo?: "gemini" | "simulado";
    ejercicioTema?: string;
  }) {
    const idx = { current: -1 };
    setMensajes((m) => {
      idx.current = m.length;
      return [
        ...m,
        {
          de: "rai",
          texto: data.respuesta ?? "Ups, no pude responder ahora.",
          fuentes: data.fuentes,
          modo: data.modo,
        },
      ];
    });
    // si Rai lanzó un ejercicio, lo pedimos a la biblioteca y lo adjuntamos
    if (data.ejercicioTema) {
      void cargarEjercicioEnChat(data.ejercicioTema, idx.current);
    }
  }

  // Pide un ejercicio del tema a la biblioteca validada y lo adjunta al mensaje.
  async function cargarEjercicioEnChat(tema: string, msgIdx: number) {
    try {
      const params = new URLSearchParams({
        materia,
        curso: perfil.curso,
        dificultad: "2",
        tema,
      });
      const res = await fetch(`/api/ejercicios/obtener?${params}`);
      const data = await res.json();
      const e = data.ejercicio;
      if (!e) return;
      const ejercicio: EjercicioChat = {
        tema,
        enunciado: rellenar(e.enunciado, e.datos?.variables),
        opciones: e.datos?.opciones ?? e.opciones ?? [],
        respuestaFinal: String(e.respuestaFinal ?? ""),
      };
      if (ejercicio.opciones.length < 2) return; // ejercicio inválido: lo omitimos
      setMensajes((m) =>
        m.map((msg, i) => (i === msgIdx ? { ...msg, ejercicio } : msg))
      );
    } catch {
      /* si falla, la charla sigue sin ejercicio */
    }
  }

  // El niño responde el ejercicio embebido: marca acierto y registra evidencia.
  function responderEjercicio(msgIdx: number, opcion: string) {
    setMensajes((m) =>
      m.map((msg, i) => {
        if (i !== msgIdx || !msg.ejercicio || msg.ejercicio.respondido) return msg;
        const ok = opcion === msg.ejercicio.respuestaFinal;
        return { ...msg, ejercicio: { ...msg.ejercicio, respondido: ok ? "ok" : "no" } };
      })
    );
    const ej = mensajes[msgIdx]?.ejercicio;
    if (ej && !ej.respondido && acuerdo) {
      const ok = opcion === ej.respuestaFinal;
      // evidencia dura de UN ejercicio en la charla (correctos/total)
      const tutoria = registrarEjercicios(acuerdo, ej.tema, materia, ok ? 1 : 0, 1);
      onGuardarPerfil?.({ ...perfil, tutoria });
    }
  }

  // Si Rai cerró el acuerdo de horario, lo guardamos en el perfil.
  // Al crearlo, sembramos la memoria por tema desde el diagnóstico: así Rai
  // sabe desde el día 1 qué le cuesta al niño ("brecha detectada").
  function quizasGuardarHorario(horario?: AcuerdoTutoria["horario"]) {
    if (!horario || perfil.tutoria) return; // solo la primera vez
    const base: AcuerdoTutoria = {
      creadoEn: new Date().toISOString(),
      horario,
      notasNino: "",
      sesiones: [],
    };
    const nuevo = sembrarTemasDesdeDiagnostico(base, perfil.diagnostico);
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
    <div className="mx-auto flex h-screen max-w-zen flex-col px-[22px]">
      {/* Barra superior de herramientas idéntica a otras vistas */}
      <div className="flex h-[58px] items-center justify-end gap-2.5">
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
            onResponderEjercicio={(op) => responderEjercicio(i, op)}
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
        <CajaTexto
          onEnviar={enviar}
          cargando={cargando}
          esPrimera={esPrimera}
          tutorNombre={TUTOR.nombre}
        />
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
    <div className="flex items-center gap-2.5 py-3">
      <input
        type="text"
        value={texto}
        disabled={cargando}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && enviar()}
        placeholder={
          esPrimera
            ? "Responde a Rai…"
            : `Escríbele a ${tutorNombre}…`
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
}: {
  m: Mensaje;
  animar?: boolean;
  onTick?: () => void;
  onResponderEjercicio?: (opcion: string) => void;
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
      {m.ejercicio && (
        <TarjetaEjercicioChat
          ejercicio={m.ejercicio}
          onResponder={onResponderEjercicio}
        />
      )}
    </div>
  );
});

// Tarjeta de ejercicio embebida en la conversación con Rai.
function TarjetaEjercicioChat({
  ejercicio,
  onResponder,
}: {
  ejercicio: EjercicioChat;
  onResponder?: (opcion: string) => void;
}) {
  const resuelto = !!ejercicio.respondido;
  return (
    <div className="mt-3 w-full rounded-2xl border border-hair bg-surface/50 p-4 text-center">
      <p className="mb-3 font-serif text-[17px] leading-[1.3] text-ink">
        {ejercicio.enunciado}
      </p>
      <div className="flex flex-col gap-2">
        {ejercicio.opciones.map((op, i) => {
          const esCorrecta = op === ejercicio.respuestaFinal;
          const marca = resuelto && esCorrecta;
          const marcaMal =
            ejercicio.respondido === "no" && !esCorrecta;
          return (
            <button
              key={i}
              onClick={() => !resuelto && onResponder?.(op)}
              disabled={resuelto}
              className={
                "rounded-xl border px-3 py-2 text-[14px] transition-colors " +
                (marca
                  ? "border-sage bg-sage/10 text-ink"
                  : marcaMal
                    ? "border-hair text-ink-soft opacity-50"
                    : "border-hair text-ink enabled:hover:border-sage disabled:opacity-60")
              }
            >
              {op}
            </button>
          );
        })}
      </div>
      {resuelto && (
        <p
          className={
            "mt-3 text-[13px] " +
            (ejercicio.respondido === "ok" ? "text-sage-deep" : "text-clay")
          }
        >
          {ejercicio.respondido === "ok"
            ? "¡Correcto! 🎉"
            : `La respuesta era ${ejercicio.respuestaFinal}.`}
        </p>
      )}
    </div>
  );
}
