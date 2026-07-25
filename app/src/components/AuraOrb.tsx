"use client";

import { memo, useEffect, useId, useRef } from "react";
import type { Materia } from "@/lib/profile";
import {
  EMITE_RIPPLE,
  expresionDe,
  GESTOS,
  normalizarEstado,
  type Expresion,
  type Gesto,
} from "@/lib/tutor/expresion";

// LA PRESENCIA DE RAI: UN SOLO TRAZO
//
// Rai es un anillo, no una mancha. No hay relleno, no hay iconos y no hay
// pulsos de brillo. Lo único que cambia es el CONTORNO: su grosor, su color,
// la onda que lo deforma y cada cuánto respira.
//
// Cómo se anima (y por qué no es CSS):
// El contorno se dibuja punto a punto en un <path> de SVG, así que la onda es
// real (lóbulos que recorren el anillo) y no un border-radius fingido. Cada
// cuadro interpolamos los parámetros ACTUALES hacia los del estado objetivo con
// un suavizado exponencial: por eso pasar de "pensando" a "celebracion" es un
// deslizamiento continuo y no un corte. Las fases (onda y respiración) se
// acumulan en el tiempo, así que cambiar de ritmo nunca produce un salto.
//
// Rendimiento: un rAF que solo toca atributos del SVG — cero re-renders de
// React. Se apaga con prefers-reduced-motion (queda el anillo quieto).

const COLORES: Record<Materia, [string, string]> = {
  matematica: ["#7FB0FF", "#C9A7F5"], // azul → lila
  lenguaje: ["#F2A65A", "#F5C77E"], // ámbar cálido
  ciencias: ["#6FD3B4", "#8FE0C6"], // verde agua
  historia: ["#E4917A", "#F0B79E"], // terracota
  ingles: ["#F58AB0", "#9AB8FF"], // rosa → azul
};

const PUNTOS = 160; // resolución del contorno
const MAX_RIPPLES = 4;
const RIPPLE_DUR = 2200; // ms que tarda un anillo en salir y desvanecerse
// Segundos que tarda un parámetro en recorrer ~63% del camino al objetivo.
// Alto a propósito: las emociones de Rai entran despacio.
const SUAVIZADO = 0.75;
// El "ritmo de las frases" cuando habla: una ondulación cada ~0.92s. Solo
// afecta al estado "hablando" (es el único con voz > 0).
const CICLO_VOZ = 0.92;

const NUMERICOS = [
  "grosor",
  "radio",
  "peso",
  "opacidad",
  "lobulos",
  "amplitud",
  "velocidad",
  "pulso",
  "ritmo",
  "halo",
  "voz",
  "desvanece",
] as const;

function hexARgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mezclar(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexARgb(a);
  const [r2, g2, b2] = hexARgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${m(r1, r2)}, ${m(g1, g2)}, ${m(b1, b2)})`;
}

// Deformación de un gesto (asentir/negar): un desplazamiento del anillo en un
// eje MÁS una compresión en ese mismo eje. La compresión es la que hace que el
// borde que va "por delante" se hunda hacia adentro y el opuesto solo se estire
// un poco — igual que una cabeza al asentir. Neutro = sin gesto.
type Deformacion = { compX: number; offX: number; compY: number; offY: number };
const SIN_GESTO: Deformacion = { compX: 1, offX: 0, compY: 1, offY: 0 };

// s va de -1 a 1: en "sí", s > 0 sube (abajo entra, arriba se estira poco).
function deformar(g: Gesto, s: number, R: number): Deformacion {
  const comp = 1 - g.compresion * Math.abs(s);
  const off = g.amplitud * s * R;
  return g.eje === "y"
    ? { compX: 1, offX: 0, compY: comp, offY: -off } // -y = hacia arriba
    : { compX: comp, offX: off, compY: 1, offY: 0 };
}

// El contorno: un círculo deformado por dos armónicos. Los lóbulos son un valor
// DECIMAL que se interpola entre dos armónicos enteros consecutivos — así la
// onda cambia de forma sin saltos y siempre cierra sobre sí misma (sin costura).
function trazarOnda(
  e: Expresion,
  fase: number,
  fasePulso: number,
  envolvente: number,
  g: Deformacion = SIN_GESTO
) {
  const R = 50 * e.radio;
  const n1 = Math.floor(e.lobulos);
  const w = e.lobulos - n1;
  const respiracion = 1 + e.pulso * Math.sin(fasePulso);
  const amp = e.amplitud * (1 + e.voz * 0.7 * envolvente);

  let d = "";
  for (let i = 0; i < PUNTOS; i++) {
    const th = (i / PUNTOS) * Math.PI * 2;
    const onda =
      ((1 - w) * Math.sin(n1 * th + fase) +
        w * Math.sin((n1 + 1) * th + fase) +
        0.35 * Math.sin((n1 + 2) * th - fase * 0.6)) /
      1.35;
    const r = R * respiracion * (1 + amp * onda);
    const x = 50 + r * Math.cos(th) * g.compX + g.offX;
    const y = 50 + r * Math.sin(th) * g.compY + g.offY;
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
  }
  return d + "Z";
}

export const AuraOrb = memo(function AuraOrb({
  materia,
  activa,
  size = 120,
  estado,
}: {
  materia: Materia;
  activa?: boolean; // true mientras Rai piensa (si no se da un estado explícito)
  size?: number;
  estado?: string; // ver EstadoRai en lib/tutor/expresion.ts
}) {
  const uid = useId().replace(/[:]/g, "");
  const [c1, c2] = COLORES[materia] ?? COLORES.matematica;
  const nombreEstado = normalizarEstado(estado || (activa ? "pensando" : "reposo"));

  const trazoRef = useRef<SVGPathElement>(null);
  const haloRef = useRef<SVGPathElement>(null);
  const rippleRefs = useRef<(SVGCircleElement | null)[]>([]);
  const stop1Ref = useRef<SVGStopElement>(null);
  const stop2Ref = useRef<SVGStopElement>(null);

  // objetivo = a dónde vamos; actual = dónde está el trazo ahora mismo.
  const objetivo = useRef<Expresion>(expresionDe(nombreEstado));
  const actual = useRef<Expresion>({ ...expresionDe(nombreEstado) });
  const ripples = useRef<number[]>([]); // timestamps de inicio
  // gesto en curso (asentir/negar): tiene principio y fin, no es un estado
  const gesto = useRef<{ g: Gesto; inicio: number } | null>(null);

  // Cambio de estado: solo movemos el objetivo (el bucle hace la transición) y,
  // si el estado lo amerita, lanzamos anillos hacia afuera como gesto puntual.
  useEffect(() => {
    objetivo.current = expresionDe(nombreEstado);
    const ahora = performance.now();
    const g = GESTOS[nombreEstado];
    if (g) gesto.current = { g, inicio: ahora };
    const cuantos = EMITE_RIPPLE[nombreEstado] ?? 0;
    for (let i = 0; i < cuantos; i++) ripples.current.push(ahora + i * 450);
    if (ripples.current.length > MAX_RIPPLES) {
      ripples.current = ripples.current.slice(-MAX_RIPPLES);
    }
  }, [nombreEstado]);

  useEffect(() => {
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let previo = performance.now();
    let fase = 0;
    let fasePulso = 0;
    let tVoz = 0;

    function cuadro(ahora: number) {
      const dt = Math.min(0.05, (ahora - previo) / 1000); // capa saltos de pestaña
      previo = ahora;

      // Suavizado exponencial hacia el estado objetivo: independiente del fps.
      const k = 1 - Math.exp(-dt / SUAVIZADO);
      const a = actual.current;
      const o = objetivo.current;
      for (const key of NUMERICOS) a[key] += (o[key] - a[key]) * k;
      a.acento = o.acento;

      fase += a.velocidad * dt;
      fasePulso += ((Math.PI * 2) / a.ritmo) * dt;
      tVoz += dt;
      const envolvente = 0.5 + 0.5 * Math.sin((tVoz / CICLO_VOZ) * Math.PI * 2);

      // GESTO en curso: oscilación con una envolvente que entra y sale desde
      // cero (sin(π·x)), para que empiece y termine sin tirones.
      let deformacion = SIN_GESTO;
      if (gesto.current) {
        const { g, inicio } = gesto.current;
        const x = (ahora - inicio) / g.duracion;
        if (x >= 1) {
          gesto.current = null;
        } else {
          const t = (ahora - inicio) / 1000;
          const s = Math.sin(t * g.frecuencia * Math.PI * 2) * Math.sin(Math.PI * x);
          deformacion = deformar(g, s, 50 * a.radio);
        }
      }

      const d = trazarOnda(a, fase, fasePulso, envolvente, deformacion);
      const grosor = (a.grosor * 100) / 128; // px de referencia → unidades del viewBox
      // La opacidad se apaga y vuelve con la respiración solo si el estado lo
      // pide (sin conexión). En todos los demás, `desvanece` es 0 y no hace nada.
      const opacidad =
        a.opacidad * (1 - a.desvanece * (0.5 + 0.5 * Math.sin(fasePulso)));

      trazoRef.current?.setAttribute("d", d);
      trazoRef.current?.setAttribute("stroke-width", grosor.toFixed(3));
      trazoRef.current?.setAttribute("opacity", opacidad.toFixed(3));

      if (haloRef.current) {
        haloRef.current.setAttribute("d", d);
        haloRef.current.setAttribute("stroke-width", (grosor * 2.6).toFixed(3));
        haloRef.current.setAttribute("opacity", (a.halo * 0.9).toFixed(3));
      }

      // COLOR: el degradado de la materia teñido por el acento del estado.
      stop1Ref.current?.setAttribute("stop-color", mezclar(c1, a.acento, a.peso));
      stop2Ref.current?.setAttribute("stop-color", mezclar(c2, a.acento, a.peso));

      // RIPPLES: anillos que salen del contorno y se disuelven.
      const R = 50 * a.radio;
      for (let i = 0; i < MAX_RIPPLES; i++) {
        const el = rippleRefs.current[i];
        if (!el) continue;
        const inicio = ripples.current[i];
        if (inicio === undefined || ahora < inicio) {
          el.setAttribute("opacity", "0");
          continue;
        }
        const x = (ahora - inicio) / RIPPLE_DUR;
        if (x >= 1) {
          el.setAttribute("opacity", "0");
          continue;
        }
        const p = 1 - (1 - x) * (1 - x); // desacelera al alejarse
        el.setAttribute("r", (R + (49 - R) * p).toFixed(2));
        el.setAttribute("stroke-width", (grosor * (1 - p) * 0.9).toFixed(3));
        el.setAttribute("opacity", ((1 - p) * opacidad * 0.55).toFixed(3));
      }
      // limpia los que ya terminaron para no arrastrar la lista
      if (ripples.current.length && ahora - ripples.current[0] > RIPPLE_DUR) {
        ripples.current.shift();
      }

      raf = requestAnimationFrame(cuadro);
    }

    if (quieto) {
      // Sin movimiento: el anillo del estado actual, dibujado una sola vez.
      const e = objetivo.current;
      actual.current = { ...e };
      trazoRef.current?.setAttribute("d", trazarOnda(e, 0, 0, 0));
      trazoRef.current?.setAttribute("stroke-width", ((e.grosor * 100) / 128).toFixed(3));
      trazoRef.current?.setAttribute("opacity", String(e.opacidad));
      return;
    }

    raf = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(raf);
  }, [c1, c2]);

  // Trazo inicial (primer paint y SSR): el estado en reposo de la onda.
  const dInicial = trazarOnda(actual.current, 0, 0, 0);

  return (
    <div
      style={{
        width: size,
        height: size,
        transition: "width .7s ease-in-out, height .7s ease-in-out",
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        style={{ overflow: "visible", display: "block" }}
      >
        <defs>
          <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop ref={stop1Ref} offset="0%" stopColor={c1} />
            <stop ref={stop2Ref} offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>

        {/* HALO: el mismo trazo, más ancho y desenfocado. Nunca protagonista. */}
        <path
          ref={haloRef}
          d={dInicial}
          fill="none"
          stroke={`url(#g-${uid})`}
          strokeLinejoin="round"
          opacity="0"
          style={{ filter: "blur(2.5px)" }}
        />

        {/* RIPPLES: gestos puntuales (acierto, saludo, idea) */}
        {Array.from({ length: MAX_RIPPLES }).map((_, i) => (
          <circle
            key={i}
            ref={(el) => {
              rippleRefs.current[i] = el;
            }}
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={`url(#g-${uid})`}
            opacity="0"
          />
        ))}

        {/* EL TRAZO: Rai */}
        <path
          ref={trazoRef}
          d={dInicial}
          fill="none"
          stroke={`url(#g-${uid})`}
          strokeLinejoin="round"
          strokeWidth={(actual.current.grosor * 100) / 128}
          opacity={actual.current.opacidad}
        />
      </svg>
    </div>
  );
});
