"use client";

import { useEffect, useState, useRef } from "react";

// Entrada escalonada "On Screen" usando IntersectionObserver:
// Cada elemento aparece solo cuando entra en el viewport del usuario.
// `variant="lead"` = fade-up lento y con más recorrido.
// `variant="soft"` = fade simple, suave.
// Respeta prefers-reduced-motion (aparece de inmediato).

// El efecto estaba bien pero duraba demasiado: había retardos de hasta 2.6s
// SUMADOS a 2.4s de animación, o sea 5 segundos hasta que un bloque terminaba
// de aparecer. En vez de tocar los ~40 lugares que pasan `delay`, se escala
// acá: la coreografía (qué entra antes que qué) se mantiene intacta y el
// tiempo total se reduce a la mitad.
const FACTOR_RITMO = 0.5;

export function Reveal({
  delay = 0,
  variant = "soft",
  children,
  onVisible,
}: {
  delay?: number;
  variant?: "lead" | "soft";
  children: React.ReactNode;
  onVisible?: () => void;
}) {
  const [on, setOn] = useState(false);
  const [reduce, setReduce] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const espera = Math.round(delay * FACTOR_RITMO);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setReduce(true);
      setOn(true);
      onVisible?.();
      return;
    }

    const element = ref.current;
    if (!element) return;

    let timeoutId: NodeJS.Timeout;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Disparar la animación con el retraso configurado
            timeoutId = setTimeout(() => {
              setOn(true);
              onVisible?.();
            }, espera);
            observer.unobserve(element);
            window.removeEventListener("scroll", handleScroll);
          }
        });
      },
      {
        threshold: 0.05, // Se activa cuando el 5% del elemento es visible
        rootMargin: "0px 0px -40% 0px", // Requiere que el elemento suba un 40% de la altura de la pantalla
      }
    );

    const handleScroll = () => {
      if (typeof window === "undefined") return;
      const reachedBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60;
      if (reachedBottom) {
        timeoutId = setTimeout(() => {
          setOn(true);
          onVisible?.();
        }, espera);
        observer.disconnect();
        window.removeEventListener("scroll", handleScroll);
      }
    };

    observer.observe(element);
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Ejecutar una vez al inicio
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [espera, onVisible]);

  const lead = variant === "lead";
  // Antes 2.4s/1.7s: sumadas al retardo, un bloque tardaba hasta 5s en llegar.
  // A la mitad el gesto sigue siendo sereno, pero deja de hacerse esperar.
  const dur = lead ? "1.2s" : "0.85s";
  const shift = lead ? "28px" : "14px"; // Desplazamiento sutil hacia arriba

  return (
    <div
      ref={ref}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? "translateY(0)" : `translateY(${shift})`,
        transition: reduce
          ? "none"
          : `opacity ${dur} cubic-bezier(.22, 1, .36, 1), transform ${dur} cubic-bezier(.22, 1, .36, 1)`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
