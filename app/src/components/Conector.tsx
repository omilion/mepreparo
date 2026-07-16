"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Fireworks } from "./Fireworks";
import { tocarLira } from "@/lib/audio/liraUI";

// "El Conector": unir con líneas. Dos columnas de elementos; el niño MANTIENE
// pulsado un elemento, arrastra el dedo (la línea lo sigue) y suelta sobre su par
// de la otra columna. Al unir todos, se completa. Mismo motor táctil que la sopa
// y la rueda (elementFromPoint + pointer capture). Las líneas se dibujan en un
// SVG superpuesto con las coordenadas reales de los botones.

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
  // columna izquierda en orden; derecha barajada (una sola vez, al montar).
  // MEMOIZADAS: si se recrean en cada render, el useLayoutEffect de abajo (que
  // las tiene como dependencia) entra en bucle infinito de setState.
  const izquierda = useMemo(() => datos.pares.map((p) => p.izq), [datos.pares]);
  const [derecha] = useState(() => revolver(datos.pares.map((p) => p.der)));

  // para saber si una unión izq→der es correcta: mapa der(texto) → izq(texto)
  const correctoDe = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of datos.pares) map[p.der] = p.izq;
    return map;
  }, [datos.pares]);

  const [uniones, setUniones] = useState<Union[]>([]);
  const [resuelto, setResuelto] = useState(false);

  // refs a los nodos para calcular las coordenadas de las líneas
  const contRef = useRef<HTMLDivElement>(null);
  const izqRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const derRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [lineas, setLineas] = useState<
    { x1: number; y1: number; x2: number; y2: number; ok: boolean }[]
  >([]);

  // arrastre en curso: nodo de origen y punto actual del dedo (para la línea viva)
  const origenRef = useRef<{ lado: "izq" | "der"; idx: number } | null>(null);
  const [arrastre, setArrastre] = useState<
    { x1: number; y1: number; x2: number; y2: number } | null
  >(null);

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

  // Nodo (botón) bajo el punto del dedo/mouse, leyendo data-lado y data-idx.
  function nodoEnPunto(
    clientX: number,
    clientY: number
  ): { lado: "izq" | "der"; idx: number } | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const nodo = el?.closest?.("[data-lado]") as HTMLElement | null;
    const lado = nodo?.dataset?.lado as "izq" | "der" | undefined;
    const idx = nodo?.dataset?.idx;
    if (!lado || idx === undefined) return null;
    return { lado, idx: Number(idx) };
  }

  // punto de conexión de un nodo (centro del borde que mira a la otra columna)
  function anclaDe(lado: "izq" | "der", idx: number) {
    const base = contRef.current?.getBoundingClientRect();
    const r = (lado === "izq" ? izqRefs : derRefs).current[idx]?.getBoundingClientRect();
    if (!base || !r) return null;
    return {
      x: (lado === "izq" ? r.right : r.left) - base.left,
      y: r.top + r.height / 2 - base.top,
    };
  }

  function libre(lado: "izq" | "der", idx: number) {
    return lado === "izq" ? !izqUsada(idx) : !derUsada(idx);
  }

  function iniciar(clientX: number, clientY: number) {
    if (resuelto) return;
    const nodo = nodoEnPunto(clientX, clientY);
    if (!nodo || !libre(nodo.lado, nodo.idx)) return;
    origenRef.current = nodo;
    tocarLira(nodo.lado === "izq" ? nodo.idx : n + nodo.idx);
    const a = anclaDe(nodo.lado, nodo.idx);
    const base = contRef.current!.getBoundingClientRect();
    if (a) setArrastre({ x1: a.x, y1: a.y, x2: clientX - base.left, y2: clientY - base.top });
  }

  function mover(clientX: number, clientY: number) {
    if (!origenRef.current) return;
    const base = contRef.current!.getBoundingClientRect();
    setArrastre((prev) =>
      prev ? { ...prev, x2: clientX - base.left, y2: clientY - base.top } : prev
    );
  }

  function terminar(clientX: number, clientY: number) {
    const origen = origenRef.current;
    origenRef.current = null;
    setArrastre(null);
    if (!origen) return;
    const destino = nodoEnPunto(clientX, clientY);
    // válido solo si suelto en la OTRA columna, sobre un nodo libre
    if (!destino || destino.lado === origen.lado || !libre(destino.lado, destino.idx)) {
      return;
    }
    const izq = origen.lado === "izq" ? origen.idx : destino.idx;
    const der = origen.lado === "der" ? origen.idx : destino.idx;
    tocarLira(n + der);
    const nuevas = [...uniones, { izq, der }];
    setUniones(nuevas);
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

      <div
        ref={contRef}
        className="relative w-full touch-none select-none"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          contRef.current?.setPointerCapture(e.pointerId);
          iniciar(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => mover(e.clientX, e.clientY)}
        onPointerUp={(e) => terminar(e.clientX, e.clientY)}
        onPointerCancel={(e) => terminar(e.clientX, e.clientY)}
      >
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
          {/* línea viva mientras se arrastra */}
          {arrastre && (
            <line
              x1={arrastre.x1}
              y1={arrastre.y1}
              x2={arrastre.x2}
              y2={arrastre.y2}
              stroke="var(--gold)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="4 4"
              opacity={0.6}
            />
          )}
        </svg>

        <div className="flex justify-between gap-6">
          {/* COLUMNA IZQUIERDA */}
          <div className="flex flex-1 flex-col gap-2">
            {izquierda.map((txt, i) => {
              const usada = izqUsada(i);
              return (
                <button
                  key={i}
                  data-lado="izq"
                  data-idx={i}
                  ref={(el) => {
                    izqRefs.current[i] = el;
                  }}
                  disabled={resuelto || usada}
                  className={
                    "rounded-xl border-2 px-3 py-2 text-[15px] font-[600] transition-colors " +
                    (usada
                      ? "border-gold/50 bg-gold-soft/40 text-gold"
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
                  data-lado="der"
                  data-idx={j}
                  ref={(el) => {
                    derRefs.current[j] = el;
                  }}
                  disabled={resuelto || usada}
                  className={
                    "rounded-xl border-2 px-3 py-2 text-[15px] font-[600] transition-colors " +
                    (usada
                      ? "border-gold/50 bg-gold-soft/40 text-gold"
                      : "border-hair text-ink enabled:hover:border-gold")
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
