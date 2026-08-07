"use client";

// El panel apoderado "en qué va" (no solo "cuánto"). La joya del modelo de
// datos —temas con su estado, evidencias y frases textuales del niño— ya
// existe en `tutoria.temas`, pero nunca se le mostraba al padre. Esto la
// expone tal cual: sin abrir el chat, el apoderado ve en qué está flojo su
// hijo y qué dijo al respecto.
//
// JERARQUÍA: lo accionable primero. "Qué reforzar esta semana" es lo único
// que le pide una decisión al apoderado, así que va destacado arriba; el
// detalle por materia queda abajo, en grilla, y dentro de cada materia lo que
// le cuesta va primero. Antes era una lista plana de 20 temas todos del mismo
// peso, donde lo importante se perdía entre lo que ya estaba resuelto.

import { MATERIAS, type Materia, type PerfilNino } from "@/lib/profile";
import { tituloDeTema } from "@/lib/plan/etapas";
import { colorDeMateria } from "@/lib/plan/coloresMateria";
import type { EstadoTema, TemaDominio } from "@/lib/tutor/acuerdo";

function colorEstado(estado: EstadoTema): string {
  if (estado === "superado") return "var(--sage-deep)";
  if (estado === "le_cuesta") return "var(--clay)";
  return "var(--ink-soft)";
}

function labelEstado(estado: EstadoTema): string {
  if (estado === "superado") return "Superado";
  if (estado === "le_cuesta") return "Le cuesta";
  return "En proceso";
}

// Lo que le cuesta primero: es lo que el apoderado necesita ver.
const ORDEN: Record<EstadoTema, number> = { le_cuesta: 0, en_proceso: 1, superado: 2 };

// La evidencia "dijo" ya viene formateada como `dijo "..."` (ver acuerdo.ts
// aplicarCierre): se muestra tal cual, sin reformatear ni adivinar comillas.
function fraseDelNino(t: TemaDominio): string | null {
  const dicha = [...t.evidencias].reverse().find((e) => e.tipo === "dijo");
  return dicha?.nota ?? null;
}

export function EnQueVa({ perfil }: { perfil: PerfilNino }) {
  const temas = perfil.tutoria?.temas ?? [];
  const temasDeExamen = temas.filter((t) => perfil.examen.materias.includes(t.materia));

  if (temasDeExamen.length === 0) return null;

  // top 3 a reforzar: los que más recientemente pasaron a "le_cuesta"
  const aReforzar = [...temasDeExamen]
    .filter((t) => t.estado === "le_cuesta")
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn))
    .slice(0, 3);

  const porMateria = new Map<Materia, TemaDominio[]>();
  for (const t of temasDeExamen) {
    const lista = porMateria.get(t.materia) ?? [];
    lista.push(t);
    porMateria.set(t.materia, lista);
  }

  return (
    <div className="border-t border-hair pt-3 flex flex-col gap-4 md:col-span-2">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sage-deep">
        En qué va
      </div>

      {/* Lo único accionable: va primero y con más peso que el detalle. */}
      {aReforzar.length > 0 && (
        <div className="rounded-lg border border-clay/30 bg-clay/5 p-3.5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-clay">
            Qué reforzar esta semana
          </div>
          <ul className="grid gap-1.5 sm:grid-cols-3">
            {aReforzar.map((t) => (
              <li key={`${t.materia}-${t.tema}`} className="text-[13.5px] leading-tight text-ink">
                {tituloDeTema(t.tema)}
                <span className="block text-[11.5px] text-ink-soft">
                  {MATERIAS.find((m) => m.id === t.materia)?.label ?? t.materia}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detalle por materia, en grilla. El color viene del mapa del niño y
          el nombre siempre está escrito: la paleta es desaturada y no alcanza
          a distinguir por sí sola. */}
      <div className="grid gap-4 md:grid-cols-2">
        {[...porMateria.entries()].map(([materia, lista]) => {
          const c = colorDeMateria(materia);
          return (
            <div key={materia}>
              <div
                className="mb-1.5 border-b pb-1 text-[12px] font-[620]"
                style={{ color: c.color, borderColor: c.color }}
              >
                {MATERIAS.find((m) => m.id === materia)?.label ?? materia}
              </div>
              <div className="flex flex-col gap-1.5">
                {[...lista]
                  .sort(
                    (a, b) =>
                      ORDEN[a.estado] - ORDEN[b.estado] ||
                      b.actualizadoEn.localeCompare(a.actualizadoEn)
                  )
                  .map((t) => {
                    const frase = fraseDelNino(t);
                    const ultima = t.evidencias.at(-1);
                    return (
                      <div
                        key={t.tema}
                        className="rounded-lg border border-hair/60 p-2.5"
                        style={{ background: c.fondo }}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[13px] text-ink">{tituloDeTema(t.tema)}</span>
                          <span
                            className="flex-none text-[11px] font-medium"
                            style={{ color: colorEstado(t.estado) }}
                          >
                            {labelEstado(t.estado)}
                          </span>
                        </div>
                        {ultima && (
                          <p className="mt-0.5 text-[11.5px] text-ink-soft">{ultima.nota}</p>
                        )}
                        {frase && (
                          <p className="mt-0.5 text-[11.5px] italic text-ink-soft">{frase}</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
