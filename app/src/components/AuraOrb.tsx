"use client";

import type { Materia } from "@/lib/profile";

// Esfera de aura: gradiente radial difuminado, suave, tipo "presencia".
// Cambia de color según la materia y "late" (escala + brillo) cuando Rai
// está pensando, para dar sensación de compañía viva al niño.
// Respeta prefers-reduced-motion (no pulsa, solo se muestra estática).

// Dos tonos por materia (centro → borde) para el degradado.
const COLORES: Record<Materia, [string, string]> = {
  matematica: ["#7FB0FF", "#C9A7F5"], // azul → lila
  lenguaje: ["#F2A65A", "#F5C77E"], // ámbar cálido
  ciencias: ["#6FD3B4", "#8FE0C6"], // verde agua
  historia: ["#E4917A", "#F0B79E"], // terracota
  ingles: ["#F58AB0", "#9AB8FF"], // rosa → azul (como la referencia)
};

export function AuraOrb({
  materia,
  activa,
  size = 120,
}: {
  materia: Materia;
  activa: boolean; // true mientras Rai "piensa"
  size?: number;
}) {
  const [c1, c2] = COLORES[materia] ?? COLORES.matematica;

  return (
    <div
      className="aura-wrap"
      style={{
        width: size,
        height: size,
        transition: "width .7s ease-in-out, height .7s ease-in-out",
      }}
      aria-hidden
    >
      <div
        className={"aura-orb" + (activa ? " aura-activa" : "")}
        style={
          {
            "--c1": c1,
            "--c2": c2,
          } as React.CSSProperties
        }
      />
      <style jsx>{`
        .aura-wrap {
          position: relative;
          display: grid;
          place-items: center;
        }
        .aura-orb {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(
            circle at 50% 45%,
            var(--c2) 0%,
            var(--c1) 38%,
            color-mix(in srgb, var(--c1) 55%, transparent) 60%,
            transparent 72%
          );
          filter: blur(6px);
          opacity: 0.9;
          transition: background 1.2s ease, transform 0.6s ease,
            opacity 0.6s ease;
          animation: respira 5.5s ease-in-out infinite;
        }
        /* respiración muy leve en reposo */
        @keyframes respira {
          0%,
          100% {
            transform: scale(0.96);
            opacity: 0.82;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.95;
          }
        }
        /* mientras escribe: late, brilla y se mueve suavemente (como vivo) */
        .aura-activa {
          animation: latido 1.5s ease-in-out infinite,
            vaiven 3.2s ease-in-out infinite;
          filter: blur(5px) saturate(1.25);
        }
        @keyframes latido {
          0%,
          100% {
            transform: scale(0.94);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.13);
            opacity: 1;
          }
        }
        /* deriva sutil en X/Y — la animación se compone con el latido vía
           translate + scale, así que animamos translate aquí y scale arriba */
        @keyframes vaiven {
          0%,
          100% {
            translate: -5px 2px;
          }
          33% {
            translate: 4px -4px;
          }
          66% {
            translate: 3px 4px;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .aura-orb,
          .aura-activa {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
