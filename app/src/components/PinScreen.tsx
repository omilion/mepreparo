"use client";

import { useState, useEffect } from "react";

interface PinScreenProps {
  nombre: string;
  pinCorrecto: string;
  onUnlock: () => void;
  onSalir: () => void;
}

export function PinScreen({ nombre, pinCorrecto, onUnlock, onSalir }: PinScreenProps) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (pin.length === 3) {
      if (pin === pinCorrecto) {
        // Reproducir un sonido sutil de éxito si está disponible, luego desbloquear
        onUnlock();
      } else {
        // Error de PIN: activar animación de shake y limpiar después de 500ms
        setShake(true);
        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate(100);
        }
        setTimeout(() => {
          setShake(false);
          setPin("");
        }, 500);
      }
    }
  }, [pin, pinCorrecto, onUnlock]);

  function presionarDigito(num: string) {
    if (pin.length < 3 && !shake) {
      setPin((prev) => prev + num);
    }
  }

  function borrar() {
    if (pin.length > 0 && !shake) {
      setPin((prev) => prev.slice(0, -1));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper px-6 select-none">
      <div className="flex w-full max-w-sm flex-col items-center">
        {/* Avatar / Orbe de presencia */}
        <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sage-deep/5 border border-sage/20 text-3xl">
          ✨
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-[3px] border-paper"></div>
        </div>

        {/* Título de Bienvenida */}
        <h1 className="font-serif text-[24px] text-ink text-center">¡Hola, {nombre}!</h1>
        <p className="mt-2 text-[14px] text-ink-soft text-center">
          Ingresa tu PIN de 3 dígitos para comenzar a estudiar
        </p>

        {/* Círculos del PIN con efecto Shake */}
        <div
          className={`my-8 flex gap-6 transition-transform duration-300 ${
            shake ? "animate-shake border-clay" : ""
          }`}
          style={
            shake
              ? {
                  animation: "shake 0.4s ease-in-out",
                }
              : undefined
          }
        >
          {[0, 1, 2].map((idx) => {
            const activo = pin.length > idx;
            return (
              <div
                key={idx}
                className={`h-4.5 w-4.5 rounded-full border-2 transition-all duration-200 ${
                  activo
                    ? "bg-sage-deep border-sage-deep scale-110"
                    : "border-hair bg-transparent"
                }`}
              />
            );
          })}
        </div>

        {/* Teclado numérico */}
        <div className="grid w-full grid-cols-3 gap-x-4 gap-y-3 px-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => presionarDigito(num)}
              className="flex h-[64px] items-center justify-center rounded-full border border-hair/50 bg-paper text-[20px] font-medium text-ink transition-all active:scale-95 active:bg-sage/10 hover:border-sage/30"
            >
              {num}
            </button>
          ))}
          
          {/* Botón Salir */}
          <button
            type="button"
            onClick={onSalir}
            className="flex h-[64px] items-center justify-center rounded-full text-[12.5px] font-medium text-clay hover:opacity-80 active:scale-95"
          >
            Salir de la app
          </button>

          {/* Cero */}
          <button
            type="button"
            onClick={() => presionarDigito("0")}
            className="flex h-[64px] items-center justify-center rounded-full border border-hair/50 bg-paper text-[20px] font-medium text-ink transition-all active:scale-95 active:bg-sage/10 hover:border-sage/30"
          >
            0
          </button>

          {/* Borrar */}
          <button
            type="button"
            onClick={borrar}
            className="flex h-[64px] items-center justify-center rounded-full text-[18px] text-ink-soft active:scale-95 hover:text-ink"
            aria-label="Borrar dígito"
          >
            ⌫
          </button>
        </div>
      </div>

      {/* Estilo CSS inyectado para el efecto Shake del PIN */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      ` }} />
    </div>
  );
}
