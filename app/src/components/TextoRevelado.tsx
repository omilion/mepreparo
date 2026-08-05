"use client";

import { memo, useEffect, useMemo } from "react";
import { IconoZen } from "./IconoZen";

// Revela el texto del tutor en un efecto "staggered fade-in" (palabra por palabra en cascada).
// Para lograr el estilo Zen y evitar saltos de texto o parpadeos:
// 1. Todo el texto se inyecta inmediatamente en el DOM para que el contenedor calcule su altura final al instante.
// 2. Cada palabra se anima por separado mediante CSS usando un retraso (animationDelay) progresivo por palabra.
// 3. El navegador renderiza la animación de forma extremadamente fluida en la GPU (will-change) usando
//    una curva de desaceleración suave (easeOutExpo), lo que simula una ola de lectura muy tranquila.

export const TextoRevelado = memo(function TextoRevelado({
  texto,
  onTick,
  stagger = 0.09,
}: {
  texto: string;
  onTick?: () => void;
  stagger?: number;
}) {
  useEffect(() => {
    // Al inyectarse todo el texto en el DOM, la altura final es instantánea.
    // Hacemos scroll al final una única vez de forma precisa.
    onTick?.();
  }, [texto, onTick]);

  // Primero se parte por los tramos en **negrita** y recién dentro de cada
  // tramo por palabras. Al revés no funcionaría: "**la célula**" abarca dos
  // palabras y el marcador quedaría partido a la mitad.
  //
  // Sin esto el niño veía los asteriscos literales ("**celula**"), porque el
  // texto se pinta palabra por palabra y nadie interpretaba el markdown que
  // Gemini escribe por su cuenta.
  const tramos = useMemo(() => {
    return texto.split(/(\*\*[^*\n]+\*\*)/).map((parte) => {
      const negrita = /^\*\*[^*\n]+\*\*$/.test(parte);
      return { negrita, texto: negrita ? parte.slice(2, -2) : parte };
    });
  }, [texto]);

  // Contador para asignar retrasos solo a las palabras visibles, no a los espacios
  let wordIndex = 0;

  // Pinta un tramo palabra por palabra, respetando iconos y el escalonado.
  function palabrasDe(contenido: string, claveTramo: number, negrita: boolean) {
    return contenido.split(/(\s+|\[icono:\w+\])/).map((token, idx) => {
      if (token === "") return null;
      if (/^\s+$/.test(token)) {
        return <span key={`${claveTramo}-${idx}`}>{token}</span>;
      }

      const matchIcono = token.match(/^\[icono:(\w+)\]$/);
      const currentDelayIndex = wordIndex;
      wordIndex++;

      return (
        <span
          key={`${claveTramo}-${idx}`}
          className={"palabra-zen-fade" + (negrita ? " palabra-destacada" : "")}
          style={{
            animationDelay: `${currentDelayIndex * stagger}s`,
          }}
        >
          {matchIcono ? (
            <IconoZen nombre={matchIcono[1]} className="mx-1 align-middle" size={20} />
          ) : (
            token
          )}
        </span>
      );
    });
  }

  return (
    // <span> (no <div>): este componente se renderiza DENTRO del <p> de cada
    // línea de Rai, y un <div> dentro de <p> es HTML inválido (hydration error).
    // Como el contenedor ya es display:inline-block, el <span> se ve idéntico.
    <span className="texto-contenedor-zen">
      {tramos.map((tramo, i) => palabrasDe(tramo.texto, i, tramo.negrita))}

      <style jsx>{`
        .texto-contenedor-zen {
          display: inline-block;
          text-align: center;
          line-height: 1.5;
        }
        .palabra-zen-fade {
          display: inline-block;
          opacity: 0;
          transform: translateY(3px);
          animation: palabraZenFadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: opacity, transform;
        }
        /* El dorado de la paleta: distinto del salvia del resto del texto, así
           se lee de inmediato que Rai quiso subrayar ESA palabra. Se acompaña
           con peso, no con fondo de resaltador. */
        .palabra-destacada {
          font-weight: 620;
          color: var(--gold);
        }
        @keyframes palabraZenFadeIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .palabra-zen-fade {
            opacity: 1;
            transform: none;
            animation: none;
          }
        }
      `}</style>
    </span>
  );
});
