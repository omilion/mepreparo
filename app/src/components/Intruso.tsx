"use client";

import { useState } from "react";
import { Fireworks } from "./Fireworks";
import { tocarLira } from "@/lib/audio/liraUI";
import { IconoZen } from "./IconoZen";
import { tieneIcono } from "@/lib/tutor/iconos";

// "El Intruso": una fila de tarjetas donde todas comparten una regla oculta
// menos una. El niño toca la que no encaja. Baja fricción (solo tap), muy
// gratificante. Al acertar, fuegos artificiales; al fallar, se marca y se
// muestra por qué (via Rai en el chat, lo maneja el contenedor).

export interface DatosIntruso {
  enunciado: string; // la consigna (ej: "¿Cuál no es un mamífero?")
  opciones: string[]; // las tarjetas
  intruso: string; // la opción correcta (la que sobra)
  pista?: string; // por qué es el intruso (breve)
}

export function Intruso({
  datos,
  onResponder,
}: {
  datos: DatosIntruso;
  // avisa al contenedor si acertó, para registrar evidencia / explicar el error
  onResponder?: (acerto: boolean, elegido: string) => void;
}) {
  const [elegido, setElegido] = useState<string | null>(null);
  const resuelto = elegido !== null;
  const acerto = elegido === datos.intruso;

  function tocar(op: string, i: number) {
    if (resuelto) return;
    tocarLira(i); // cada tarjeta suena distinto
    setElegido(op);
    onResponder?.(op === datos.intruso, op);
  }

  return (
    <div className="relative flex flex-col items-center gap-4 text-center">
      {resuelto && acerto && <Fireworks />}

      <p className="font-serif text-[18px] leading-[1.3] text-ink">
        {datos.enunciado}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {datos.opciones.map((op, i) => {
          const esEste = elegido === op;
          const esIntruso = op === datos.intruso;
          // tras resolver: el intruso en gold; si eligió mal, su tarjeta en clay
          const clase = resuelto
            ? esIntruso
              ? "border-gold bg-gold-soft text-gold"
              : esEste
                ? "border-clay/50 text-clay opacity-70"
                : "border-hair text-ink-soft opacity-50"
            : "border-hair text-ink enabled:hover:border-gold";
          const conIcono = tieneIcono(op);
          return (
            <button
              key={i}
              onClick={() => tocar(op, i)}
              disabled={resuelto}
              className={
                "min-w-[84px] rounded-xl border-2 px-4 py-3 text-[16px] font-[600] transition-colors " +
                clase
              }
            >
              {conIcono ? (
                <div className="flex flex-col items-center gap-1.5">
                  <IconoZen nombre={op} size={32} />
                  <span className="text-[12px] font-normal capitalize">{op}</span>
                </div>
              ) : (
                op
              )}
            </button>
          );
        })}
      </div>

      {resuelto && (
        <div className="relative h-6">
          {acerto ? (
            <span className="text-[16px] font-[600] text-gold">¡Correcto!</span>
          ) : (
            <span className="text-[14px] text-clay">
              El intruso era: {datos.intruso}.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
