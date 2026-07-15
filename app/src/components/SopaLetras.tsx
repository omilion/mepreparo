"use client";

import { useMemo, useRef, useState } from "react";

// Coordenada de celda en el grid.
export interface Celda {
  x: number;
  y: number;
}

// Una palabra colocada, con su camino de celdas (lo entrega @blex41/word-search).
export interface PalabraSopa {
  clean: string; // texto en mayúsculas, sin tildes (como aparece en el grid)
  path: Celda[];
}

export interface DatosSopa {
  grid: string[]; // filas de letras, cada string es una fila ("XQORNIRO")
  palabras: PalabraSopa[];
}

// Sopa de letras táctil. Selección por LÍNEAS RECTAS (horizontal, vertical,
// diagonal): guardamos la celda inicial y la celda bajo el dedo, y derivamos la
// recta entre ambas. Esto evita rastrear cada celda intermedia (que en móvil no
// dispara eventos por celda) y es como funcionan las sopas de verdad.
//
// El truco para que funcione en el TÁCTIL del teléfono: en pointermove no
// confiamos en onPointerEnter (el touch "captura" la celda de origen y no emite
// enter/leave por las que cruza). Usamos document.elementFromPoint() con las
// coordenadas del dedo para saber sobre qué celda está en cada frame.
export function SopaLetras({
  datos,
  onCompleta,
}: {
  datos: DatosSopa;
  onCompleta?: () => void;
}) {
  const filas = datos.grid.length;
  const cols = datos.grid[0]?.length ?? 0;

  // set de palabras ya encontradas (por su texto limpio)
  const [encontradas, setEncontradas] = useState<Set<string>>(new Set());
  // celdas de la selección en curso (mientras el dedo/mouse arrastra). La
  // guardamos TAMBIÉN en un ref: al soltar (pointerup) el estado del closure
  // puede ir desfasado, así que la comprobación lee siempre el ref (fuente de
  // verdad), no el estado. Sin esto, con mouse rápido no se detectaba nada.
  const [seleccion, setSeleccion] = useState<Celda[]>([]);
  const seleccionRef = useRef<Celda[]>([]);
  const inicioRef = useRef<Celda | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  function fijarSeleccion(celdas: Celda[]) {
    seleccionRef.current = celdas;
    setSeleccion(celdas);
  }

  // celdas que pertenecen a alguna palabra ya encontrada → se pintan fijas
  const celdasResueltas = useMemo(() => {
    const s = new Set<string>();
    for (const p of datos.palabras) {
      if (encontradas.has(p.clean)) {
        for (const c of p.path) s.add(`${c.x},${c.y}`);
      }
    }
    return s;
  }, [datos.palabras, encontradas]);

  const seleccionSet = useMemo(
    () => new Set(seleccion.map((c) => `${c.x},${c.y}`)),
    [seleccion]
  );

  // Deriva la línea recta de celdas entre inicio y fin. Devuelve [] si el tramo
  // no es horizontal, vertical ni diagonal perfecta (así no se selecciona en "L").
  function lineaRecta(a: Celda, b: Celda): Celda[] {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const pasosX = Math.abs(dx);
    const pasosY = Math.abs(dy);
    const rectaValida = dx === 0 || dy === 0 || pasosX === pasosY;
    if (!rectaValida) return [a];
    const pasos = Math.max(pasosX, pasosY);
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    const celdas: Celda[] = [];
    for (let i = 0; i <= pasos; i++) {
      celdas.push({ x: a.x + sx * i, y: a.y + sy * i });
    }
    return celdas;
  }

  // Dada una posición de pantalla (dedo/mouse), devuelve la celda del grid que
  // hay debajo, leyendo el data-attr que ponemos en cada celda.
  function celdaEnPunto(clientX: number, clientY: number): Celda | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const cx = el?.dataset?.cx;
    const cy = el?.dataset?.cy;
    if (cx === undefined || cy === undefined) return null;
    return { x: Number(cx), y: Number(cy) };
  }

  function iniciar(clientX: number, clientY: number) {
    const c = celdaEnPunto(clientX, clientY);
    if (!c) return;
    inicioRef.current = c;
    fijarSeleccion([c]);
  }

  function mover(clientX: number, clientY: number) {
    if (!inicioRef.current) return;
    const c = celdaEnPunto(clientX, clientY);
    if (!c) return;
    fijarSeleccion(lineaRecta(inicioRef.current, c));
  }

  function terminar() {
    if (!inicioRef.current) return;
    comprobarSeleccion(seleccionRef.current);
    inicioRef.current = null;
    fijarSeleccion([]);
  }

  // ¿La selección corresponde a una palabra? Aceptamos el camino en cualquiera
  // de sus dos sentidos (el niño puede arrastrar de fin a inicio).
  function comprobarSeleccion(sel: Celda[]) {
    if (sel.length < 2) return;
    const clave = (cs: Celda[]) => cs.map((c) => `${c.x},${c.y}`).join("|");
    const selKey = clave(sel);
    const selKeyRev = clave([...sel].reverse());
    for (const p of datos.palabras) {
      if (encontradas.has(p.clean)) continue;
      const pKey = clave(p.path);
      if (pKey === selKey || pKey === selKeyRev) {
        const next = new Set(encontradas);
        next.add(p.clean);
        setEncontradas(next);
        if (next.size === datos.palabras.length) onCompleta?.();
        return;
      }
    }
  }

  const listo = encontradas.size === datos.palabras.length;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* GRID */}
      <div
        ref={contenedorRef}
        className="select-none touch-none"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "2px",
          width: "100%",
          maxWidth: `${cols * 40}px`,
          // touch-action:none evita que el arrastre haga scroll de la página
          touchAction: "none",
        }}
        onPointerDown={(e) => {
          // Capturamos el puntero en el CONTENEDOR: así el move/up siguen
          // llegando aunque el dedo/mouse se salga del grid, y podemos usar
          // elementFromPoint sin que el target original "secuestre" los eventos.
          contenedorRef.current?.setPointerCapture(e.pointerId);
          iniciar(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => mover(e.clientX, e.clientY)}
        onPointerUp={terminar}
        onPointerCancel={terminar}
      >
        {datos.grid.map((fila, y) =>
          fila.split("").map((letra, x) => {
            const key = `${x},${y}`;
            const activa = seleccionSet.has(key);
            const resuelta = celdasResueltas.has(key);
            return (
              <div
                key={key}
                data-cx={x}
                data-cy={y}
                className={
                  "flex aspect-square items-center justify-center rounded-md text-[15px] font-[600] transition-colors " +
                  (resuelta
                    ? "bg-sage/25 text-sage-deep"
                    : activa
                      ? "bg-sage/40 text-ink"
                      : "bg-surface/60 text-ink")
                }
              >
                {letra}
              </div>
            );
          })
        )}
      </div>

      {/* PALABRAS A BUSCAR */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {datos.palabras.map((p) => {
          const hallada = encontradas.has(p.clean);
          return (
            <span
              key={p.clean}
              className={
                "text-[13px] transition-colors " +
                (hallada
                  ? "text-sage-deep line-through opacity-70"
                  : "text-ink-soft")
              }
            >
              {p.clean}
            </span>
          );
        })}
      </div>

      {listo && (
        <p className="text-[13px] text-sage-deep">¡Las encontraste todas! 🎉</p>
      )}
    </div>
  );
}
