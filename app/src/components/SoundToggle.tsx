"use client";

import { useEffect, useRef, useState } from "react";
import { MotorAmbiente, type Ambiente } from "@/lib/audio/motorAmbiente";

// Botón + menú de sonido ambiente para concentración. Tres modos (calibrados
// con investigación: ruido marrón + binaural sutil afinado a la escala de la
// lira + lira comprimida). Mantiene la API <SoundToggle /> sin props.

const OPCIONES: { id: Ambiente; label: string; hint: string }[] = [
  { id: "concentracion", label: "Concentración", hint: "Foco · pulso 40 Hz + lira" },
  { id: "calma", label: "Calma", hint: "Repaso tranquilo · pulso 16 Hz" },
  { id: "silencio", label: "Silencio", hint: "Sin sonido" },
];

export function SoundToggle() {
  const motorRef = useRef<MotorAmbiente | null>(null);
  const [ambiente, setAmbienteState] = useState<Ambiente>("silencio");
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    return () => motorRef.current?.detener();
  }, []);

  function aplicar(a: Ambiente) {
    if (!motorRef.current) motorRef.current = new MotorAmbiente();
    // el gesto de clic desbloquea el audio; setAmbiente espera el resume()
    void motorRef.current.setAmbiente(a);
    setAmbienteState(a);
    setAbierto(false);
  }

  const activo = ambiente !== "silencio";

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
          <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-hair bg-surface p-1.5 shadow-lg">
            {OPCIONES.map((o) => {
              const sel = o.id === ambiente;
              return (
                <button
                  key={o.id}
                  onClick={() => aplicar(o.id)}
                  className={
                    "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors " +
                    (sel ? "bg-sage/10" : "hover:bg-hair/40")
                  }
                >
                  <span
                    className={
                      "text-[13.5px] " + (sel ? "font-[560] text-sage-deep" : "text-ink")
                    }
                  >
                    {o.label}
                    {sel && " ·"}
                  </span>
                  <span className="text-[11px] text-ink-soft">{o.hint}</span>
                </button>
              );
            })}
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
