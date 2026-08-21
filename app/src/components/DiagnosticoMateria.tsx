"use client";

import { useEffect, useRef, useState } from "react";
import { MATERIAS, type Curso, type Materia } from "@/lib/profile";
import {
  iniciarDiag,
  responder,
  terminado,
  resultado,
  type EstadoDiag,
} from "@/lib/diagnostico/motor";
import type { Pregunta, ResultadoMateria } from "@/lib/diagnostico/tipos";
import {
  borrarDiagnosticoMateriaEnCurso,
  guardarDiagnosticoMateriaEnCurso,
  leerDiagnosticoMateriaEnCurso,
} from "@/lib/storage";
import { Reveal } from "./Reveal";

const D_TITULO = 80;
const D_CUERPO = 950;

// Diagnostico adaptativo de una materia. Cada respuesta validada deja un
// checkpoint seguro para que una recarga no obligue a empezar de nuevo.
export function DiagnosticoMateria({
  materia,
  curso,
  nombre,
  pupiloId,
  onListo,
}: {
  materia: Materia;
  curso: Curso;
  nombre: string;
  pupiloId: string;
  onListo: (r: ResultadoMateria) => void;
}) {
  const [estado, setEstado] = useState(() => iniciarDiag([], materia, curso));
  const [preguntaNo, setPreguntaNo] = useState(1);
  const [pregunta, setPregunta] = useState<Omit<Pregunta, "correcta"> | null>(null);
  const [token, setToken] = useState("");
  const [cargando, setCargando] = useState(true);
  const [restaurado, setRestaurado] = useState(false);
  const finalizado = useRef(false);

  const materiaLabel = MATERIAS.find((m) => m.id === materia)?.label ?? materia;
  const stepKey = estado.hechas.length;

  useEffect(() => {
    const borrador = leerDiagnosticoMateriaEnCurso(pupiloId, materia, curso);
    if (borrador) {
      // El motor solo necesita id, dificultad y tema. No se conserva el texto
      // de la pregunta, su token ni la respuesta correcta en el navegador.
      const estadoRestaurado: EstadoDiag = {
        materia,
        curso,
        dificultad: borrador.dificultad,
        hechas: borrador.hechas.map((p) => ({
          ...p,
          enunciado: "",
          opciones: [],
          correcta: -1,
        })),
        aciertos: borrador.aciertos,
        usadasIds: new Set(borrador.usadasIds),
        pool: [],
      };
      setEstado(estadoRestaurado);
      setPreguntaNo(borrador.hechas.length + 1);
    }
    setRestaurado(true);
  }, [pupiloId, materia, curso]);

  useEffect(() => {
    if (!restaurado) return;

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
          terminarDiagnostico(estado);
        }
      } catch (err) {
        console.error("Error al obtener la pregunta del diagnóstico:", err);
      } finally {
        setCargando(false);
      }
    }

    void obtenerPregunta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurado, estado.usadasIds.size]);

  function guardarCheckpoint(siguiente: EstadoDiag) {
    guardarDiagnosticoMateriaEnCurso({
      pupiloId,
      materia,
      curso,
      dificultad: siguiente.dificultad,
      hechas: siguiente.hechas.map(({ id, materia: mat, curso: cur, dificultad, tema }) => ({
        id,
        materia: mat,
        curso: cur,
        dificultad,
        tema,
      })),
      aciertos: siguiente.aciertos,
      usadasIds: Array.from(siguiente.usadasIds),
    });
  }

  function terminarDiagnostico(final: EstadoDiag) {
    if (finalizado.current) return;
    finalizado.current = true;
    onListo(resultado(final));
    borrarDiagnosticoMateriaEnCurso();
  }

  async function elegir(opcion: number) {
    if (!pregunta || !token || cargando) return;
    setCargando(true);

    try {
      const res = await fetch("/api/diagnostico/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preguntaId: pregunta.id, indice: opcion, token }),
      });

      const data = await res.json();
      if (res.ok) {
        const nuevoEstado = responder(estado, pregunta, data.acierto);
        if (terminado(nuevoEstado)) {
          terminarDiagnostico(nuevoEstado);
        } else {
          guardarCheckpoint(nuevoEstado);
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

  if (!restaurado || (cargando && !pregunta)) {
    return (
      <div className="zen-page flex min-h-[calc(100vh-58px)] items-center justify-center">
        <p className="text-ink-soft">Preparando pregunta…</p>
      </div>
    );
  }

  if (!pregunta) {
    return (
      <div className="zen-page flex min-h-[calc(100vh-58px)] items-center justify-center">
        <p className="text-ink-soft">Finalizando diagnóstico…</p>
      </div>
    );
  }

  return (
    <div className="zen-page flex min-h-[calc(100vh-58px)] flex-col pb-20">
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

      <div key={stepKey} className="flex flex-1 flex-col items-center justify-center py-8 text-center">
        <Reveal variant="lead" delay={D_TITULO}>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            {materiaLabel} · pregunta {preguntaNo}
          </div>
        </Reveal>
        <Reveal variant="lead" delay={D_TITULO + 40}>
          <h1 className="max-w-[22ch] text-[23px] leading-[1.3]">{pregunta.enunciado}</h1>
        </Reveal>

        <Reveal delay={D_CUERPO}>
          <div className="mt-8 flex w-[320px] max-w-full flex-col gap-2.5 text-left md:w-[460px]">
            {pregunta.opciones.map((op, i) => (
              <button
                key={i}
                type="button"
                onClick={() => elegir(i)}
                disabled={cargando}
                className="flex items-center gap-3 rounded-xl border border-hair bg-transparent px-4 py-3.5 text-[15px] text-ink transition-colors hover:border-sage disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md border border-hair font-mono text-[12px] text-ink-soft">
                  {String.fromCharCode(65 + i)}
                </span>
                {op}
              </button>
            ))}
            <button
              type="button"
              onClick={() => elegir(-1)}
              disabled={cargando}
              className="mt-1 self-center text-[13px] text-ink-soft underline underline-offset-4 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              No lo sé
            </button>
          </div>
        </Reveal>

        <Reveal delay={D_CUERPO + 250}>
          <p className="mt-7 max-w-[34ch] text-[12px] leading-[1.3] text-ink-soft">
            Preguntas del currículum oficial. {nombre} no está siendo calificado: solo buscamos por dónde empezar.
          </p>
        </Reveal>
      </div>
    </div>
  );
}
