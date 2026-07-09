"use client";

import { MATERIAS, type Materia, type PerfilNino } from "@/lib/profile";
import { Reveal } from "./Reveal";

// Muestra el resultado del diagnóstico: por materia, un nivel (0..1) traducido
// a lenguaje humano y las brechas detectadas. Tono calmo, sin "notas".

const NOMBRES_TEMA: Record<string, string> = {
  fracciones: "Fracciones",
  numeros: "Números y operaciones",
  proporcionalidad: "Proporcionalidad",
  comprension_lectora: "Comprensión lectora",
  inferencias: "Inferencias",
  ortografia: "Ortografía",
  vocabulario: "Vocabulario",
  seres_vivos: "Seres vivos",
  cuerpo_humano: "Cuerpo humano",
  materia: "La materia y sus cambios",
  ecosistemas: "Ecosistemas",
  energia: "Energía",
  geografia_chile: "Geografía de Chile",
  pueblos_originarios: "Pueblos originarios",
  descubrimiento: "Descubrimiento y conquista",
  institucionalidad: "Organización del Estado",
  colores: "Colores",
  gramatica: "Gramática",
  comprension: "Comprensión",
};

function nivelATexto(n: number): { label: string; color: string } {
  if (n >= 0.75) return { label: "Buen dominio", color: "var(--sage-deep)" };
  if (n >= 0.5) return { label: "En camino", color: "var(--sage-deep)" };
  if (n >= 0.3) return { label: "Necesita apoyo", color: "var(--clay)" };
  return { label: "Empezar desde la base", color: "var(--clay)" };
}

export function ResultadoDiagnostico({
  perfil,
  onVolver,
  onVerPlan,
}: {
  perfil: PerfilNino;
  onVolver: () => void;
  onVerPlan: () => void;
}) {
  const nombre = perfil.nombre.trim();
  const diag = perfil.diagnostico ?? {};
  const materias = perfil.examen.materias;

  return (
    <div className="mx-auto flex max-w-zen flex-col gap-[26px] px-[22px] pb-24 pt-10">
      <Reveal variant="lead" delay={80}>
        <header>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Diagnóstico de {nombre}
          </div>
          <h1 className="text-[27px]">Esto es lo que encontramos.</h1>
          <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.4] text-ink-soft">
            No es una nota. Es el punto de partida para armar un plan a la medida
            de {nombre}.
          </p>
        </header>
      </Reveal>

      <Reveal delay={520}>
        <div className="flex flex-col gap-3">
          {materias.map((m) => (
            <FilaMateria key={m} materia={m} r={diag[m]} />
          ))}
        </div>
      </Reveal>

      <Reveal delay={760}>
        <div className="flex flex-col gap-3">
          <button type="button" className="cta" onClick={onVerPlan}>
            Ver el plan de estudio
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

function FilaMateria({
  materia,
  r,
}: {
  materia: Materia;
  r?: { nivel: number; brechas: string[] };
}) {
  const label = MATERIAS.find((m) => m.id === materia)?.label ?? materia;
  const nivel = r?.nivel ?? 0;
  const { label: nivelLabel, color } = nivelATexto(nivel);
  const brechas = (r?.brechas ?? []).slice(0, 3);

  return (
    <section className="flex flex-col gap-3 rounded-zen border border-hair px-5 py-[18px]">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[17px]">{label}</h2>
        <span className="text-[12px] font-[560]" style={{ color }}>
          {nivelLabel}
        </span>
      </div>

      <div className="h-[6px] overflow-hidden rounded-full bg-mist">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(nivel * 100)}%`,
            background: "var(--sage)",
          }}
        />
      </div>

      {brechas.length > 0 && (
        <p className="text-[12.5px] leading-[1.4] text-ink-soft">
          Reforzar:{" "}
          {brechas.map((t) => NOMBRES_TEMA[t] ?? t).join(" · ")}
        </p>
      )}
    </section>
  );
}
