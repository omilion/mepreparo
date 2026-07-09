"use client";

import {
  MATERIAS,
  diasHastaExamen,
  tieneDiagnostico,
  type Cuenta,
  type PerfilNino,
} from "@/lib/profile";
import { DIAS } from "@/lib/tutor/acuerdo";
import { Reveal } from "./Reveal";

// Panel del apoderado (admin): ve a sus hijos ya configurados y elige a cuál
// entrar, o agrega otro. El onboarding solo ocurre la primera vez.

export function PanelHijos({
  cuenta,
  onEntrar,
  onAgregar,
}: {
  cuenta: Cuenta;
  onEntrar: (indice: number) => void;
  onAgregar: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-zen flex-col gap-[26px] px-[22px] pb-24 pt-10">
      <Reveal variant="lead" delay={80}>
        <header>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Tu cuenta
          </div>
          <h1 className="text-[28px]">Tus estudiantes</h1>
          <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.4] text-ink-soft">
            Elige a quién acompañar hoy. Puedes ver su avance o continuar donde
            quedó.
          </p>
        </header>
      </Reveal>

      <Reveal delay={480}>
        <div className="flex flex-col gap-3">
          {cuenta.pupilos.map((p, i) => (
            <TarjetaPupilo key={p.id} p={p} onEntrar={() => onEntrar(i)} />
          ))}

          <button
            type="button"
            onClick={onAgregar}
            className="rounded-zen border border-dashed border-hair px-5 py-4 text-[14px] text-sage-deep transition-colors hover:border-sage"
          >
            + Agregar otro estudiante
          </button>
        </div>
      </Reveal>
    </div>
  );
}

function TarjetaPupilo({
  p,
  onEntrar,
}: {
  p: PerfilNino;
  onEntrar: () => void;
}) {
  const dias = diasHastaExamen(p.examen.fecha);
  const materias = p.examen.materias
    .map((id) => MATERIAS.find((m) => m.id === id)?.label ?? id)
    .join(" · ");
  const diagnosticado = tieneDiagnostico(p);

  // horario acordado con Rai (si el niño ya lo definió en el tutor) — para el padre
  const horario = p.tutoria?.horario;
  const filasHorario = horario
    ? DIAS.filter((d) => (horario[d.id]?.length ?? 0) > 0).map((d) => ({
        dia: d.corto,
        ramos: horario[d.id]!
          .map((m) => MATERIAS.find((x) => x.id === m)?.label ?? m)
          .join(", "),
      }))
    : [];

  // etiqueta de estado según dónde está en su recorrido
  const estado = !p.examen.materias.length
    ? "Configuración pendiente"
    : !diagnosticado
      ? "Listo para el diagnóstico"
      : "En preparación";

  return (
    <button
      type="button"
      onClick={onEntrar}
      className="flex flex-col gap-3 rounded-zen border border-hair px-5 py-[18px] text-left transition-colors hover:border-sage"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-[19px]">{p.nombre.trim() || "Sin nombre"}</h2>
        {dias !== null && dias >= 0 && (
          <span className="text-[12px] text-clay">examen en {dias} días</span>
        )}
      </div>
      <div className="flex items-center justify-between text-[12.5px] text-ink-soft">
        <span className="truncate">{materias || "Sin materias aún"}</span>
        <span className="ml-3 flex-none text-sage-deep">{estado} →</span>
      </div>

      {filasHorario.length > 0 && (
        <div className="mt-1 border-t border-hair pt-3">
          <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sage-deep">
            Horario acordado con Rai
          </div>
          <div className="flex flex-col gap-0.5 text-[12px] text-ink-soft">
            {filasHorario.map((f) => (
              <div key={f.dia} className="flex gap-2">
                <span className="w-8 flex-none font-medium text-ink">{f.dia}</span>
                <span>{f.ramos}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}
