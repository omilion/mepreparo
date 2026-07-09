"use client";

import { useMemo, useState } from "react";
import { MATERIAS, type Curso, type Materia } from "@/lib/profile";
import BANCO_PREGUNTAS from "@/lib/diagnostico/banco.json";
import {
  iniciarDiag,
  siguientePregunta,
  responder,
  terminado,
  resultado,
} from "@/lib/diagnostico/motor";
import type { BancoPreguntas, ResultadoMateria } from "@/lib/diagnostico/tipos";
import { Reveal } from "./Reveal";

const banco = BANCO_PREGUNTAS as BancoPreguntas;

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
    iniciarDiag(banco, materia, curso)
  );
  const [preguntaNo, setPreguntaNo] = useState(1);

  const materiaLabel = MATERIAS.find((m) => m.id === materia)?.label ?? materia;
  const pregunta = useMemo(() => siguientePregunta(estado), [estado]);
  const stepKey = estado.hechas.length;

  function elegir(opcion: number) {
    if (!pregunta) return;
    const nuevoEstado = responder(estado, pregunta, opcion);
    if (terminado(nuevoEstado)) {
      onListo(resultado(nuevoEstado));
    } else {
      setEstado(nuevoEstado);
      setPreguntaNo((n) => n + 1);
    }
  }

  if (!pregunta) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-zen items-center justify-center px-[22px]">
        <p className="text-ink-soft">Preparando…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-zen flex-col px-[22px] pb-20">
      {/* avance dentro de la materia (aprox, sin delatar dificultad) */}
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
                className="flex items-center gap-3 rounded-xl border border-hair bg-transparent px-4 py-3.5 text-[15px] text-ink transition-colors hover:border-sage"
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
