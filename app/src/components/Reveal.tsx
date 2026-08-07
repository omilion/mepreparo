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

// TOPE DURO: si por lo que sea el observer nunca dispara, nada puede quedar
// invisible para siempre. Nació de un bug real: el rootMargin (ver abajo)
// dejaba fuera del área observada el 40% inferior del viewport, y en una
// página del alto exacto de la pantalla (/hoy, con el botón "Empezar" al
// final) ese último bloque caía justo ahí. Sin overflow no hay scroll, sin
// scroll no hay ningún evento que reevalúe la intersección — el botón que
// abre la clase quedaba invisible sin que nada lo disparara jamás.
const TOPE_DURO_MS = 1400;

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
    let disparado = false;
    const disparar = () => {
      if (disparado) return;
      disparado = true;
      timeoutId = setTimeout(() => {
        setOn(true);
        onVisible?.();
      }, espera);
    };

    // rootMargin -10% (antes -40%): un margen chico sigue dando el efecto de
    // "aparece un poco antes de llegar" en páginas largas, pero sin dejar
    // fuera del área observada nada que ya esté a la vista al cargar. Con
    // -40%, un elemento en el 40% inferior de una página del alto justo de
    // la pantalla (sin scroll posible) nunca calificaba como "intersecting"
    // — y sin scroll, IntersectionObserver no tenía ningún evento que lo
    // hiciera reevaluar. Quedaba invisible para siempre.
    //
    // El listener de "scroll" manual que había acá antes intentaba tapar
    // ese hueco adivinando si la página ya estaba al fondo, pero dependía de
    // que document.documentElement.scrollHeight estuviera ya estabilizado en
    // el instante exacto del montaje — antes de que cargaran fuentes o
    // imágenes. Se saca: IntersectionObserver YA reacciona solo a cambios de
    // layout (resize, reflow), no necesita que nadie haga scroll.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            disparar();
            observer.unobserve(element);
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(element);

    // TOPE DURO: red de seguridad final. Si por lo que sea (navegador raro,
    // elemento de alto cero, algo que no previmos) el observer nunca
    // dispara, esto garantiza que nada se quede invisible más allá de
    // TOPE_DURO_MS. No debería activarse en el camino normal.
    const topeDuro = setTimeout(disparar, TOPE_DURO_MS);

    return () => {
      observer.disconnect();
      clearTimeout(topeDuro);
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
