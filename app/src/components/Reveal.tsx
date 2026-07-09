"use client";

import { useEffect, useState } from "react";

// Entrada escalonada: cada hijo aparece con un retraso creciente.
// `variant="lead"` = fade-up más lento y con más recorrido (para la pregunta).
// `variant="soft"` = fade simple, más rápido (para el resto).
// Respeta prefers-reduced-motion (aparece de inmediato).

export function Reveal({
  delay = 0,
  variant = "soft",
  children,
}: {
  delay?: number;
  variant?: "lead" | "soft";
  children: React.ReactNode;
}) {
  const [on, setOn] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setReduce(true);
      setOn(true);
      return;
    }
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const lead = variant === "lead";
  const dur = lead ? ".94s" : ".65s"; // ~30% más lento que antes
  const shift = lead ? "18px" : "9px";

  return (
    <div
      style={{
        opacity: on ? 1 : 0,
        transform: on ? "translateY(0)" : `translateY(${shift})`,
        transition: reduce
          ? "none"
          : `opacity ${dur} cubic-bezier(.22,.61,.36,1), transform ${dur} cubic-bezier(.22,.61,.36,1)`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
