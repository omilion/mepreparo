"use client";

import { useMemo } from "react";
import { MATERIAS, type PerfilNino } from "@/lib/profile";
import { calcularPlan, type Veredicto } from "@/lib/plan/motor";
import { Reveal } from "./Reveal";

const VEREDICTO: Record<
  Veredicto,
  { titulo: (n: string) => string; color: string; frase: string }
> = {
  holgura: {
    titulo: (n) => `${n} llega con holgura.`,
    color: "var(--sage-deep)",
    frase: "Con tu dedicación actual hay tiempo de sobra. Pueden ir con calma.",
  },
  justo: {
    titulo: (n) => `${n} llega bien, sin apuros.`,
    color: "var(--sage-deep)",
    frase: "El tiempo alcanza para cubrir todo antes del examen manteniendo el ritmo.",
  },
  apretado: {
    titulo: (n) => `${n} va apretado.`,
    color: "var(--clay)",
    frase: "El tiempo es justo. Conviene enfocarse primero en lo más débil.",
  },
};

export function PlanEstudio({
  perfil,
  onVolver,
  onTutor,
}: {
  perfil: PerfilNino;
  onVolver: () => void;
  onTutor: () => void;
}) {
  const nombre = perfil.nombre.trim() || "Tu hijo";
  const plan = useMemo(() => calcularPlan(perfil), [perfil]);
  const maxHoras = Math.max(...plan.materias.map((m) => m.horas), 1);
  const v = VEREDICTO[plan.veredicto];

  return (
    <div className="mx-auto flex max-w-zen flex-col gap-[26px] px-[22px] pb-24 pt-10">
      <Reveal variant="lead" delay={80}>
        <header>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Plan de estudio
          </div>
          <h1 className="max-w-[20ch] text-[27px] leading-[1.2]">
            {v.titulo(nombre)}
          </h1>
          <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.4] text-ink-soft">
            {v.frase}
          </p>
        </header>
      </Reveal>

      {/* resumen de tiempo */}
      <Reveal delay={480}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Metrica
              valor={`${plan.horasTotales} h`}
              unidad="para prepararse"
            />
            <Metrica
              valor={plan.diasRestantes !== null ? `${plan.diasRestantes}` : "—"}
              unidad="días al examen"
            />
            <Metrica
              valor={`${perfil.disponibilidad.horasSemana} h`}
              unidad="cada semana"
            />
          </div>
          <p className="px-1 text-center text-[12.5px] leading-[1.4] text-ink-soft">
            En total necesita unas{" "}
            <strong className="text-ink">{plan.horasTotales} horas</strong> de
            estudio para cubrir todo el contenido antes del examen.
          </p>
        </div>
      </Reveal>

      {/* aviso si va apretado */}
      {plan.veredicto === "apretado" && plan.horasSemanaSugeridas && (
        <Reveal delay={620}>
          <div className="rounded-zen border border-[color-mix(in_srgb,var(--clay)_34%,transparent)] px-5 py-4 text-[13.5px] leading-[1.5] text-ink">
            Para llegar cómodo, {nombre} debería estudiar alrededor de{" "}
            <strong className="text-clay">
              {plan.horasSemanaSugeridas} horas por semana
            </strong>{" "}
            (hoy son {perfil.disponibilidad.horasSemana}). Si no es posible,
            prioricen las materias marcadas abajo como más urgentes.
          </div>
        </Reveal>
      )}

      {/* reparto por materia */}
      <Reveal delay={720}>
        <div className="flex flex-col gap-3">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
            Dónde poner el esfuerzo
          </div>
          {plan.materias
            .slice()
            .sort((a, b) => a.prioridad - b.prioridad)
            .map((m) => {
              const label =
                MATERIAS.find((x) => x.id === m.materia)?.label ?? m.materia;
              const pct = Math.round((m.horas / maxHoras) * 100);
              const urgente = m.prioridad === 1;
              return (
                <div
                  key={m.materia}
                  className="rounded-zen border border-hair px-5 py-4"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-[16px]">{label}</span>
                    <span className="font-mono text-[13px] tabular-nums text-ink-soft">
                      {m.horas} h
                    </span>
                  </div>
                  <div className="mt-2.5 h-[6px] overflow-hidden rounded-full bg-mist">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: urgente ? "var(--clay)" : "var(--sage)",
                      }}
                    />
                  </div>
                  {urgente && (
                    <p className="mt-2 text-[12px] text-clay">
                      Empezar por aquí — es donde más se necesita.
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      </Reveal>

      <Reveal delay={860}>
        <div className="flex flex-col gap-3">
          <button type="button" className="cta" onClick={onTutor}>
            Empezar a estudiar con el tutor
          </button>
          <button
            type="button"
            onClick={onVolver}
            className="text-center text-[13px] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Volver
          </button>
        </div>
      </Reveal>
    </div>
  );
}

function Metrica({ valor, unidad }: { valor: string; unidad: string }) {
  return (
    <div className="rounded-zen border border-hair px-3 py-4 text-center">
      <div className="font-serif text-[26px] tabular-nums leading-none">
        {valor}
      </div>
      <div className="mt-1.5 text-[11px] leading-tight text-ink-soft">
        {unidad}
      </div>
    </div>
  );
}
