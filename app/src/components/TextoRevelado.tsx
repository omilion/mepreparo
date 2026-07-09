"use client";

import { useEffect, useRef, useState } from "react";

// Revela el texto de Rai por palabras, rápido y con un fade corto, para dar
// sensación de "está escribiendo" sin desesperar al niño (nada de letra por
// letra lento). Respeta prefers-reduced-motion.
//
// Clave para que NO parpadee: cada palabra se anima UNA sola vez al entrar y
// luego queda fija. Lo logramos animando solo la última palabra revelada; las
// anteriores se renderizan como texto plano ya asentado.

export function TextoRevelado({
  texto,
  onTick,
  velocidadMs = 55, // tiempo entre palabras (bajo = rápido)
}: {
  texto: string;
  onTick?: () => void;
  velocidadMs?: number;
}) {
  // tokens: palabras y espacios por separado (para conservar el espaciado)
  const tokensRef = useRef<string[]>([]);
  const [n, setN] = useState(0);
  const reduce = usaReduce();
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    tokensRef.current = texto.split(/(\s+)/);
    const total = tokensRef.current.length;

    if (reduce) {
      setN(total);
      return;
    }

    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      onTickRef.current?.();
      if (i >= total) clearInterval(id);
    }, velocidadMs);
    return () => clearInterval(id);
  }, [texto, reduce, velocidadMs]);

  const tokens = tokensRef.current;
  // texto ya asentado (sin animación) + la última palabra recién revelada
  const asentado = tokens.slice(0, Math.max(0, n - 1)).join("");
  const entrando = n > 0 ? tokens[n - 1] : "";

  return (
    <>
      {asentado}
      {entrando &&
        (/^\s+$/.test(entrando) ? (
          entrando
        ) : (
          // key ligada al índice de palabra => se monta (y anima) una vez por palabra
          <span key={n} className="palabra-fade">
            {entrando}
          </span>
        ))}
      <style jsx>{`
        .palabra-fade {
          display: inline-block;
          animation: aparecer 0.32s ease both;
        }
        @keyframes aparecer {
          from {
            opacity: 0;
            transform: translateY(2px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .palabra-fade {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}

function usaReduce(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduce;
}
