"use client";

import { useEffect, useRef, useState } from "react";
import { MotorAmbiente } from "@/lib/audio/motorAmbiente";

// Botón + menú de sonido. Tres interruptores INDEPENDIENTES:
//  - Calma y Concentración = colchón de fondo (ruido+binaural), EXCLUYENTES entre
//    sí (solo uno a la vez).
//  - Lira = melodía, aparte (se combina con cualquiera o suena sola).
// Todo apagado = silencio.

type Fondo = "concentracion" | "calma" | null;

export function SoundToggle() {
  const motorRef = useRef<MotorAmbiente | null>(null);
  const [fondo, setFondo] = useState<Fondo>(null);
  const [lira, setLira] = useState(false);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    return () => motorRef.current?.detener();
  }, []);

  // aplica el estado (colchón + lira) al motor. El gesto de clic desbloquea el
  // audio; aplicar() espera el resume() internamente.
  function aplicar(nuevoFondo: Fondo, nuevaLira: boolean) {
    if (!motorRef.current) motorRef.current = new MotorAmbiente();
    void motorRef.current.aplicar(nuevoFondo, nuevaLira);
    setFondo(nuevoFondo);
    setLira(nuevaLira);
  }

  // Calma/Concentración: excluyentes. Tocar el activo lo apaga (toggle).
  function elegirFondo(f: "concentracion" | "calma") {
    aplicar(fondo === f ? null : f, lira);
  }
  function toggleLira() {
    aplicar(fondo, !lira);
  }

  const activo = fondo !== null || lira;

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-pressed={activo}
        aria-label="Sonido ambiente"
        title="Sonido ambiente"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-hair text-ink-soft transition-colors hover:text-ink"
      >
        {activo ? <IconSonido /> : <IconSonidoOff />}
      </button>

      {abierto && (
        <>
          {/* capa para cerrar al tocar fuera */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAbierto(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-10 z-50 w-60 rounded-xl border border-hair bg-surface p-1.5 shadow-lg">
            <FilaToggle
              label="Concentración"
              hint="Foco · pulso 40 Hz"
              activo={fondo === "concentracion"}
              onToggle={() => elegirFondo("concentracion")}
            />
            <FilaToggle
              label="Calma"
              hint="Repaso tranquilo · pulso 16 Hz"
              activo={fondo === "calma"}
              onToggle={() => elegirFondo("calma")}
            />
            <div className="my-1 h-px bg-hair" />
            <FilaToggle
              label="Lira"
              hint="Melodía suave · aparte"
              activo={lira}
              onToggle={toggleLira}
            />
            <p className="px-3 pb-1 pt-2 text-[10.5px] leading-snug text-ink-soft">
              Con audífonos el efecto es mayor. El colchón de fondo también
              funciona con parlantes.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// Una fila con etiqueta + interruptor tipo switch (estética zen).
function FilaToggle({
  label,
  hint,
  activo,
  onToggle,
}: {
  label: string;
  hint: string;
  activo: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={activo}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-hair/40"
    >
      <span className="flex flex-col gap-0.5">
        <span
          className={
            "text-[13.5px] " + (activo ? "font-[560] text-sage-deep" : "text-ink")
          }
        >
          {label}
        </span>
        <span className="text-[11px] text-ink-soft">{hint}</span>
      </span>
      <span
        className={
          "relative h-[18px] w-8 flex-none rounded-full transition-colors " +
          (activo ? "bg-sage" : "bg-hair")
        }
      >
        <span
          className={
            "absolute top-[2px] h-[14px] w-[14px] rounded-full bg-surface shadow-sm transition-all " +
            (activo ? "left-[16px]" : "left-[2px]")
          }
        />
      </span>
    </button>
  );
}

function IconSonido() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a9 9 0 0 1 0 12" />
    </svg>
  );
}

function IconSonidoOff() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="m16 9 5 6M21 9l-5 6" />
    </svg>
  );
}
