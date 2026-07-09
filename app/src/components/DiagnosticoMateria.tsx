"use client";

import { useEffect, useState } from "react";
import { MATERIAS, type Curso, type Materia } from "@/lib/profile";
import {
  iniciarDiag,
  responder,
  terminado,
  resultado,
} from "@/lib/diagnostico/motor";
import type { Pregunta, ResultadoMateria } from "@/lib/diagnostico/tipos";
import { Reveal } from "./Reveal";

const D_TITULO = 80;
const D_CUERPO = 950;

// Diagnóstico adaptativo de UNA sola materia. Al terminar, entrega su resultado.
export function DiagnosticoMateria({
  materia,
  curso,
  nombre,
  onListo,
}: {
  materia: Materia;
  curso: Curso;
  nombre: string;
  onListo: (r: ResultadoMateria) => void;
}) {
  const [estado, setEstado] = useState(() =>
    iniciarDiag([], materia, curso)
  );
  const [preguntaNo, setPreguntaNo] = useState(1);
  const [pregunta, setPregunta] = useState<Omit<Pregunta, "correcta"> | null>(null);
  const [token, setToken] = useState("");
  const [cargando, setCargando] = useState(true);

  const materiaLabel = MATERIAS.find((m) => m.id === materia)?.label ?? materia;
  const stepKey = estado.hechas.length;

  useEffect(() => {
    async function obtenerPregunta() {
      setCargando(true);
      try {
        const excluir = Array.from(estado.usadasIds).join(",");
        const url = `/api/diagnostico/pregunta?materia=${materia}&curso=${curso}&dificultad=${estado.dificultad}&excluir=${excluir}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.pregunta) {
          setPregunta(data.pregunta);
          setToken(data.token);
        } else {
          // Si no hay más preguntas, terminar diagnóstico con el estado actual
          onListo(resultado(estado));
        }
      } catch (err) {
        console.error("Error al obtener la pregunta del diagnóstico:", err);
      } finally {
        setCargando(false);
      }
    }

    obtenerPregunta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.usadasIds.size]);

  async function elegir(opcion: number) {
    if (!pregunta || !token || cargando) return;
    setCargando(true);

    try {
      const res = await fetch("/api/diagnostico/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preguntaId: pregunta.id,
          indice: opcion,
          token,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const nuevoEstado = responder(estado, pregunta, data.acierto);
        if (terminado(nuevoEstado)) {
          onListo(resultado(nuevoEstado));
        } else {
          setEstado(nuevoEstado);
          setPreguntaNo((n) => n + 1);
        }
      } else {
        console.error("Error del servidor al evaluar respuesta:", data.error);
      }
    } catch (err) {
      console.error("Error de red al enviar respuesta:", err);
    } finally {
      setCargando(false);
    }
  }

  if (cargando && !pregunta) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-zen items-center justify-center px-[22px]">
        <p className="text-ink-soft">Preparando pregunta…</p>
      </div>
    );
  }

  if (!pregunta) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-zen items-center justify-center px-[22px]">
        <p className="text-ink-soft">Finalizando diagnóstico…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-zen flex-col px-[22px] pb-20">
      {/* avance dentro de la materia */}
      <div className="flex h-12 items-center justify-center gap-1.5" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === estado.hechas.length ? "22px" : "7px",
              background:
                i < estado.hechas.length
                  ? "var(--sage)"
                  : i === estado.hechas.length
                    ? "var(--clay)"
                    : "var(--mist)",
            }}
          />
        ))}
      </div>

      <div
        key={stepKey}
        className="flex flex-1 flex-col items-center justify-center py-8 text-center"
      >
        <Reveal variant="lead" delay={D_TITULO}>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            {materiaLabel} · pregunta {preguntaNo}
          </div>
        </Reveal>
        <Reveal variant="lead" delay={D_TITULO + 40}>
          <h1 className="max-w-[22ch] text-[23px] leading-[1.3]">
            {pregunta.enunciado}
          </h1>
        </Reveal>

        <Reveal delay={D_CUERPO}>
          <div className="mt-8 flex w-[320px] max-w-full flex-col gap-2.5 text-left">
            {pregunta.opciones.map((op, i) => (
              <button
                key={i}
                type="button"
                onClick={() => elegir(i)}
                disabled={cargando}
                className="flex items-center gap-3 rounded-xl border border-hair bg-transparent px-4 py-3.5 text-[15px] text-ink transition-colors hover:border-sage disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md border border-hair font-mono text-[12px] text-ink-soft">
                  {String.fromCharCode(65 + i)}
                </span>
                {op}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={D_CUERPO + 250}>
          <p className="mt-7 max-w-[34ch] text-[12px] leading-[1.3] text-ink-soft">
            Preguntas del currículum oficial. {nombre} no está siendo calificado:
            solo buscamos por dónde empezar.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
