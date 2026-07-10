"use client";

import { useEffect, useRef, useState } from "react";
import type { Curso, Materia } from "@/lib/profile";
import { tituloDeTema } from "@/lib/plan/etapas";
import { Reveal } from "./Reveal";
import { Fireworks } from "./Fireworks";

// La "prueba" de una etapa del camino: 5 preguntas del banco SOLO de ese tema.
// ≥80% (4 de 5) supera la etapa; menos = refuerzo con Rai, sin castigo.
// Las respuestas se validan en el servidor (HMAC), igual que el diagnóstico.

const TOTAL = 5;
const UMBRAL = 0.8;

interface PreguntaCliente {
  id: string;
  enunciado: string;
  opciones: string[];
}

export function PruebaEtapa({
  materia,
  curso,
  tema,
  onTerminar,
  onSalir,
}: {
  materia: Materia;
  curso: Curso;
  tema: string;
  // reporta el resultado para registrar la evidencia y volver al mapa
  onTerminar: (correctos: number, total: number) => void;
  onSalir: () => void;
}) {
  const [pregunta, setPregunta] = useState<PreguntaCliente | null>(null);
  const [token, setToken] = useState("");
  const [n, setN] = useState(0); // respondidas
  const [correctos, setCorrectos] = useState(0);
  const [feedback, setFeedback] = useState<{ acierto: boolean; indiceCorrecto: number } | null>(null);
  const [eleccion, setEleccion] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [terminada, setTerminada] = useState(false);
  const usadas = useRef<string[]>([]);
  const dificultad = useRef(2); // mini-adaptativo: sube al acertar, baja al fallar

  useEffect(() => {
    void cargarPregunta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarPregunta() {
    setCargando(true);
    setFeedback(null);
    setEleccion(null);
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
        // se acabaron las preguntas del tema: terminamos con lo respondido
        setTerminada(true);
        setCargando(false);
        return;
      }
      usadas.current.push(data.pregunta.id);
      setPregunta(data.pregunta);
      setToken(data.token);
    } catch {
      setTerminada(true);
    } finally {
      setCargando(false);
    }
  }

  async function responder(indice: number) {
    if (feedback || !pregunta) return;
    setEleccion(indice);
    try {
      const res = await fetch("/api/diagnostico/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preguntaId: pregunta.id, indice, token }),
      });
      const data = await res.json();
      setFeedback(data);
      if (data.acierto) {
        setCorrectos((c) => c + 1);
        dificultad.current = Math.min(5, dificultad.current + 1);
      } else {
        dificultad.current = Math.max(1, dificultad.current - 1);
      }
    } catch {
      /* si falla la validación, no contamos la pregunta */
    }
  }

  function siguiente() {
    const respondidas = n + 1;
    setN(respondidas);
    if (respondidas >= TOTAL) {
      setTerminada(true);
    } else {
      void cargarPregunta();
    }
  }

  // --- pantalla final ---
  if (terminada) {
    // n = preguntas respondidas (puede ser <5 si el banco se agotó)
    const totalReal = Math.max(1, n);
    const paso = correctos / totalReal >= UMBRAL && totalReal >= 4;
    return (
      <div className="relative mx-auto flex min-h-[calc(100vh-58px)] max-w-zen flex-col items-center justify-center gap-6 px-[22px] text-center">
        {paso && <Fireworks />}
        <Reveal variant="lead" delay={80}>
          <h1 className="max-w-[16ch] text-[30px]">
            {paso ? "¡Etapa superada!" : "Buen intento"}
          </h1>
        </Reveal>
        <Reveal delay={420}>
          <p className="max-w-[36ch] text-[15px] leading-[1.5] text-ink-soft">
            {paso
              ? `Respondiste bien ${correctos} de ${totalReal} en ${tituloDeTema(tema)}. Rai lo va a recordar.`
              : `Lograste ${correctos} de ${totalReal} en ${tituloDeTema(tema)}. No pasa nada: Rai lo va a repasar contigo con otro enfoque y lo intentas de nuevo cuando quieras.`}
          </p>
        </Reveal>
        <Reveal delay={560}>
          <button onClick={() => onTerminar(correctos, totalReal)} className="cta px-9">
            Volver a mi camino
          </button>
        </Reveal>
      </div>
    );
  }

  // --- pregunta en curso ---
  return (
    <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-zen flex-col px-[22px] pb-16">
      <div className="flex items-center justify-between py-2">
        <button
          onClick={onSalir}
          aria-label="Salir de la prueba"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:text-ink"
        >
          ←
        </button>
        <span className="text-[12px] uppercase tracking-wider text-sage-deep">
          Prueba · {tituloDeTema(tema)} · {n + 1} de {TOTAL}
        </span>
        <span className="w-9" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
        {cargando || !pregunta ? (
          <p className="text-[15px] italic text-ink-soft">Preparando tu pregunta…</p>
        ) : (
          <>
            <p className="mx-auto max-w-[30ch] font-serif text-[23px] leading-[1.3] text-ink">
              {pregunta.enunciado}
            </p>
            <div className="flex w-full max-w-[360px] flex-col gap-2.5">
              {pregunta.opciones.map((op, i) => {
                const esCorrecta = feedback && i === feedback.indiceCorrecto;
                const esElegidaMala = feedback && i === eleccion && !feedback.acierto;
                return (
                  <button
                    key={i}
                    onClick={() => responder(i)}
                    disabled={!!feedback}
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
                  {n + 1 >= TOTAL ? "Ver mi resultado" : "Siguiente"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
