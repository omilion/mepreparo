"use client";

import { useEffect, useRef } from "react";

// Fuegos artificiales MUY sutiles como fondo de celebración.
// Partículas suaves, escasas, con los colores de la marca, que se desvanecen.
// Decorativo: no capta clics (pointer-events none) y respeta reduced-motion.

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number; // 1 -> 0
  color: string;
  r: number;
}

const COLORES = ["#5B8A72", "#7FB394", "#C97B5A", "#DB9576"];

export function Fireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) return; // sin animación si el sistema lo pide

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth * devicePixelRatio);
    let h = (canvas.height = canvas.offsetHeight * devicePixelRatio);
    const onResize = () => {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    };
    window.addEventListener("resize", onResize);

    const particulas: Particula[] = [];

    // Lanza un "estallido" pequeño en (x,y): pocas partículas, suaves.
    function estallido(x: number, y: number) {
      const n = 14 + Math.floor(Math.random() * 8);
      const color = COLORES[Math.floor(Math.random() * COLORES.length)];
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.3;
        const vel = (0.6 + Math.random() * 1.1) * devicePixelRatio;
        particulas.push({
          x,
          y,
          vx: Math.cos(ang) * vel,
          vy: Math.sin(ang) * vel,
          vida: 1,
          color,
          r: (1.4 + Math.random() * 1.6) * devicePixelRatio,
        });
      }
    }

    let raf = 0;
    let t = 0;
    let ultimo = 0;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!ctx) return;
      t = now;

      // lanzar un estallido nuevo de vez en cuando, en posición aleatoria alta
      if (now - ultimo > 900 + Math.random() * 900) {
        ultimo = now;
        estallido(
          w * (0.2 + Math.random() * 0.6),
          h * (0.18 + Math.random() * 0.4)
        );
      }

      // rastro tenue: limpiamos con una capa casi transparente
      ctx.clearRect(0, 0, w, h);

      for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.012 * devicePixelRatio; // gravedad muy leve
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.vida -= 0.011;
        if (p.vida <= 0) {
          particulas.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.vida) * 0.5; // muy sutil
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.vida, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    raf = requestAnimationFrame(frame);
    // primer estallido casi de inmediato
    estallido(w * 0.5, h * 0.3);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
