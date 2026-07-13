"use client";

import { useEffect, useRef, useState } from "react";
import { MATERIAS, type PerfilNino } from "@/lib/profile";
import { AuraOrb } from "./AuraOrb";
import type { PlanMateria } from "@/lib/tutor/acuerdo";

// Pantalla intermedia tras el onboarding: mientras la IA prepara el plan de
// etapas de cada materia ("los mundos"), el niño ve una animación con lenguaje
// de videojuego. Al terminar, entrega el plan y se revela el mapa.

export function PrepararMundos({
  perfil,
  onListo,
}: {
  perfil: PerfilNino;
  // devuelve el plan generado (o null si no se pudo) para guardarlo y seguir al mapa
  onListo: (plan: PlanMateria[] | null) => void;
}) {
  const nombre = perfil.nombre.trim() || "estudiante";
  const materias = perfil.examen.materias;
  const [paso, setPaso] = useState(0);
  const pedido = useRef(false);
  const resultado = useRef<PlanMateria[] | null>(null);
  const listoLlamado = useRef(false);

  // guion de mensajes: intro + una línea por materia + cierre
  const mensajes = [
    `Muy bien, ${nombre}. Estoy preparando tu aventura…`,
    ...materias.map(
      (m) => `Creando el mundo de ${MATERIAS.find((x) => x.id === m)?.label ?? m}…`
    ),
    "Trazando tus etapas y desafíos…",
    "¡Todo listo! Este es tu camino ✨",
  ];

  // dispara la generación real del plan (una sola vez)
  useEffect(() => {
    if (pedido.current) return;
    pedido.current = true;
    (async () => {
      try {
        const res = await fetch("/api/plan/generar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            curso: perfil.curso,
            materias: perfil.examen.materias,
            nombre: perfil.nombre,
            diagnostico: perfil.diagnostico,
          }),
        });
        const data = await res.json();
        resultado.current = data.planMaterias ?? null;
      } catch {
        resultado.current = null;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // avanza los mensajes en el tiempo; al llegar al final entrega el resultado
  useEffect(() => {
    if (paso >= mensajes.length - 1) {
      // último mensaje: esperamos un momento y salimos (con lo que haya llegado)
      const t = setTimeout(() => {
        if (!listoLlamado.current) {
          listoLlamado.current = true;
          onListo(resultado.current);
        }
      }, 1400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPaso((p) => p + 1), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso]);

  // materia "activa" para el color de la esfera según el paso
  const idxMateria = Math.min(Math.max(paso - 1, 0), materias.length - 1);
  const materiaEsfera = materias[idxMateria] ?? perfil.examen.materias[0];

  return (
    <div
      className="mx-auto flex max-w-zen flex-col items-center justify-center gap-8 px-[22px] text-center"
      style={{ height: "100dvh" }}
    >
      <AuraOrb materia={materiaEsfera} activa size={132} />

      <div className="min-h-[80px] flex items-center">
        <p
          key={paso}
          className="mensaje-fade max-w-[28ch] font-serif text-[24px] leading-[1.3] text-ink"
        >
          {mensajes[paso]}
        </p>
      </div>

      {/* puntitos de progreso */}
      <div className="flex gap-1.5">
        {mensajes.map((_, i) => (
          <span
            key={i}
            className={
              "h-1.5 w-1.5 rounded-full transition-colors duration-300 " +
              (i <= paso ? "bg-sage-deep" : "bg-hair")
            }
          />
        ))}
      </div>

      <style jsx>{`
        .mensaje-fade {
          animation: aparecer 0.6s ease both;
        }
        @keyframes aparecer {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .mensaje-fade {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
