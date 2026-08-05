"use client";

// Home del alumno: UNA acción obvia, no un mapa para decidir. A un niño de
// básica hay que darle una tarjeta grande y un solo botón. El mapa (camino
// completo por materia) queda como vista secundaria, un clic más allá.

import { MATERIAS, type Curso, type Materia, type PerfilNino } from "@/lib/profile";
import { queHacerHoy, yaEstudioHoy } from "@/lib/plan/hoy";
import { calcularRacha } from "@/lib/plan/racha";
import { Reveal } from "./Reveal";

export function QueHacerHoy({
  perfil,
  curso,
  onEmpezar,
  onVerCamino,
}: {
  perfil: PerfilNino;
  curso: Curso;
  onEmpezar: (materia: Materia, tema: string) => void;
  onVerCamino: () => void;
}) {
  const plan = queHacerHoy(perfil, curso);
  const yaEstudio = yaEstudioHoy(perfil);
  const nombre = perfil.nombre.trim() || "tú";
  const racha = calcularRacha(perfil.tutoria?.sesiones ?? []);

  if (!plan) {
    // sin camino armado todavía (raro llegando aquí, pero no debe romperse)
    return (
      <div className="zen-page flex min-h-[calc(100vh-58px)] flex-col items-center justify-center gap-6 px-4 text-center">
        <Reveal variant="lead" delay={80}>
          <h1 className="text-[24px]">Hola, {nombre}</h1>
        </Reveal>
        <Reveal delay={260}>
          <p className="max-w-[34ch] text-[15px] leading-[1.5] text-ink-soft">
            Aún estamos preparando tu camino. Mientras tanto, puedes conversar
            con Rai.
          </p>
        </Reveal>
        <Reveal delay={400}>
          <button onClick={onVerCamino} className="cta px-9">
            Ver mi camino
          </button>
        </Reveal>
      </div>
    );
  }

  const materiaLabel = MATERIAS.find((m) => m.id === plan.materia)?.label ?? plan.materia;

  return (
    <div className="zen-page flex min-h-[calc(100vh-58px)] flex-col items-center justify-center gap-8 px-4 text-center">
      <Reveal variant="lead" delay={80}>
        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
          Hola, {nombre}
        </div>
      </Reveal>

      {racha >= 1 && (
        <Reveal delay={140}>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-hair px-3.5 py-1.5 text-[12.5px] text-ink-soft">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-clay" />
            {racha} {racha === 1 ? "día seguido" : "días seguidos"}
          </div>
        </Reveal>
      )}

      {yaEstudio ? (
        <>
          <Reveal variant="lead" delay={160}>
            <h1 className="max-w-[18ch] text-[27px]">¡Ya estudiaste hoy!</h1>
          </Reveal>
          <Reveal delay={320}>
            <p className="max-w-[32ch] text-[15px] leading-[1.5] text-ink-soft">
              ¿Quieres repasar algo más, o lo dejamos por hoy?
            </p>
          </Reveal>
          <Reveal delay={460}>
            <div className="flex flex-col items-center gap-3">
              <button onClick={() => onEmpezar(plan.materia, plan.etapa.tema)} className="cta px-9">
                Repasar {materiaLabel}
              </button>
              <button
                onClick={onVerCamino}
                className="text-[13.5px] text-sage-deep underline underline-offset-4 hover:opacity-85"
              >
                Ver mi camino
              </button>
            </div>
          </Reveal>
        </>
      ) : (
        <>
          <Reveal variant="lead" delay={160}>
            <h1 className="max-w-[20ch] text-[28px] leading-[1.25]">
              Hoy toca {materiaLabel} · Etapa {plan.etapa.numero} · {plan.minutos} min
            </h1>
          </Reveal>
          <Reveal delay={320}>
            <p className="max-w-[32ch] text-[15px] leading-[1.5] text-ink-soft">
              {plan.etapa.titulo}
            </p>
          </Reveal>
          <Reveal delay={460}>
            <div className="flex flex-col items-center gap-3">
              <button onClick={() => onEmpezar(plan.materia, plan.etapa.tema)} className="cta px-10 py-3.5 text-[16px]">
                Empezar
              </button>
              <button
                onClick={onVerCamino}
                className="text-[13.5px] text-sage-deep underline underline-offset-4 hover:opacity-85"
              >
                Ver mi camino
              </button>
            </div>
          </Reveal>
        </>
      )}
    </div>
  );
}
