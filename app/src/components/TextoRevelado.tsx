"use client";

import { memo, useEffect, useMemo } from "react";

// Revela el texto del tutor en un efecto "staggered fade-in" (palabra por palabra en cascada).
// Para lograr el estilo Zen y evitar saltos de texto o parpadeos:
// 1. Todo el texto se inyecta inmediatamente en el DOM para que el contenedor calcule su altura final al instante.
// 2. Cada palabra se anima por separado mediante CSS usando un retraso (animationDelay) progresivo por palabra.
// 3. El navegador renderiza la animación de forma extremadamente fluida en la GPU (will-change) usando
//    una curva de desaceleración suave (easeOutExpo), lo que simula una ola de lectura muy tranquila.

export const TextoRevelado = memo(function TextoRevelado({
  texto,
  onTick,
}: {
  texto: string;
  onTick?: () => void;
}) {
  useEffect(() => {
    // Al inyectarse todo el texto en el DOM, la altura final es instantánea.
    // Hacemos scroll al final una única vez de forma precisa.
    onTick?.();
  }, [texto, onTick]);

  // Dividimos el texto en palabras y espacios
  const tokens = useMemo(() => texto.split(/(\s+)/), [texto]);

  // Contador para asignar retrasos solo a las palabras visibles, no a los espacios
  let wordIndex = 0;

  return (
    // <span> (no <div>): este componente se renderiza DENTRO del <p> de cada
    // línea de Rai, y un <div> dentro de <p> es HTML inválido (hydration error).
    // Como el contenedor ya es display:inline-block, el <span> se ve idéntico.
    <span className="texto-contenedor-zen">
      {tokens.map((token, idx) => {
        if (/^\s+$/.test(token)) {
          return <span key={idx}>{token}</span>;
        }

        const currentDelayIndex = wordIndex;
        wordIndex++;

        return (
          <span
            key={idx}
            className="palabra-zen-fade"
            style={{
              animationDelay: `${currentDelayIndex * 0.09}s`,
            }}
          >
            {token}
          </span>
        );
      })}

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
