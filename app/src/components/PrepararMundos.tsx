"use client";

import { useEffect, useRef, useState } from "react";
import { MATERIAS, type Materia, type PerfilNino } from "@/lib/profile";
import { AuraOrb } from "./AuraOrb";
import type { PlanMateria } from "@/lib/tutor/acuerdo";

// Pantalla intermedia tras el onboarding: mientras la IA prepara el plan de
// etapas de cada materia ("los mundos"), el niño ve una animación con lenguaje
// de videojuego. Al terminar, entrega el plan y se revela el mapa.
//
// LA ANIMACIÓN VA AL RITMO DEL TRABAJO REAL. Antes el guion corría con
// temporizadores fijos (~10s) mientras el servidor generaba las materias en
// serie (15-25s con 4 o 5): la animación ganaba la carrera, se llamaba onListo
// con `null` y el plan personalizado se tiraba a la basura sin que nadie se
// enterara — el niño terminaba con la ruta genérica del banco. Ahora se pide
// UNA MATERIA A LA VEZ y cada mensaje espera a que esa materia esté lista, así
// "Creando el mundo de Matemática…" es literal.

// Aunque la IA responda al instante, cada mensaje se queda este mínimo en
// pantalla: si no, el guion pasa de largo y no alcanza a leerse.
const MIN_POR_PASO = 1300;
// Techo por materia y techo total. Nadie se queda mirando la esfera para
// siempre: lo que no alcance a llegar cae al orden del banco (que es un plan
// válido, solo que no personalizado).
const TOPE_POR_MATERIA = 30_000;
const TOPE_TOTAL = 90_000;

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
  const arrancado = useRef(false);

  // guion: intro + una línea por materia + trazado + cierre
  const mensajes = [
    `Muy bien, ${nombre}. Estoy preparando tu aventura…`,
    ...materias.map(
      (m) => `Creando el mundo de ${MATERIAS.find((x) => x.id === m)?.label ?? m}…`
    ),
    "Trazando tus etapas y desafíos…",
    "¡Todo listo! Este es tu camino ✨",
  ];

  useEffect(() => {
    if (arrancado.current) return;
    arrancado.current = true;
    let cancelado = false;

    // Pide UNA materia. El endpoint ya cae al orden del banco si la IA falla,
    // así que casi siempre devuelve algo usable.
    async function generarMateria(m: Materia): Promise<PlanMateria | null> {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TOPE_POR_MATERIA);
      try {
        const res = await fetch("/api/plan/generar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            curso: perfil.curso,
            materias: [m],
            nombre: perfil.nombre,
            diagnostico: perfil.diagnostico,
          }),
          signal: ctrl.signal,
        });
        const data = await res.json();
        return data.planMaterias?.[0] ?? null;
      } catch {
        return null; // esta materia se queda con la ruta del banco
      } finally {
        clearTimeout(t);
      }
    }

    const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const completarPaso = async (inicio: number) => {
      const falta = MIN_POR_PASO - (Date.now() - inicio);
      if (falta > 0) await pausa(falta);
    };

    (async () => {
      const inicioTodo = Date.now();
      const plan: PlanMateria[] = [];

      await completarPaso(Date.now()); // la intro alcanza a leerse

      for (let i = 0; i < materias.length; i++) {
        if (cancelado) return;
        setPaso(i + 1);
        const inicio = Date.now();
        // pasado el techo total dejamos de pedir, pero el guion se completa
        if (Date.now() - inicioTodo < TOPE_TOTAL) {
          const uno = await generarMateria(materias[i]);
          if (uno) plan.push(uno);
        }
        if (cancelado) return;
        await completarPaso(inicio);
      }

      if (cancelado) return;
      setPaso(materias.length + 1); // "Trazando tus etapas…"
      await pausa(1100);
      if (cancelado) return;
      setPaso(materias.length + 2); // "¡Todo listo!"
      await pausa(1500);
      if (cancelado) return;
      onListo(plan.length > 0 ? plan : null);
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // materia "activa" para el color de la esfera según el paso
  const idxMateria = Math.min(Math.max(paso - 1, 0), materias.length - 1);
  const materiaEsfera = materias[idxMateria] ?? perfil.examen.materias[0];
  const terminado = paso >= mensajes.length - 1;

  return (
    <div
      className="zen-page flex flex-col items-center justify-center gap-8 text-center"
      style={{ height: "100dvh" }}
    >
      {/* Rai piensa mientras trabaja de verdad, y celebra cuando está listo */}
      <AuraOrb
        materia={materiaEsfera}
        estado={terminado ? "celebracion" : "pensando"}
        size={132}
      />

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
