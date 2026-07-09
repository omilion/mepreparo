"use client";

import { useState } from "react";
import {
  MATERIAS,
  diasHastaExamen,
  tieneDiagnostico,
  type Cuenta,
  type PerfilNino,
} from "@/lib/profile";
import { DIAS } from "@/lib/tutor/acuerdo";
import { Reveal } from "./Reveal";

// Panel del apoderado (admin): ve a sus hijos ya configurados y elige a cuál
// entrar, o agrega otro. El onboarding solo ocurre la primera vez.

export function PanelHijos({
  cuenta,
  onEntrar,
  onAgregar,
}: {
  cuenta: Cuenta;
  onEntrar: (indice: number) => void;
  onAgregar: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-zen flex-col gap-[26px] px-[22px] pb-24 pt-10">
      <Reveal variant="lead" delay={80}>
        <header>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Tu cuenta
          </div>
          <h1 className="text-[28px]">Tus estudiantes</h1>
          <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.4] text-ink-soft">
            Elige a quién acompañar hoy. Puedes ver su avance o continuar donde
            quedó.
          </p>
        </header>
      </Reveal>

      <Reveal delay={480}>
        <div className="flex flex-col gap-3">
          {cuenta.pupilos.map((p, i) => (
            <TarjetaPupilo key={p.id} p={p} onEntrar={() => onEntrar(i)} />
          ))}

          <button
            type="button"
            onClick={onAgregar}
            className="rounded-zen border border-dashed border-hair px-5 py-4 text-[14px] text-sage-deep transition-colors hover:border-sage"
          >
            + Agregar otro estudiante
          </button>
        </div>
      </Reveal>
    </div>
  );
}

function TarjetaPupilo({
  p,
  onEntrar,
}: {
  p: PerfilNino;
  onEntrar: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const dias = diasHastaExamen(p.examen.fecha);
  const materias = p.examen.materias
    .map((id) => MATERIAS.find((m) => m.id === id)?.label ?? id)
    .join(" · ");
  const diagnosticado = tieneDiagnostico(p);

  // horario acordado con Rai (si el niño ya lo definió en el tutor) — para el padre
  const horario = p.tutoria?.horario;
  const filasHorario = horario
    ? DIAS.filter((d) => (horario[d.id]?.length ?? 0) > 0).map((d) => ({
        dia: d.corto,
        ramos: horario[d.id]!
          .map((m) => MATERIAS.find((x) => x.id === m)?.label ?? m)
          .join(", "),
      }))
    : [];

  // etiqueta de estado según dónde está en su recorrido
  const estado = !p.examen.materias.length
    ? "Configuración pendiente"
    : !diagnosticado
      ? "Listo para el diagnóstico"
      : "En preparación";

  return (
    <div
      className="flex flex-col gap-3 rounded-zen border border-hair px-5 py-[18px] text-left transition-all duration-300 hover:border-sage/50"
    >
      <div
        onClick={() => setExpandido(!expandido)}
        className="flex cursor-pointer flex-col gap-1 w-full select-none"
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-[19px]">{p.nombre.trim() || "Sin nombre"}</h2>
          <div className="flex items-center gap-2">
            {dias !== null && dias >= 0 && (
              <span className="text-[12px] text-clay">examen en {dias} días</span>
            )}
            <span className="text-[11px] text-ink-soft">{expandido ? "▲" : "▼"}</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[12.5px] text-ink-soft">
          <span className="truncate">{materias || "Sin materias aún"}</span>
          <span className="ml-3 flex-none text-sage-deep">{estado}</span>
        </div>
      </div>

      {!expandido && p.tutoria?.sesiones && p.tutoria.sesiones.length > 0 && (
        <div className="text-[11.5px] text-ink-soft italic truncate">
          Último tema: {p.tutoria.sesiones.at(-1)!.titulo}
        </div>
      )}

      {expandido && (
        <div className="mt-2 border-t border-hair pt-4 flex flex-col gap-4">
          {/* Horario */}
          {filasHorario.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sage-deep">
                Horario acordado con Rai
              </div>
              <div className="flex flex-col gap-0.5 text-[12px] text-ink-soft">
                {filasHorario.map((f) => (
                  <div key={f.dia} className="flex gap-2">
                    <span className="w-8 flex-none font-medium text-ink">{f.dia}</span>
                    <span>{f.ramos}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Última sesión */}
          {p.tutoria?.sesiones && p.tutoria.sesiones.length > 0 ? (
            <div className="border-t border-hair pt-3">
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sage-deep">
                Última Sesión de Estudio
              </div>
              {(() => {
                const ultima = p.tutoria.sesiones.at(-1)!;
                const materiaLabel = MATERIAS.find(m => m.id === ultima.materia)?.label ?? ultima.materia;
                return (
                  <div className="text-[13px] text-ink-soft leading-[1.4]">
                    <div className="font-semibold text-ink">
                      {ultima.titulo} ({materiaLabel})
                    </div>
                    <div className="mt-0.5">{ultima.resumen}</div>
                    <div className="mt-1 text-[11.5px] text-ink-soft/80">
                      {new Date(ultima.fecha).toLocaleDateString("es-CL", { day: 'numeric', month: 'short' })} · Duración: {ultima.duracionMin} min · {ultima.nMensajes} mensajes
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : p.tutoria && (
            <div className="border-t border-hair pt-3 text-[13px] text-ink-soft">
              Aún no se han registrado sesiones de estudio. ¡Comienza a estudiar para registrar tu progreso!
            </div>
          )}

          {/* Gráfico de Progreso Pedagógico (D2) */}
          {p.tutoria?.sesiones && p.tutoria.sesiones.length > 0 && (
            <div className="border-t border-hair pt-3">
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sage-deep">
                Progreso de Estudio (Minutos por Sesión)
              </div>
              <div className="h-[95px] w-full rounded-lg bg-sage/5 border border-hair/50 p-2 flex items-center justify-center">
                {(() => {
                  const ses = p.tutoria.sesiones.slice(-7); // Últimas 7 sesiones
                  const maxDur = Math.max(...ses.map(s => s.duracionMin), 15);
                  const padding = 15;
                  const width = 280;
                  const height = 65;
                  const pts = ses.map((s, idx) => {
                    const x = padding + (idx * (width - padding * 2)) / (ses.length - 1 || 1);
                    const y = height - padding - (s.duracionMin * (height - padding * 2 - 10)) / maxDur - 5;
                    return { x, y, dur: s.duracionMin, fecha: new Date(s.fecha).toLocaleDateString("es-CL", { day: 'numeric', month: 'short' }) };
                  });
                  const pathData = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                  
                  return (
                    <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
                      {/* Línea base */}
                      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--hair)" strokeWidth="1" strokeDasharray="3 3" />
                      
                      {/* Curva de minutos */}
                      {pts.length > 1 && (
                        <path d={pathData} fill="none" stroke="var(--sage-deep)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      )}
                      
                      {/* Puntos y etiquetas */}
                      {pts.map((pt, idx) => (
                        <g key={idx}>
                          <circle cx={pt.x} cy={pt.y} r="3.5" fill="var(--paper)" stroke="var(--sage-deep)" strokeWidth="2" />
                          <text x={pt.x} y={pt.y - 7} textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="var(--ink)" className="font-mono">
                            {pt.dur}m
                          </text>
                          <text x={pt.x} y={height - 2} textAnchor="middle" fontSize="7" fill="var(--ink-soft)" className="font-mono">
                            {pt.fecha}
                          </text>
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Historial de sesiones */}
          {p.tutoria?.sesiones && p.tutoria.sesiones.length > 1 && (
            <div className="border-t border-hair pt-3">
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sage-deep">
                Historial de Sesiones
              </div>
              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                {p.tutoria.sesiones.slice(0, -1).reverse().map((s, idx) => {
                  const sMateria = MATERIAS.find(m => m.id === s.materia)?.label ?? s.materia;
                  return (
                    <div key={idx} className="flex justify-between items-center text-[12px] border-b border-hair/50 pb-1.5 last:border-0">
                      <div>
                        <div className="font-medium text-ink">{s.titulo}</div>
                        <div className="text-ink-soft text-[11px]">{sMateria} · {new Date(s.fecha).toLocaleDateString("es-CL")}</div>
                      </div>
                      <div className="text-right text-[11.5px] text-ink-soft flex-none">
                        {s.duracionMin} min
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notas de Rai sobre el niño */}
          {p.tutoria?.notasNino && (
            <div className="border-t border-hair pt-3">
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sage-deep">
                Notas pedagógicas de Rai
              </div>
              <p className="text-[12.5px] italic text-ink-soft leading-[1.35]">
                "{p.tutoria.notasNino}"
              </p>
            </div>
          )}

          {/* Botón de acción */}
          <button
            type="button"
            onClick={onEntrar}
            className="cta mt-2 w-full text-center"
          >
            {diagnosticado ? "Ir al plan y estudiar con Rai →" : "Comenzar diagnóstico adaptativo →"}
          </button>
        </div>
      )}
    </div>
  );
}
