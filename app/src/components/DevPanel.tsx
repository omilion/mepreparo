"use client";

import { useState } from "react";
import { MATERIAS, type Cuenta } from "@/lib/profile";

// Panel de desarrollo. Solo se renderiza en NODE_ENV=development (lo controla
// quien lo monta). Permite: cargar datos de prueba y saltar a cualquier
// pantalla de cualquier pupilo sin llenar el onboarding a mano.

export type EtapaDev =
  | "panel"
  | "diagnostico"
  | "resultado"
  | "plan"
  | "mapa"
  | "tutor";

export function DevPanel({
  cuenta,
  onCargarPrueba,
  onLimpiar,
  onSaltar,
  accionesTutor,
}: {
  cuenta: Cuenta | null;
  onCargarPrueba: () => void;
  onLimpiar: () => void;
  // salta a `etapa` con el pupilo en el índice dado (o el panel si no aplica)
  onSaltar: (indice: number, etapa: EtapaDev) => void;
  // acciones que solo existen mientras se está en el tutor (lanzar actividades)
  accionesTutor?: {
    lanzarSopa: () => void;
    lanzarEjercicio: () => void;
    lanzarSeleccion: () => void;
    lanzarRueda: () => void;
    lanzarIntruso: () => void;
    lanzarConector: () => void;
  } | null;
}) {
  const [abierto, setAbierto] = useState(false);

  const etapas: { id: EtapaDev; label: string; requiereDiag?: boolean }[] = [
    { id: "diagnostico", label: "Diagnóstico" },
    { id: "resultado", label: "Resultado", requiereDiag: true },
    { id: "plan", label: "Plan", requiereDiag: true },
    { id: "mapa", label: "Mapa", requiereDiag: true },
    { id: "tutor", label: "Tutor", requiereDiag: true },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 text-[13px]">
      {abierto ? (
        <div className="w-[280px] rounded-xl border border-hair bg-paper/95 p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-sage-deep">🛠 Dev</span>
            <button
              onClick={() => setAbierto(false)}
              className="text-ink-soft hover:text-ink"
              aria-label="Cerrar panel de desarrollo"
            >
              ✕
            </button>
          </div>

          <div className="mb-3 flex gap-2">
            <button
              onClick={onCargarPrueba}
              className="flex-1 rounded-md bg-sage px-2 py-1.5 text-paper hover:opacity-90"
            >
              Cargar prueba
            </button>
            <button
              onClick={onLimpiar}
              className="rounded-md border border-hair px-2 py-1.5 text-ink-soft hover:border-clay hover:text-clay"
            >
              Limpiar
            </button>
          </div>

          {/* Acciones del tutor: solo aparecen cuando se está en esa pantalla
              (el Tutor las registra al montarse). Fuerzan una actividad para
              probarla sin depender de que Rai la lance. */}
          {accionesTutor && (
            <div className="mb-3">
              <div className="mb-1 text-[11px] text-ink-soft">En el tutor:</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={accionesTutor.lanzarSopa}
                  className="flex-1 rounded-md border border-hair px-2 py-1 text-[12px] hover:border-sage"
                >
                  Sopa
                </button>
                <button
                  onClick={accionesTutor.lanzarEjercicio}
                  className="flex-1 rounded-md border border-hair px-2 py-1 text-[12px] hover:border-sage"
                >
                  Opción única
                </button>
                <button
                  onClick={accionesTutor.lanzarSeleccion}
                  className="flex-1 rounded-md border border-hair px-2 py-1 text-[12px] hover:border-sage"
                >
                  Selección múltiple
                </button>
                <button
                  onClick={accionesTutor.lanzarRueda}
                  className="flex-1 rounded-md border border-hair px-2 py-1 text-[12px] hover:border-sage"
                >
                  Rueda de letras
                </button>
                <button
                  onClick={accionesTutor.lanzarIntruso}
                  className="flex-1 rounded-md border border-hair px-2 py-1 text-[12px] hover:border-sage"
                >
                  El intruso
                </button>
                <button
                  onClick={accionesTutor.lanzarConector}
                  className="flex-1 rounded-md border border-hair px-2 py-1 text-[12px] hover:border-sage"
                >
                  El conector
                </button>
              </div>
            </div>
          )}

          {cuenta && cuenta.pupilos.length > 0 ? (
            <div className="flex flex-col gap-3">
              {cuenta.pupilos.map((p, i) => {
                const diag =
                  !!p.diagnostico && Object.keys(p.diagnostico).length > 0;
                return (
                  <div key={p.id} className="rounded-lg border border-hair p-2">
                    <div className="mb-1 truncate font-medium">
                      {p.nombre || "Sin nombre"}
                    </div>
                    <div className="mb-2 truncate text-[11px] text-ink-soft">
                      {p.examen.materias
                        .map(
                          (m) => MATERIAS.find((x) => x.id === m)?.label ?? m,
                        )
                        .join(" · ") || "sin materias"}
                      {diag ? " · diagnosticado" : " · sin diagnóstico"}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {etapas.map((e) => {
                        const bloqueada = e.requiereDiag && !diag;
                        return (
                          <button
                            key={e.id}
                            disabled={bloqueada}
                            onClick={() => onSaltar(i, e.id)}
                            className="rounded border border-hair px-1.5 py-0.5 text-[11px] enabled:hover:border-sage disabled:opacity-30"
                            title={
                              bloqueada
                                ? "Requiere diagnóstico"
                                : `Ir a ${e.label}`
                            }
                          >
                            {e.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-ink-soft">
              Sin datos. Pulsa “Cargar prueba” para crear dos niños de ejemplo.
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setAbierto(true)}
          className="rounded-full border border-hair bg-paper/90 px-3 py-1.5 text-ink-soft shadow-sm backdrop-blur hover:text-sage-deep"
        >
          🛠 Dev
        </button>
      )}
    </div>
  );
}
