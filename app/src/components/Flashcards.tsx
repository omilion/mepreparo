"use client";

import { useState, useEffect } from "react";
import { Fireworks } from "./Fireworks";
import { tocarLira } from "@/lib/audio/liraUI";
import { IconoZen } from "./IconoZen";
import { tieneIcono } from "@/lib/tutor/iconos";

interface Tarjeta {
  frente: string;
  reverso: string;
}

export interface DatosFlashcards {
  enunciado: string; // consigna (ej: "Repasa los términos de ciencias")
  tarjetas: Tarjeta[];
}

export function Flashcards({
  datos,
  onCompleta,
}: {
  datos: DatosFlashcards;
  onCompleta?: () => void;
}) {
  const [mazo, setMazo] = useState<Tarjeta[]>(() => [...datos.tarjetas]);
  const [girada, setGirada] = useState(false);
  const [resuelto, setResuelto] = useState(false);

  // Inicializar/resetear si cambian los datos
  useEffect(() => {
    setMazo([...datos.tarjetas]);
    setGirada(false);
    setResuelto(false);
  }, [datos]);

  const totalOriginal = datos.tarjetas.length;
  const restantes = mazo.length;
  const tarjetaActual = mazo[0];

  function voltear() {
    if (resuelto || !tarjetaActual) return;
    setGirada((g) => !g);
    tocarLira(girada ? 2 : 4);
  }

  function responder(sabia: boolean) {
    if (!tarjetaActual || resuelto) return;

    if (sabia) {
      // Lo sabía: la removemos del mazo
      tocarLira(6); // Lira exitosa
      const nuevoMazo = mazo.slice(1);
      setMazo(nuevoMazo);
      setGirada(false);

      if (nuevoMazo.length === 0) {
        setResuelto(true);
        tocarLira(8); // Nota de éxito final
        onCompleta?.();
      }
    } else {
      // Repasar: la movemos al fondo del mazo
      tocarLira(1); // Nota de reintento
      const resto = mazo.slice(1);
      setMazo([...resto, tarjetaActual]);
      setGirada(false);
    }
  }

  const conIcono = tarjetaActual ? tieneIcono(tarjetaActual.frente) : false;

  return (
    <div className="relative flex flex-col items-center gap-6 text-center select-none w-full max-w-[340px] mx-auto py-2">
      {resuelto && <Fireworks />}

      <p className="font-serif text-[18px] leading-[1.3] text-ink px-2">
        {datos.enunciado}
      </p>

      {tarjetaActual && !resuelto ? (
        <div className="relative w-full h-[220px] flex items-center justify-center">
          
          {/* Tarjeta 3 (Sombra lejana, si quedan >=3 tarjetas) */}
          {restantes >= 3 && (
            <div 
              className="absolute inset-0 rounded-2xl border border-hair bg-surface/40 transform translate-y-3 scale-90 opacity-40 -z-30 pointer-events-none"
            />
          )}

          {/* Tarjeta 2 (Sombra media, si quedan >=2 tarjetas) */}
          {restantes >= 2 && (
            <div 
              className="absolute inset-0 rounded-2xl border border-hair bg-surface/75 transform translate-y-1.5 scale-95 opacity-80 -z-20 pointer-events-none"
            />
          )}

          {/* Tarjeta Principal (3D Card) */}
          <div
            onClick={voltear}
            className="perspective-1000 w-full h-full cursor-pointer z-10"
          >
            <div
              className={`relative w-full h-full rounded-2xl transition-transform duration-500 transform-style-3d shadow-sm hover:shadow-md ${
                girada ? "rotate-y-180" : ""
              }`}
            >
              {/* CARA FRENTE */}
              <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl border-2 border-hair bg-surface flex flex-col items-center justify-center gap-2 p-6">
                {conIcono ? (
                  <>
                    <IconoZen nombre={tarjetaActual.frente} size={48} className="text-sage-deep" />
                    <span className="text-[20px] font-[600] capitalize text-ink">
                      {tarjetaActual.frente}
                    </span>
                  </>
                ) : (
                  <span className="text-[22px] font-serif font-[600] text-ink text-center px-2 break-words">
                    {tarjetaActual.frente}
                  </span>
                )}
                <span className="text-[11px] text-ink-soft/50 absolute bottom-3">
                  Toca para dar vuelta
                </span>
              </div>

              {/* CARA REVERSO */}
              <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border-2 border-sage bg-sage/5 flex flex-col items-center justify-center p-6">
                <span className="text-[16px] font-medium leading-[1.4] text-ink font-serif text-center break-words px-2">
                  {tarjetaActual.reverso}
                </span>
                <span className="text-[11px] text-sage-deep/50 absolute bottom-3">
                  Toca para volver a ver
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tarjeta de completado */
        <div className="flex flex-col items-center justify-center w-full h-[220px] rounded-2xl border-2 border-gold bg-gold-soft/5 p-6 animate-pulse">
          <IconoZen nombre="trofeo" size={56} className="text-gold" />
          <span className="text-[18px] font-[600] text-gold mt-3">
            ¡Mazo Completado!
          </span>
          <span className="text-[12px] text-ink-soft mt-1">
            Has repasado todos los conceptos.
          </span>
        </div>
      )}

      {/* Controles de Memoria Activa (Leitner) */}
      {!resuelto && tarjetaActual && (
        <div className="flex flex-col gap-2 w-full">
          {girada ? (
            <div className="flex gap-3 justify-center animate-[fadeIn_0.3s_ease]">
              <button
                onClick={() => responder(false)}
                className="flex items-center gap-1.5 rounded-full border border-clay text-clay hover:bg-clay/10 px-4 py-2 text-[13px] font-semibold transition-all"
              >
                <IconoZen nombre="incorrecto" size={16} />
                Repasar
              </button>
              <button
                onClick={() => responder(true)}
                className="flex items-center gap-1.5 rounded-full bg-sage-deep text-white hover:bg-sage-deep/90 px-4 py-2 text-[13px] font-semibold transition-all shadow-sm"
              >
                <IconoZen nombre="correcto" size={16} />
                Lo sabía
              </button>
            </div>
          ) : (
            <div className="h-9 flex items-center justify-center">
              <span className="text-[13px] text-ink-soft/70">
                Tarjetas restantes: {restantes} de {totalOriginal}
              </span>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
