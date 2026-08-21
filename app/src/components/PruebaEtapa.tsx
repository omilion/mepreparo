"use client";

import { useEffect, useRef, useState } from "react";
import type { Curso, Materia } from "@/lib/profile";
import { tituloDeTema } from "@/lib/plan/etapas";
import { UMBRAL_PRUEBA_ETAPA, MINIMO_EVALUABLE_PRUEBA } from "@/lib/tutor/acuerdo";
import {
  borrarPruebaEtapaEnCurso,
  guardarPruebaEtapaEnCurso,
  leerPruebaEtapaEnCurso,
} from "@/lib/storage";
import { Reveal } from "./Reveal";
import { Fireworks } from "./Fireworks";

const TOTAL = 8;
const UMBRAL = UMBRAL_PRUEBA_ETAPA;
const MINIMO_EVALUABLE = MINIMO_EVALUABLE_PRUEBA;

interface PreguntaCliente {
  id: string;
  enunciado: string;
  opciones: string[];
}

// Prueba de etapa con checkpoints por respuesta validada. El borrador contiene
// solo conteos, ids ya usados y enunciados fallados: nunca respuestas correctas
// ni tokens de validacion.
export function PruebaEtapa({
  pupiloId,
  materia,
  curso,
  tema,
  onTerminar,
  onContinuar,
  onSalir,
}: {
  pupiloId: string;
  materia: Materia;
  curso: Curso;
  tema: string;
  onTerminar: (correctos: number, total: number, enunciadosFallados: string[]) => void;
  onContinuar: (correctos: number, total: number) => void;
  onSalir: () => void;
}) {
  const [pregunta, setPregunta] = useState<PreguntaCliente | null>(null);
  const [token, setToken] = useState("");
  const [n, setN] = useState(0);
  const [correctos, setCorrectos] = useState(0);
  const [feedback, setFeedback] = useState<{ acierto: boolean; indiceCorrecto: number } | null>(null);
  const [eleccion, setEleccion] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [terminada, setTerminada] = useState(false);
  const [restaurado, setRestaurado] = useState(false);
  const usadas = useRef<string[]>([]);
  const dificultad = useRef(2);
  const respondidasRef = useRef(0);
  const correctosRef = useRef(0);
  const resultadoRegistrado = useRef(false);
  const enviando = useRef(false);
  const falladas = useRef<string[]>([]);

  useEffect(() => {
    const borrador = leerPruebaEtapaEnCurso(pupiloId, materia, curso, tema);
    if (borrador) {
      usadas.current = borrador.usadasIds;
      dificultad.current = borrador.dificultad;
      respondidasRef.current = borrador.respondidas;
      correctosRef.current = borrador.correctos;
      falladas.current = borrador.enunciadosFallados;
      setN(borrador.respondidas);
      setCorrectos(borrador.correctos);
    }
    setRestaurado(true);
  }, [pupiloId, materia, curso, tema]);

  useEffect(() => {
    if (restaurado) void cargarPregunta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurado]);

  function guardarCheckpoint() {
    guardarPruebaEtapaEnCurso({
      pupiloId,
      materia,
      curso,
      tema,
      respondidas: respondidasRef.current,
      correctos: correctosRef.current,
      usadasIds: usadas.current,
      dificultad: dificultad.current,
      enunciadosFallados: falladas.current,
    });
  }

  async function cargarPregunta() {
    if (respondidasRef.current >= TOTAL) {
      finalizar(respondidasRef.current, correctosRef.current);
      return;
    }
    setCargando(true);
    setFeedback(null);
    setEleccion(null);
    enviando.current = false;
    try {
      const params = new URLSearchParams({
        materia,
        curso,
        dificultad: String(dificultad.current),
        tema,
        excluir: usadas.current.join(","),
      });
      const res = await fetch(`/api/diagnostico/pregunta?${params}`);
      const data = await res.json();
      if (!data.pregunta) {
        finalizar(respondidasRef.current, correctosRef.current);
        return;
      }
      setPregunta(data.pregunta);
      setToken(data.token);
    } catch {
      // No inventamos un resultado cuando el servidor no pudo validarlo.
      setPregunta(null);
    } finally {
      setCargando(false);
    }
  }

  async function responder(indice: number) {
    if (feedback || !pregunta || enviando.current) return;
    enviando.current = true;
    setEleccion(indice);
    try {
      const res = await fetch("/api/diagnostico/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preguntaId: pregunta.id, indice, token }),
      });
      const data = await res.json();
      if (!res.ok || typeof data.acierto !== "boolean") throw new Error("RESPUESTA_INVALIDA");

      const nuevasRespondidas = respondidasRef.current + 1;
      respondidasRef.current = nuevasRespondidas;
      usadas.current = [...usadas.current, pregunta.id];
      if (data.acierto) {
        correctosRef.current += 1;
        setCorrectos(correctosRef.current);
        dificultad.current = Math.min(5, dificultad.current + 1);
      } else {
        dificultad.current = Math.max(1, dificultad.current - 1);
        falladas.current = [...falladas.current, pregunta.enunciado];
      }
      setN(nuevasRespondidas);
      guardarCheckpoint();
      setFeedback(data);
    } catch {
      enviando.current = false;
      setEleccion(null);
    }
  }

  function siguiente() {
    if (respondidasRef.current >= TOTAL) {
      finalizar(respondidasRef.current, correctosRef.current);
    } else {
      void cargarPregunta();
    }
  }

  function finalizar(totalRespondidas: number, totalCorrectas: number) {
    if (resultadoRegistrado.current) return;
    resultadoRegistrado.current = true;
    setN(totalRespondidas);
    setCorrectos(totalCorrectas);
    if (totalRespondidas >= MINIMO_EVALUABLE) {
      onTerminar(totalCorrectas, totalRespondidas, falladas.current);
    }
    // La evidencia final ya quedo guardada por onTerminar; un intento no
    // evaluable no debe bloquear una prueba nueva.
    borrarPruebaEtapaEnCurso();
    setTerminada(true);
  }

  if (terminada) {
    const totalReal = Math.max(1, n);
    const evaluable = n >= MINIMO_EVALUABLE;
    const paso = evaluable && correctos / totalReal >= UMBRAL;
    const incompleta = evaluable && n < TOTAL;
    return (
      <div className="zen-page relative flex min-h-[calc(100vh-58px)] flex-col items-center justify-center gap-6 text-center">
        {paso && <Fireworks />}
        <Reveal variant="lead" delay={80}>
          <h1 className="max-w-[16ch] text-[30px]">
            {!evaluable ? "Todavía no hay prueba" : paso ? "¡Etapa superada!" : "Buen intento"}
          </h1>
        </Reveal>
        <Reveal delay={420}>
          <p className="max-w-[36ch] text-[15px] leading-[1.5] text-ink-soft">
            {!evaluable
              ? `Aún no tenemos preguntas suficientes de ${tituloDeTema(tema)} para tomarte la prueba. No es culpa tuya: sigue estudiando este tema con Rai y volvemos pronto.`
              : paso
                ? `Respondiste bien ${correctos} de ${totalReal} en ${tituloDeTema(tema)}.${
                    incompleta ? ` (De este tema había ${totalReal} preguntas.)` : ""
                  } Rai lo va a recordar.`
                : `Lograste ${correctos} de ${totalReal} en ${tituloDeTema(tema)}. No pasa nada: Rai lo va a repasar contigo con otro enfoque la próxima clase, y cuando hayan practicado un poco más, lo vuelves a intentar.`}
          </p>
        </Reveal>
        <Reveal delay={560}>
          <button onClick={() => (evaluable ? onContinuar(correctos, totalReal) : onSalir())} className="cta px-9">
            Volver a mi camino
          </button>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="zen-page flex min-h-[calc(100vh-58px)] flex-col pb-16">
      <div className="flex items-center justify-between py-2">
        <button
          onClick={() => {
            if (window.confirm("¿Salir de la prueba? Tu avance validado queda guardado para retomarlo después.")) onSalir();
          }}
          aria-label="Salir de la prueba"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:text-ink"
        >
          ←
        </button>
        <span className="text-[12px] uppercase tracking-wider text-sage-deep">
          Prueba · {n + 1} de {TOTAL}
        </span>
        <span className="w-9" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
        {cargando ? (
          <p className="text-[15px] italic text-ink-soft">Preparando tu pregunta…</p>
        ) : !pregunta ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-[15px] text-ink-soft">No pudimos preparar la siguiente pregunta.</p>
            <button onClick={() => void cargarPregunta()} className="cta px-7">Intentar de nuevo</button>
          </div>
        ) : (
          <>
            <p className="mx-auto max-w-[30ch] font-serif text-[23px] leading-[1.3] text-ink">{pregunta.enunciado}</p>
            <div className="flex w-full max-w-[360px] flex-col gap-2.5 md:max-w-[480px]">
              {pregunta.opciones.map((op, i) => {
                const esCorrecta = feedback && i === feedback.indiceCorrecto;
                const esElegidaMala = feedback && i === eleccion && !feedback.acierto;
                return (
                  <button
                    key={i}
                    onClick={() => responder(i)}
                    disabled={!!feedback || enviando.current}
                    className={
                      "rounded-xl border px-4 py-3 text-[15px] transition-colors " +
                      (esCorrecta
                        ? "border-sage bg-sage/10 text-ink"
                        : esElegidaMala
                          ? "border-clay/50 text-ink-soft"
                          : "border-hair text-ink enabled:hover:border-sage disabled:opacity-60")
                    }
                  >
                    {op}
                  </button>
                );
              })}
            </div>
            {feedback && (
              <div className="flex flex-col items-center gap-3">
                <p className={"text-[15px] " + (feedback.acierto ? "text-sage-deep" : "text-clay")}>
                  {feedback.acierto ? "¡Muy bien!" : "Casi — mira cuál era."}
                </p>
                <button onClick={siguiente} className="cta px-8">
                  {n >= TOTAL ? "Ver mi resultado" : "Siguiente"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
