"use client";

import { useState } from "react";
import { nuevoPerfil, type PerfilNino } from "@/lib/profile";
import { Reveal } from "./Reveal";

// Registro mínimo del padre: cuántos pupilos y sus nombres. Cero fricción.
// Al terminar, entrega los perfiles (solo con nombre) para el wizard.

export function Registro({
  onListo,
}: {
  onListo: (pupilos: PerfilNino[]) => void;
}) {
  const [nombres, setNombres] = useState<string[]>([""]);

  function set(i: number, valor: string) {
    setNombres((ns) => ns.map((n, j) => (j === i ? valor : n)));
  }
  function agregar() {
    setNombres((ns) => [...ns, ""]);
  }
  function quitar(i: number) {
    setNombres((ns) => (ns.length > 1 ? ns.filter((_, j) => j !== i) : ns));
  }

  const limpios = nombres.map((n) => n.trim()).filter(Boolean);
  const puedeSeguir = limpios.length > 0;

  function continuar() {
    if (!puedeSeguir) return;
    onListo(limpios.map((nombre) => nuevoPerfil(nombre)));
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-zen flex-col items-center justify-center gap-[30px] px-[22px] pb-24 pt-10 text-center">
      <header>
        <Reveal variant="lead" delay={80}>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Bienvenido
          </div>
        </Reveal>
        <Reveal variant="lead" delay={120}>
          <h1 className="text-[30px]">¿A quién vamos a acompañar?</h1>
        </Reveal>
        <Reveal delay={470}>
          <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.4] text-ink-soft">
            Anota el nombre de cada uno de tus hijos. Después configuramos
            juntos la experiencia de cada uno, con calma.
          </p>
        </Reveal>
      </header>

      <Reveal delay={950}>
      <section className="flex w-[300px] max-w-full flex-col gap-3 text-left">
        {nombres.map((nombre, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-6 text-center font-mono text-[13px] tabular-nums text-ink-soft">
              {i + 1}
            </span>
            <input
              type="text"
              value={nombre}
              autoFocus={i === nombres.length - 1}
              placeholder={`Nombre del hijo ${i + 1}`}
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nombre.trim()) agregar();
              }}
              className="input flex-1"
            />
            {nombres.length > 1 && (
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label={`Quitar hijo ${i + 1}`}
                className="text-ink-soft transition-colors hover:text-clay"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={agregar}
          className="mt-1 self-start text-[13px] text-sage-deep underline-offset-4 hover:underline"
        >
          + Agregar otro hijo
        </button>
      </section>
      </Reveal>

      <Reveal delay={1150}>
        <div className="w-[280px] max-w-full">
          <button
            type="button"
            onClick={continuar}
            disabled={!puedeSeguir}
            className="cta disabled:cursor-not-allowed disabled:opacity-40"
          >
            {limpios.length <= 1
              ? "Continuar"
              : `Continuar con ${limpios.length} hijos`}
          </button>
        </div>
      </Reveal>

      <p className="pb-8 text-center text-[12px] text-ink-soft">
        Todo se guarda en este dispositivo. Tú eres el dueño de la cuenta.
      </p>
    </div>
  );
}
