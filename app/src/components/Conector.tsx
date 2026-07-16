"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Fireworks } from "./Fireworks";
import { tocarLira } from "@/lib/audio/liraUI";

// "El Conector": unir con líneas. Dos columnas de elementos; el niño toca uno de
// la izquierda y luego su par de la derecha para trazarles una línea. Cuando
// están todos unidos correctamente, se completa. Mecánica de tap (baja fricción),
// las líneas se dibujan en un SVG superpuesto (mismas coords del contenedor).

export interface ParConector {
  izq: string;
  der: string;
}

export interface DatosConector {
  enunciado: string; // consigna (ej: "Une cada operación con su resultado")
  pares: ParConector[]; // pares correctos (izq ↔ der)
}

interface Union {
  izq: number; // índice en la columna izquierda (orden mostrado)
  der: number; // índice en la columna derecha (orden mostrado, barajado)
}

// Baraja sin mutar.
function revolver<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Conector({
  datos,
  onResponder,
}: {
  datos: DatosConector;
  // avisa al contenedor cuando termina: acertó todo o no
  onResponder?: (acerto: boolean) => void;
}) {
  const n = datos.pares.length;
  // columna izquierda en orden; derecha barajada (una sola vez, al montar)
  const izquierda = datos.pares.map((p) => p.izq);
  const [derecha] = useState(() => revolver(datos.pares.map((p) => p.der)));

  // para saber si una unión izq→der es correcta: mapa der(texto) → izq(texto)
  const correctoDe: Record<string, string> = {};
  for (const p of datos.pares) correctoDe[p.der] = p.izq;

  const [uniones, setUniones] = useState<Union[]>([]);
  const [seleccionIzq, setSeleccionIzq] = useState<number | null>(null);
  const [resuelto, setResuelto] = useState(false);

  // refs a los nodos para calcular las coordenadas de las líneas
  const contRef = useRef<HTMLDivElement>(null);
  const izqRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const derRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [lineas, setLineas] = useState<
    { x1: number; y1: number; x2: number; y2: number; ok: boolean }[]
  >([]);

  // Recalcula las coordenadas de las líneas a partir de las posiciones reales de
  // los botones (centro del borde interior de cada uno) relativas al contenedor.
  useLayoutEffect(() => {
    const cont = contRef.current;
    if (!cont) return;
    const base = cont.getBoundingClientRect();
    const nuevas = uniones.map((u) => {
      const a = izqRefs.current[u.izq]?.getBoundingClientRect();
      const b = derRefs.current[u.der]?.getBoundingClientRect();
      const ok = correctoDe[derecha[u.der]] === izquierda[u.izq];
      if (!a || !b) return { x1: 0, y1: 0, x2: 0, y2: 0, ok };
      return {
        x1: a.right - base.left,
        y1: a.top + a.height / 2 - base.top,
        x2: b.left - base.left,
        y2: b.top + b.height / 2 - base.top,
        ok,
      };
    });
    setLineas(nuevas);
  }, [uniones, derecha, izquierda, correctoDe]);

  const izqUsada = (i: number) => uniones.some((u) => u.izq === i);
  const derUsada = (i: number) => uniones.some((u) => u.der === i);

  function tocarIzq(i: number) {
    if (resuelto || izqUsada(i)) return;
    tocarLira(i);
    setSeleccionIzq(i);
  }

  function tocarDer(j: number) {
    if (resuelto || derUsada(j) || seleccionIzq === null) return;
    tocarLira(n + j);
    const nuevas = [...uniones, { izq: seleccionIzq, der: j }];
    setSeleccionIzq(null);
    setUniones(nuevas);
    // ¿terminó? (todas las izquierdas unidas)
    if (nuevas.length === n) {
      const acerto = nuevas.every(
        (u) => correctoDe[derecha[u.der]] === izquierda[u.izq]
      );
      setResuelto(true);
      onResponder?.(acerto);
    }
  }

  // deshace la última unión (por si se equivocó antes de completar)
  function deshacer() {
    if (resuelto) return;
    setUniones((u) => u.slice(0, -1));
    setSeleccionIzq(null);
  }

  const acertoTodo =
    resuelto &&
    uniones.every((u) => correctoDe[derecha[u.der]] === izquierda[u.izq]);

  return (
    <div className="relative flex flex-col items-center gap-3 text-center">
      {acertoTodo && <Fireworks />}

      <p className="font-serif text-[18px] leading-[1.3] text-ink">
        {datos.enunciado}
      </p>

      <div ref={contRef} className="relative w-full">
        {/* líneas superpuestas (no capturan toques) */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          {lineas.map((l, i) => (
            <line
              key={i}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={resuelto ? (l.ok ? "var(--sage)" : "var(--clay)") : "var(--gold)"}
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.75}
            />
          ))}
        </svg>

        <div className="flex justify-between gap-6">
          {/* COLUMNA IZQUIERDA */}
          <div className="flex flex-1 flex-col gap-2">
            {izquierda.map((txt, i) => {
              const usada = izqUsada(i);
              const sel = seleccionIzq === i;
              return (
                <button
                  key={i}
                  ref={(el) => {
                    izqRefs.current[i] = el;
                  }}
                  onClick={() => tocarIzq(i)}
                  disabled={resuelto || usada}
                  className={
                    "rounded-xl border-2 px-3 py-2 text-[15px] font-[600] transition-colors " +
                    (sel
                      ? "border-gold bg-gold-soft text-gold"
                      : usada
                        ? "border-hair text-ink-soft opacity-60"
                        : "border-hair text-ink enabled:hover:border-gold")
                  }
                >
                  {txt}
                </button>
              );
            })}
          </div>

          {/* COLUMNA DERECHA */}
          <div className="flex flex-1 flex-col gap-2">
            {derecha.map((txt, j) => {
              const usada = derUsada(j);
              return (
                <button
                  key={j}
                  ref={(el) => {
                    derRefs.current[j] = el;
                  }}
                  onClick={() => tocarDer(j)}
                  disabled={resuelto || usada || seleccionIzq === null}
                  className={
                    "rounded-xl border-2 px-3 py-2 text-[15px] font-[600] transition-colors " +
                    (usada
                      ? "border-hair text-ink-soft opacity-60"
                      : "border-hair text-ink enabled:hover:border-gold disabled:opacity-60")
                  }
                >
                  {txt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* deshacer (solo mientras no está resuelto y hay algo que deshacer) */}
      {!resuelto && uniones.length > 0 && (
        <button
          onClick={deshacer}
          className="text-[13px] text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Deshacer último
        </button>
      )}

      {resuelto && (
        <p
          className={
            "relative text-[16px] font-[600] " +
            (acertoTodo ? "text-gold" : "text-clay")
          }
        >
          {acertoTodo ? "¡Todas correctas!" : "Algunas no coinciden. ¡Casi!"}
        </p>
      )}
    </div>
  );
}
