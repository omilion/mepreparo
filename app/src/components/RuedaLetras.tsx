"use client";

import { useMemo, useRef, useState } from "react";
import { Fireworks } from "./Fireworks";
import { tocarLira } from "@/lib/audio/liraUI";

// Rueda de letras para FORMAR LA RESPUESTA a una pregunta de Rai. Arriba la
// pregunta y las casillas vacías de la respuesta; abajo, en un círculo, las
// letras de la respuesta REVUELTAS. El niño arrastra el dedo conectando las
// letras en orden para formar la palabra. Al soltar, si acertó, se revela.
//
// Técnica táctil (igual que la sopa): elementFromPoint en pointermove para saber
// sobre qué letra está el dedo (onPointerEnter no dispara por celda en touch),
// pointer capture en el contenedor, y touch-action:none para no scrollear.

export interface DatosRueda {
  enunciado: string; // la pregunta
  respuesta: string; // la palabra a formar (mayúsculas, sin espacios)
  letras: string[]; // letras de la respuesta, revueltas (mayúsculas)
}

interface Punto {
  x: number;
  y: number;
}

export function RuedaLetras({
  datos,
  onCompleta,
}: {
  datos: DatosRueda;
  onCompleta?: () => void;
}) {
  const { letras } = datos;
  const respuesta = useMemo(() => datos.respuesta.toUpperCase(), [datos.respuesta]);

  const [resuelto, setResuelto] = useState(false);
  // índices de las letras seleccionadas en la rueda, en orden
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const seleccionRef = useRef<number[]>([]);
  const arrastrando = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [feedback, setFeedback] = useState<"" | "mal">("");

  // Layout circular: repartimos las letras en un círculo (coords 0-100 del
  // viewBox). Con una sola letra la ponemos al centro.
  const R = 34;
  const CX = 50;
  const CY = 50;
  const n = letras.length;
  // radio de cada ficha adaptado a cuántas letras hay: si son muchas, se achican
  // para no solaparse (la separación entre vecinas es 2·R·sin(π/n)). Tope 9.
  const rFicha = useMemo(() => {
    if (n <= 1) return 11;
    const separacion = 2 * R * Math.sin(Math.PI / n);
    return Math.max(6, Math.min(9, separacion * 0.42));
  }, [n]);
  const posiciones = useMemo<Punto[]>(() => {
    return letras.map((_, i) => {
      if (n === 1) return { x: CX, y: CY };
      const ang = (Math.PI * 2 * i) / n - Math.PI / 2; // arranca arriba
      return { x: CX + R * Math.cos(ang), y: CY + R * Math.sin(ang) };
    });
  }, [letras, n]);

  const palabraActual = useMemo(
    () => seleccion.map((i) => letras[i]).join(""),
    [seleccion, letras]
  );

  function fijar(sel: number[]) {
    seleccionRef.current = sel;
    setSeleccion(sel);
  }

  // Índice de la letra bajo el punto (dedo/mouse), leyendo el data-idx del nodo.
  function letraEnPunto(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const idx = el?.dataset?.idx;
    if (idx === undefined) return null;
    return Number(idx);
  }

  function iniciar(clientX: number, clientY: number) {
    if (resuelto) return;
    const i = letraEnPunto(clientX, clientY);
    if (i === null) return;
    arrastrando.current = true;
    setFeedback("");
    fijar([i]);
    tocarLira(i); // cada ficha suena una nota distinta según su posición
  }

  function mover(clientX: number, clientY: number) {
    if (!arrastrando.current) return;
    const i = letraEnPunto(clientX, clientY);
    if (i === null) return;
    const sel = seleccionRef.current;
    if (sel[sel.length - 1] === i) return; // misma letra, ignorar
    if (sel.length >= 2 && sel[sel.length - 2] === i) {
      fijar(sel.slice(0, -1)); // el dedo volvió atrás → deshace
      return;
    }
    if (sel.includes(i)) return; // ya usada, no se reutiliza
    fijar([...sel, i]);
    tocarLira(i); // cada ficha su propia nota
  }

  function terminar() {
    if (!arrastrando.current) return;
    arrastrando.current = false;
    const formada = seleccionRef.current.map((i) => letras[i]).join("");
    fijar([]);
    if (formada.length < 2) return;
    if (formada === respuesta) {
      setResuelto(true);
      setFeedback("");
      onCompleta?.();
    } else {
      setFeedback("mal");
    }
  }

  // Puntos de la línea que une las letras seleccionadas (para el SVG).
  const trazo = seleccion.map((i) => posiciones[i]);

  return (
    <div className="relative flex w-full flex-col items-center gap-4 text-center">
      {resuelto && <Fireworks />}

      {/* PREGUNTA */}
      <p className="font-serif text-[18px] leading-[1.3] text-ink">
        {datos.enunciado}
      </p>

      {/* CASILLAS DE LA RESPUESTA — se van llenando con lo que se forma.
          Vacías: borde punteado visible (antes eran casi invisibles). El tamaño
          se achica si la palabra es larga, para no desbordar en móvil. */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {respuesta.split("").map((letra, i) => {
          const actual = palabraActual[i];
          const mostrar = resuelto ? letra : actual ?? "";
          const chico = respuesta.length > 7;
          return (
            <span
              key={i}
              className={
                "flex items-center justify-center rounded-md border-2 font-[600] transition-colors " +
                (chico ? "h-8 w-8 text-[15px] " : "h-10 w-10 text-[18px] ") +
                (resuelto
                  ? "border-gold bg-gold-soft text-gold"
                  : actual
                    ? "border-gold/60 bg-gold-soft/50 text-gold"
                    : "border-dashed border-hair bg-surface/40 text-ink")
              }
            >
              {mostrar}
            </span>
          );
        })}
      </div>

      {/* feedback */}
      <div className="h-6">
        {feedback === "mal" && !resuelto && (
          <span className="text-[14px] text-ink-soft">
            Esa no es… ¡vuelve a intentarlo!
          </span>
        )}
        {resuelto && (
          <span className="relative text-[16px] font-[600] text-gold">
            ¡Correcto!
          </span>
        )}
      </div>

      {/* RUEDA DE LETRAS */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="w-[70%] max-w-[280px] touch-none select-none"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          svgRef.current?.setPointerCapture(e.pointerId);
          iniciar(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => mover(e.clientX, e.clientY)}
        onPointerUp={terminar}
        onPointerCancel={terminar}
      >
        {/* línea que une las letras seleccionadas */}
        {trazo.length >= 2 && (
          <polyline
            points={trazo.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.7}
          />
        )}
        {/* fichas de letra */}
        {letras.map((letra, i) => {
          const p = posiciones[i];
          const activa = seleccion.includes(i);
          return (
            <g key={i}>
              <circle
                data-idx={i}
                cx={p.x}
                cy={p.y}
                r={rFicha}
                fill={activa ? "var(--gold-soft)" : "var(--surface)"}
                stroke={activa ? "var(--gold)" : "var(--hair)"}
                strokeWidth={activa ? 1.5 : 1}
              />
              <text
                data-idx={i}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={rFicha}
                fontWeight={600}
                fill={activa ? "var(--gold)" : "var(--ink)"}
                style={{ pointerEvents: "none" }}
              >
                {letra}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
