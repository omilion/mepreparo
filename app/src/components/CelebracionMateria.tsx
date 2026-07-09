"use client";

import { MATERIAS, type Materia } from "@/lib/profile";
import { Fireworks } from "./Fireworks";
import { Reveal } from "./Reveal";

// Pantalla de felicitación al completar UNA materia del diagnóstico.
// Fondo con fireworks muy sutiles. Invita a pasar a la siguiente.

export function CelebracionMateria({
  materia,
  nombre,
  quedan,
  onContinuar,
}: {
  materia: Materia;
  nombre: string;
  quedan: number; // materias que faltan por hacer
  onContinuar: () => void;
}) {
  const label = MATERIAS.find((m) => m.id === materia)?.label ?? materia;

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-58px)] max-w-zen flex-col items-center justify-center gap-[26px] overflow-hidden px-[22px] pb-24 text-center">
      <Fireworks />

      {/* contenido por encima del canvas */}
      <div className="relative z-[1] flex flex-col items-center gap-[26px]">
        <Reveal variant="lead" delay={120}>
          <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            {label} · completada
          </div>
          <h1 className="max-w-[16ch] text-[30px] leading-[1.15]">
            ¡Muy bien, {nombre}!
          </h1>
        </Reveal>

        <Reveal delay={600}>
          <p className="max-w-[34ch] text-[15px] leading-[1.45] text-ink-soft">
            {quedan > 0
              ? `Terminaste ${label}. ${
                  quedan === 1
                    ? "Te queda solo una asignatura."
                    : `Te quedan ${quedan} asignaturas.`
                } Puedes seguir cuando quieras.`
              : `Terminaste ${label} y con eso completaste todas. ¡Excelente trabajo!`}
          </p>
        </Reveal>

        <Reveal delay={850}>
          <div className="w-[280px] max-w-full">
            <button type="button" onClick={onContinuar} className="cta">
              {quedan > 0 ? "Continuar" : "Ver mis resultados"}
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
