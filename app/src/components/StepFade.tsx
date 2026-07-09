"use client";

import { useEffect, useState } from "react";

// Envuelve el contenido de un paso del wizard y lo anima con un fade suave
// al cambiar `stepKey`. Al recibir una nueva key: desvanece el anterior,
// luego revela el nuevo. La dirección ("next" | "back") inclina el
// desplazamiento sutil. Respeta prefers-reduced-motion.

export function StepFade({
  stepKey,
  direction = "next",
  children,
}: {
  stepKey: string | number;
  direction?: "next" | "back";
  children: React.ReactNode;
}) {
  const [shown, setShown] = useState(children);
  const [shownKey, setShownKey] = useState(stepKey);
  const [visible, setVisible] = useState(true);
  const [dir, setDir] = useState(direction);

  useEffect(() => {
    if (stepKey === shownKey) {
      // mismo paso, contenido puede haber cambiado (ej. selección)
      setShown(children);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: no-preference)") &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setShown(children);
      setShownKey(stepKey);
      setVisible(true);
      return;
    }

    setDir(direction);
    setVisible(false); // inicia salida
    const t = setTimeout(() => {
      setShown(children);
      setShownKey(stepKey);
      // fuerza reflow para reiniciar la animación de entrada
      requestAnimationFrame(() => setVisible(true));
    }, 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, children, direction]);

  const offset = dir === "next" ? "8px" : "-8px";

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${offset})`,
        transition: "opacity .28s ease, transform .28s ease",
      }}
    >
      {shown}
    </div>
  );
}
