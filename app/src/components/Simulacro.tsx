"use client";

import { useEffect, useRef, useState } from "react";
import type { Curso, Materia } from "@/lib/profile";
import { UMBRAL_SIMULACRO_CIERRE, type AcuerdoTutoria } from "@/lib/tutor/acuerdo";
import { rutaDeTemas, tituloDeTema } from "@/lib/plan/etapas";
import { avisarEvento } from "@/lib/telemetriaCliente";
import {
  borrarSimulacroEnCurso,
  guardarSimulacroEnCurso,
  leerSimulacroEnCurso,
} from "@/lib/storage";
import { Reveal } from "./Reveal";
import { Fireworks } from "./Fireworks";

// El simulacro de examen: 20-30 preguntas MIXTAS de todos los temas de la
// materia, cronometrado, SIN ayuda de Rai y SIN feedback pregunta a pregunta
// (a diferencia de PruebaEtapa). Solo al final se revela el resultado, con
// desglose por tema y un comentario de Rai. Es la evidencia más dura que
// guardamos: por eso cada tema exige más preguntas mínimas que una prueba de
// etapa (10 respondidas en total, no 2).

const MIN_PREGUNTAS = 20;
// 4 preguntas por tema es lo que exige registrarSimulacro para dar un tema por
// superado. Con 3 el simulacro solo podía BAJAR un tema a "le_cuesta", nunca
// subirlo: un niño que rendía perfecto no avanzaba ninguna etapa. El tope sale
// de la materia con más temas del banco (matemática de 3°, 4° y 6°: 9 temas).
const PREGUNTAS_POR_TEMA = 4;
const MAX_PREGUNTAS = 36;
const SEGUNDOS_POR_PREGUNTA = 40;
export const MINIMO_EVALUABLE_SIMULACRO = 10;

interface PreguntaCliente {
  id: string;
  enunciado: string;
  opciones: string[];
}

interface ResultadoTema {
  tema: string;
  acierto: boolean;
}

export interface DesgloseSimulacro {
  tema: string;
  correctos: number;
  total: number;
}

function dificultadInicial(tema: string, materia: Materia, acuerdo?: AcuerdoTutoria | null): number {
  const dominio = acuerdo?.temas?.find((t) => t.tema === tema && t.materia === materia);
  if (dominio?.estado === "le_cuesta") return 2;
  if (dominio?.estado === "superado") return 4;
  return 3;
}

function formatoTiempo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function Simulacro({
  materia,
  curso,
  nombre,
  acuerdo,
  pupiloId,
  numeroCierre,
  onRegistrar,
  onContinuar,
  onSalir,
}: {
  materia: Materia;
  curso: Curso;
  nombre: string;
  acuerdo?: AcuerdoTutoria | null;
  pupiloId?: string;
  numeroCierre?: 1 | 2;
  // Persistir y navegar son actos distintos: al aparecer el resultado ya quedó
  // registrado; el botón final solo lleva al siguiente estado del camino.
  onRegistrar: (desglose: DesgloseSimulacro[], correctos: number, total: number) => void;
  onContinuar: (correctos: number, total: number, numeroCierre?: 1 | 2) => void;
  onSalir: () => void;
}) {
  const temas = useRef(rutaDeTemas(materia, curso, acuerdo)).current;
  const numeroCierreInicial = useRef(numeroCierre).current;
  const totalPreguntas = useRef(
    temas.length === 0
      ? 0
      : Math.min(MAX_PREGUNTAS, Math.max(MIN_PREGUNTAS, temas.length * PREGUNTAS_POR_TEMA))
  ).current;
  const cola = useRef(
    Array.from({ length: totalPreguntas }, (_, i) => temas[i % Math.max(1, temas.length)])
  ).current;

  const [pregunta, setPregunta] = useState<PreguntaCliente | null>(null);
  const [token, setToken] = useState("");
  const [temaActual, setTemaActual] = useState<string>("");
  const [respondidas, setRespondidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [terminada, setTerminada] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(totalPreguntas * SEGUNDOS_POR_PREGUNTA);
  const [comentarioRai, setComentarioRai] = useState("");
  const [cargandoComentario, setCargandoComentario] = useState(false);
  const [restaurado, setRestaurado] = useState(false);

  const puntero = useRef(0);
  const usadasPorTema = useRef<Record<string, string[]>>({});
  const resultados = useRef<ResultadoTema[]>([]);
  const fallidasSeguidas = useRef(0);
  const enviando = useRef(false);
  const terminadaRef = useRef(false);
  const deadline = useRef(Date.now() + totalPreguntas * SEGUNDOS_POR_PREGUNTA * 1000);
  const ultimoResultado = useRef<{ desglose: DesgloseSimulacro[]; correctos: number; total: number }>({
    desglose: [],
    correctos: 0,
    total: 0,
  });

  useEffect(() => {
    const borrador = pupiloId
      ? leerSimulacroEnCurso(
          pupiloId,
          materia,
          curso,
          temas,
          totalPreguntas,
          numeroCierreInicial
        )
      : null;
    if (borrador) {
      puntero.current = borrador.puntero;
      usadasPorTema.current = borrador.usadasPorTema;
      resultados.current = borrador.resultados;
      deadline.current = borrador.deadlineMs;
      setRespondidas(borrador.resultados.length);
      setSegundosRestantes(Math.max(0, Math.ceil((borrador.deadlineMs - Date.now()) / 1000)));
    }
    setRestaurado(true);
  }, [pupiloId, materia, curso, temas, totalPreguntas, numeroCierreInicial]);

  useEffect(() => {
    if (!restaurado) return;
    if (temas.length === 0) {
      setTerminada(true);
      setCargando(false);
      return;
    }
    void cargarPregunta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurado]);

  function guardarCheckpoint() {
    if (!pupiloId) return;
    guardarSimulacroEnCurso({
      pupiloId,
      materia,
      curso,
      temas,
      totalPreguntas,
      puntero: puntero.current,
      usadasPorTema: usadasPorTema.current,
      resultados: resultados.current,
      deadlineMs: deadline.current,
      numeroCierre: numeroCierreInicial,
    });
  }

  // cronómetro: baja cada segundo; al llegar a 0, termina con lo respondido
  useEffect(() => {
    if (!restaurado || terminada || temas.length === 0) return;
    const actualizarReloj = () => {
      const restantes = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSegundosRestantes(restantes);
      if (restantes <= 0) void terminar();
      return restantes;
    };
    if (actualizarReloj() <= 0) return;
    const id = setInterval(() => {
      if (actualizarReloj() <= 0) {
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurado, terminada]);

  async function cargarPregunta() {
    if (puntero.current >= cola.length) {
      await terminar();
      return;
    }
    setCargando(true);
    const tema = cola[puntero.current];
    const dificultad = dificultadInicial(tema, materia, acuerdo);
    try {
      const usadas = usadasPorTema.current[tema] ?? [];
      const params = new URLSearchParams({
        materia,
        curso,
        dificultad: String(dificultad),
        tema,
        excluir: usadas.join(","),
      });
      const res = await fetch(`/api/diagnostico/pregunta?${params}`);
      const data = await res.json();
      if (!data.pregunta) {
        // este tema se quedó sin preguntas: saltamos el turno, no lo contamos
        fallidasSeguidas.current++;
        puntero.current++;
        guardarCheckpoint();
        if (fallidasSeguidas.current >= 4) {
          await terminar();
          return;
        }
        void cargarPregunta();
        return;
      }
      fallidasSeguidas.current = 0;
      setPregunta(data.pregunta);
      setToken(data.token);
      setTemaActual(tema);
      enviando.current = false; // recién ahora hay una pregunta nueva que responder
    } catch {
      fallidasSeguidas.current++;
      puntero.current++;
      guardarCheckpoint();
      if (fallidasSeguidas.current >= 4) {
        await terminar();
        return;
      }
      void cargarPregunta();
      return;
    } finally {
      setCargando(false);
    }
  }

  // Responde sin mostrar si acertó. Solo persiste cuando el servidor terminó
  // de validar, por lo que una recarga no duplica ni inventa puntaje.
  async function responder(indice: number) {
    if (!pregunta || enviando.current) return;
    enviando.current = true;
    const tema = temaActual;
    setCargando(true);
    let acierto = false;
    try {
      const res = await fetch("/api/diagnostico/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preguntaId: pregunta.id, indice, token }),
      });
      const data = await res.json();
      acierto = res.ok && !!data.acierto;
    } catch {
      // Misma regla previa: un error de validación no concede puntaje.
      acierto = false;
    }

    resultados.current = [...resultados.current, { tema, acierto }];
    usadasPorTema.current[tema] = [...(usadasPorTema.current[tema] ?? []), pregunta.id];
    puntero.current++;
    setRespondidas(resultados.current.length);
    guardarCheckpoint();

    if (puntero.current >= cola.length) {
      await terminar();
    } else {
      await cargarPregunta();
    }
  }

  async function terminar() {
    if (terminadaRef.current) return;
    terminadaRef.current = true;
    setCargando(true);

    const lista = resultados.current;
    const desglose: DesgloseSimulacro[] = temas
      .map((tema) => {
        const deTema = lista.filter((r) => r.tema === tema);
        return { tema, total: deTema.length, correctos: deTema.filter((r) => r.acierto).length };
      })
      .filter((d) => d.total > 0);

    const correctos = lista.filter((r) => r.acierto).length;
    const total = lista.length;

    // guarda para el botón "seguir" (cierre de la pantalla final)
    ultimoResultado.current = { desglose, correctos, total };

    // Un resultado visible ya es un resultado guardado. Los intentos demasiado
    // cortos no cuentan como evidencia ni consumen un ciclo de cierre.
    if (total >= MINIMO_EVALUABLE_SIMULACRO) {
      onRegistrar(desglose, correctos, total);
    }

    borrarSimulacroEnCurso();

    setTerminada(true);
    setCargando(false);

    if (total > 0) {
      avisarEvento("simulacro_completado", { pupiloId, materia, meta: { correctos, total } });
    }

    if (total >= MINIMO_EVALUABLE_SIMULACRO) {
      setCargandoComentario(true);
      try {
        const res = await fetch("/api/simulacro/comentario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, materia, correctos, total, desglose }),
        });
        const data = await res.json();
        setComentarioRai(data.respuesta || "");
      } catch {
        /* sin comentario no se bloquea la pantalla final */
      } finally {
        setCargandoComentario(false);
      }
    }
  }

  // --- pantalla final ---
  if (terminada) {
    const { desglose, correctos, total } = ultimoResultado.current;
    const evaluable = total >= MINIMO_EVALUABLE_SIMULACRO;
    const ratio = total > 0 ? correctos / total : 0;
    const bien = evaluable && ratio >= UMBRAL_SIMULACRO_CIERRE;
    const esCierre = numeroCierreInicial !== undefined;
    const segundoSinUmbral = evaluable && numeroCierreInicial === 2 && !bien;

    if (temas.length === 0) {
      return (
        <div className="zen-page flex min-h-[calc(100vh-58px)] flex-col items-center justify-center gap-6 text-center">
          <Reveal variant="lead" delay={80}>
            <h1 className="max-w-[18ch] text-[26px]">Todavía no hay simulacro</h1>
          </Reveal>
          <Reveal delay={300}>
            <p className="max-w-[36ch] text-[15px] leading-[1.5] text-ink-soft">
              Aún no tenemos un camino armado para esta materia. Sigue estudiando con
              Rai y pronto vas a poder rendir tu simulacro.
            </p>
          </Reveal>
          <Reveal delay={440}>
            <button onClick={onSalir} className="cta px-9">
              Volver a mi camino
            </button>
          </Reveal>
        </div>
      );
    }

    return (
      <div className="zen-page relative flex min-h-[calc(100vh-58px)] flex-col items-center justify-center gap-6 px-4 pb-16 text-center">
        {bien && <Fireworks />}
        <Reveal variant="lead" delay={80}>
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Simulacro terminado
          </div>
        </Reveal>
        <Reveal variant="lead" delay={140}>
          <h1 className="max-w-[18ch] text-[28px]">
            {!evaluable
              ? "Buen intento"
              : bien
                ? esCierre
                  ? "¡Materia confirmada!"
                  : "¡Muy buen resultado!"
                : segundoSinUmbral
                  ? "Ciclo completado"
                  : "Buen esfuerzo"}
          </h1>
        </Reveal>
        <Reveal delay={280}>
          <p className="text-[15px] text-ink-soft">
            {evaluable
              ? segundoSinUmbral
                ? `Respondiste bien ${correctos} de ${total} preguntas. Cerraste este ciclo y Rai seguirá reforzando contigo los temas que aún necesitan apoyo.`
                : `Respondiste bien ${correctos} de ${total} preguntas.`
              : `Alcanzaste a responder ${total} preguntas. Necesitamos al menos ${MINIMO_EVALUABLE_SIMULACRO} para que el simulacro cuente como evidencia.`}
          </p>
        </Reveal>

        {evaluable && desglose.length > 0 && (
          <Reveal delay={400}>
            <div className="flex w-full max-w-[380px] flex-col gap-2 rounded-xl border border-hair p-4 text-left">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Por tema
              </div>
              {desglose.map((d) => (
                <div key={d.tema} className="flex items-center justify-between text-[13.5px]">
                  <span className="text-ink">{tituloDeTema(d.tema)}</span>
                  <span className={d.correctos / d.total >= 0.6 ? "text-sage-deep" : "text-clay"}>
                    {d.correctos}/{d.total}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        )}

        {evaluable && (
          <Reveal delay={520}>
            <div className="max-w-[38ch] rounded-xl bg-sage/5 p-4 text-[14px] italic leading-[1.5] text-ink">
              {cargandoComentario ? "Rai está pensando qué decirte…" : comentarioRai || "Rai va a recordar este resultado para la próxima sesión."}
            </div>
          </Reveal>
        )}

        <Reveal delay={640}>
          <button
            onClick={() => onContinuar(correctos, total, numeroCierreInicial)}
            className="cta px-9"
          >
            Volver a mi camino
          </button>
        </Reveal>
      </div>
    );
  }

  // --- pregunta en curso ---
  return (
    <div className="zen-page flex min-h-[calc(100vh-58px)] flex-col pb-16">
      <div className="flex items-center justify-between py-2">
        <button
          onClick={() => {
            if (window.confirm("¿Salir del simulacro? Tus respuestas validadas quedan guardadas para retomarlo después.")) {
              onSalir();
            }
          }}
          aria-label="Salir del simulacro"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:text-ink"
        >
          ←
        </button>
        <span className="flex flex-col items-center text-[12px] uppercase tracking-wider text-sage-deep">
          <span>Simulacro · {respondidas + 1} de {totalPreguntas}</span>
        </span>
        <span
          className={
            "w-14 text-right text-[12.5px] tabular-nums " +
            (segundosRestantes <= 60 ? "text-clay" : "text-ink-soft")
          }
        >
          {formatoTiempo(segundosRestantes)}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
        {cargando || !pregunta ? (
          <p className="text-[15px] italic text-ink-soft">Preparando tu pregunta…</p>
        ) : (
          <>
            <p className="mx-auto max-w-[30ch] font-serif text-[23px] leading-[1.3] text-ink">
              {pregunta.enunciado}
            </p>
            <div className="flex w-full max-w-[360px] flex-col gap-2.5 md:max-w-[480px]">
              {pregunta.opciones.map((op, i) => (
                <button
                  key={i}
                  onClick={() => responder(i)}
                  className="rounded-xl border border-hair px-4 py-3 text-[15px] text-ink transition-colors hover:border-sage"
                >
                  {op}
                </button>
              ))}
            </div>
            <p className="text-[12.5px] text-ink-soft">
              Sin ayuda de Rai por ahora — vas a ver el resultado al final.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
