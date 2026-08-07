"use client";

// EL DASHBOARD DE UN ALUMNO — su propia hoja, no un acordeón.
//
// Vivía desplegándose dentro de la tarjeta del panel, y ahí siempre iba a
// pelear con el espacio: una grilla de tarjetas no es lugar para gráficos,
// plan de horas y veinte temas. Con hoja propia el detalle respira y el panel
// vuelve a ser lo que debe ser — una lista para elegir a quién acompañar.

import { useState } from "react";
import {
  MATERIAS,
  diasHastaExamen,
  tieneDiagnostico,
  type PerfilNino,
} from "@/lib/profile";
import { DIAS } from "@/lib/tutor/acuerdo";
import { calcularPlan } from "@/lib/plan/motor";
import { indicadorExamen } from "@/lib/plan/indicador";
import { colorDeMateria } from "@/lib/plan/coloresMateria";
import { estadoDelAlumno, colorEstado as colorDelEstado } from "@/lib/plan/estadoAlumno";
import { EnQueVa } from "./EnQueVa";
import { ModalAccesoAlumno } from "./ModalAccesoAlumno";
import { Reveal } from "./Reveal";

export function DashboardAlumno({
  p,
  onEntrar,
  onVolver,
  onActualizarPupilo,
}: {
  p: PerfilNino;
  onEntrar: () => void;
  onVolver: () => void;
  onActualizarPupilo?: (perfil: PerfilNino) => void;
}) {
  const [mostrarAcceso, setMostrarAcceso] = useState(false);
  const onAbrirAcceso = () => setMostrarAcceso(true);

  const dias = diasHastaExamen(p.examen.fecha);
  const materias = p.examen.materias
    .map((id) => MATERIAS.find((m) => m.id === id)?.label ?? id)
    .join(" · ");
  const diagnosticado = tieneDiagnostico(p);
  const plan = calcularPlan(p);
  const maxHoras = Math.max(...plan.materias.map((m) => m.horas), 1);
  const est = estadoDelAlumno(p);

  const horario = p.tutoria?.horario;
  const filasHorario = horario
    ? DIAS.filter((d) => (horario[d.id]?.length ?? 0) > 0).map((d) => ({
        dia: d.corto,
        ramos: horario[d.id]!
          .map((m) => MATERIAS.find((x) => x.id === m)?.label ?? m)
          .join(", "),
      }))
    : [];

  return (
    <div className="zen-page flex flex-col gap-5 pb-24 pt-8">
      <Reveal variant="lead" delay={60}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={onVolver}
              className="mb-2 text-[12.5px] text-sage-deep underline underline-offset-4 hover:opacity-85"
            >
              ← Tus estudiantes
            </button>
            <h1 className="font-serif text-[28px] leading-tight">
              {p.nombre.trim() || "Sin nombre"}
            </h1>
            <p className="mt-1 text-[13px] text-ink-soft">{materias || "Sin materias aún"}</p>
          </div>
          <div className="text-right">
            <div className="font-serif text-[30px] font-bold leading-none tabular-nums text-ink">
              {est.avance}%
            </div>
            <div className="text-[11px] text-ink-soft">preparado</div>
            <div
              className="mt-1.5 text-[12px] font-medium"
              style={{ color: colorDelEstado(est.nivel) }}
            >
              {est.titulo}
            </div>
          </div>
        </header>
      </Reveal>

      {/* En pantalla ancha el detalle va en dos columnas; los bloques densos
          (plan, "en qué va") se marcan md:col-span-2 para conservar su ancho. */}
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        {/* Los números que un apoderado quiere primero ("¿llega o no llega?"),
            que antes estaban enterrados al final, después de veinte temas. */}
        {diagnosticado && (
          <div className="grid grid-cols-3 gap-2 text-center md:col-span-2">
            <div className="rounded-lg border border-hair/60 p-2.5">
              <div className="font-serif text-[20px] font-bold leading-none tabular-nums text-ink">
                {dias !== null ? dias : "—"}
              </div>
              <div className="mt-1 text-[10.5px] leading-tight text-ink-soft">días al examen</div>
            </div>
            <div className="rounded-lg border border-hair/60 p-2.5">
              <div
                className="font-serif text-[15px] font-bold leading-tight"
                style={{
                  color: plan.veredicto === "apretado" ? "var(--clay)" : "var(--sage-deep)",
                }}
              >
                {plan.veredicto === "holgura"
                  ? "Con holgura"
                  : plan.veredicto === "justo"
                    ? "Justo"
                    : "Apretado"}
              </div>
              <div className="mt-1 text-[10.5px] leading-tight text-ink-soft">va el plan</div>
            </div>
            <div className="rounded-lg border border-hair/60 p-2.5">
              <div className="font-serif text-[20px] font-bold leading-none tabular-nums text-ink">
                {p.disponibilidad.horasSemana} h
              </div>
              <div className="mt-1 text-[10.5px] leading-tight text-ink-soft">por semana</div>
            </div>
          </div>
        )}
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
        {/* Listo para el examen. En una sola columna angosta dejaba media
            pantalla vacía en tablet: ahora es grilla. El color es el de la
            materia (el mismo del mapa del niño) y el NOMBRE siempre está
            visible — la paleta es desaturada a propósito y no distingue por
            sí sola (matemática y lenguaje son casi idénticas en protanopia). */}
        {diagnosticado && (
          <div className="border-t border-hair pt-3 md:col-span-2">
            <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sage-deep">
              Listo para el examen
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {p.examen.materias.map((m) => {
                const ind = indicadorExamen(m, p.curso, p.tutoria, p.examen.fecha);
                const materiaLabel = MATERIAS.find((x) => x.id === m)?.label ?? m;
                const c = colorDeMateria(m);
                return (
                  <div
                    key={m}
                    className="rounded-lg border border-hair/60 p-3"
                    style={{ background: c.fondo }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="text-[13px] font-[620] leading-tight"
                        style={{ color: c.color }}
                      >
                        {materiaLabel}
                      </span>
                      <span className="font-serif text-[19px] font-bold tabular-nums text-ink">
                        {ind.porcentaje}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full bg-mist">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${ind.porcentaje}%`, background: c.color }}
                      />
                    </div>
                    <p className="mt-1.5 text-[12px] leading-[1.4] text-ink-soft">{ind.texto}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <EnQueVa perfil={p} />

        {/* Plan de estudio sugerido (Apoderado) */}
        {diagnosticado && (
          <div className="border-t border-hair pt-3 flex flex-col gap-3 md:col-span-2">
            <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sage-deep">
              Plan de estudio sugerido (Apoderado)
            </div>
            
            {/* El veredicto y los días ya están arriba, en la fila de
                números: acá solo va el reparto de horas, que es el detalle. */}
            <div className="rounded-zen border border-hair p-4 bg-surface/50 flex flex-col gap-3">
              <div className="flex flex-col gap-2.5">
                <div className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-soft">
                  Distribución de horas sugerida
                </div>
                {plan.materias
                  .slice()
                  .sort((a, b) => a.prioridad - b.prioridad)
                  .map((m) => {
                    const label = MATERIAS.find((x) => x.id === m.materia)?.label ?? m.materia;
                    const pct = Math.round((m.horas / maxHoras) * 100);
                    const urgente = m.prioridad === 1;
                    // La barra lleva el color de LA MATERIA (igual que en el
                    // resto del panel y en el mapa del niño). La urgencia se
                    // dice con una palabra, no con color: antes se pintaba de
                    // terracota, que es justamente el color de Lenguaje — un
                    // "Matemática urgente" y "Lenguaje" salían idénticos.
                    const cm = colorDeMateria(m.materia);
                    return (
                      <div key={m.materia} className="text-[12.5px]">
                        <div className="flex justify-between items-baseline gap-2 text-[12px] text-ink">
                          <span className="font-medium" style={{ color: cm.color }}>
                            {label}
                            {urgente && (
                              <span className="ml-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-clay">
                                prioridad
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-ink-soft tabular-nums">{m.horas} h sugeridas</span>
                        </div>
                        <div className="mt-1 h-[4px] overflow-hidden rounded-full bg-mist">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: cm.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {plan.veredicto === "apretado" && plan.horasSemanaSugeridas && (
                <p className="text-[11.5px] text-clay leading-[1.4] mt-1 border-t border-hair/30 pt-2">
                  ⚠️ {p.nombre} debería estudiar alrededor de <strong>{plan.horasSemanaSugeridas} horas por semana</strong> (hoy tiene {p.disponibilidad.horasSemana} h) para llegar con mayor holgura.
                </p>
              )}
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
        <div className="flex flex-col sm:flex-row gap-2 mt-2 md:col-span-2">
          <button
            type="button"
            onClick={onEntrar}
            className="cta flex-1 text-center"
          >
            {diagnosticado ? "Ir al plan y estudiar con Rai →" : "Comenzar diagnóstico adaptativo →"}
          </button>
          <button
            type="button"
            onClick={onAbrirAcceso}
            className="rounded-zen border border-sage-deep/30 px-4 py-2.5 text-[13px] text-sage-deep hover:bg-sage-deep/5 transition-colors font-medium text-center flex items-center justify-center gap-1.5"
            title="Dar acceso al estudiante en su propia tablet o celular"
          >
            <span>Acceso Tablet (QR)</span>
          </button>
        </div>
      </div>
      {mostrarAcceso && (
        <ModalAccesoAlumno
          pupilo={p}
          onClose={() => setMostrarAcceso(false)}
          onActualizarPupilo={onActualizarPupilo}
        />
      )}
    </div>
  );
}
