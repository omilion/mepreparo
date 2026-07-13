"use client";

import { useMemo } from "react";
import { MATERIAS, type PerfilNino } from "@/lib/profile";
import { calcularPlan } from "@/lib/plan/motor";
import { Reveal } from "./Reveal";
import { etapasDeMateria, progresoDeMateria } from "@/lib/plan/etapas";

const COLOR_MATERIA: Record<string, string> = {
  matematica: "var(--sage)",
  lenguaje: "var(--clay)",
  ciencias: "var(--color-ciencias)",
  historia: "var(--color-historia)",
  ingles: "var(--color-ingles)",
};

// Calcula la racha de días de estudio consecutivos basándose en el historial de sesiones
function calcularRacha(sesiones: any[]): number {
  if (!sesiones || sesiones.length === 0) return 0;
  
  const fechasUnicas = sesiones
    .map((s) => new Date(s.fecha).toDateString())
    .filter((v, i, self) => self.indexOf(v) === i); // fechas únicas
  
  const sorted = fechasUnicas.map(f => new Date(f)).sort((a, b) => b.getTime() - a.getTime());
  
  let racha = 0;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const ultimaSesion = sorted[0];
  if (!ultimaSesion) return 0;
  
  const diffTime = Math.abs(hoy.getTime() - ultimaSesion.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 1) return 0; // racha rota
  
  let checkDate = diffDays === 1 ? ultimaSesion : hoy;
  
  for (const f of sorted) {
    const diff = Math.abs(checkDate.getTime() - f.getTime());
    const diffD = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (diffD <= 1) {
      racha++;
      checkDate = f;
    } else {
      break;
    }
  }
  return racha;
}

export function PlanEstudio({
  perfil,
  onVolver,
  onTutor,
}: {
  perfil: PerfilNino;
  onVolver: () => void;
  onTutor: () => void;
}) {
  const nombre = perfil.nombre.trim() || "Tu hijo";
  const plan = useMemo(() => calcularPlan(perfil), [perfil]);

  // Gamificación y Objetivos de Hoy (D1)
  const sesiones = perfil.tutoria?.sesiones || [];
  const racha = useMemo(() => calcularRacha(sesiones), [sesiones]);
  
  const yaEstudioHoy = useMemo(() => {
    const hoyStr = new Date().toDateString();
    return sesiones.some(s => new Date(s.fecha).toDateString() === hoyStr);
  }, [sesiones]);

  const diaHoyLabel = new Date().toLocaleDateString("es-CL", { weekday: "long" });
  const materiasHoy = perfil.tutoria ? materiasDeHoy(perfil.tutoria) : [];
  const materiaHoyLabel = materiasHoy.length > 0 
    ? materiasHoy.map(m => MATERIAS.find(x => x.id === m)?.label || m).join(" y ")
    : "Repaso General";

  return (
    <div className="mx-auto flex max-w-zen flex-col gap-[26px] px-[22px] pb-24 pt-10">
      {/* Racha y Saludo de Alumno (D1) */}
      <Reveal variant="lead" delay={80}>
        <div className="flex items-center justify-between rounded-xl bg-sage/5 border border-hair p-4 mb-2">
          <div className="flex flex-col gap-1 text-left">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-sage-deep">
              ¡Hola, {nombre}! 👋
            </span>
            <span className="text-[13.5px] text-ink-soft">
              Hoy es {diaHoyLabel}. Toca estudiar: <strong className="text-ink font-medium">{materiaHoyLabel}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-paper rounded-full border border-hair px-3 py-1 text-[13px] font-semibold shadow-sm select-none">
            <span className="text-[15px]" aria-hidden>🔥</span>
            <span className="font-mono text-ink leading-none">{racha} {racha === 1 ? "día" : "días"}</span>
          </div>
        </div>
      </Reveal>

      <Reveal variant="lead" delay={120}>
        <header>
          <h1 className="max-w-[20ch] text-[27px] leading-[1.2] font-serif text-left">
            ¡Hola, {nombre}! Qué alegría verte hoy. ¿Listo/a para aprender? 😊
          </h1>
        </header>
      </Reveal>

      {/* Misión de hoy */}
      <Reveal delay={250}>
        {(() => {
          const tieneAcuerdo = !!perfil.tutoria;
          const textoObjetivo = tieneAcuerdo
            ? "Realizar una sesión de estudio con Rai"
            : "Presentarte con Rai, tu tutor personal";
          const descObjetivo = tieneAcuerdo
            ? "Repasa por 20-25 minutos"
            : "Para conocerse y armar tu horario";

          return (
            <div className="rounded-zen border border-hair p-5 flex flex-col gap-3.5 bg-surface/30">
              <div className="flex justify-between items-baseline border-b border-hair pb-2">
                <h3 className="font-serif text-[18px] text-ink">Misión de hoy</h3>
                <span className="text-[12px] text-ink-soft font-semibold uppercase tracking-wider">
                  {yaEstudioHoy ? "¡Completado! 🎉" : "Pendiente"}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={yaEstudioHoy} 
                  readOnly 
                  className="mt-0.5 h-4.5 w-4.5 rounded border-hair text-sage-deep focus:ring-sage"
                />
                <div className="flex flex-col text-left">
                  <span className="text-[14.5px] font-medium text-ink">{textoObjetivo}</span>
                  <span className="text-[12.5px] text-ink-soft">{descObjetivo}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </Reveal>

      {/* El Mensaje de Rai */}
      <Reveal delay={350}>
        {(() => {
          const tieneSesiones = sesiones.length > 0;
          const ultimoTema = tieneSesiones
            ? (sesiones.at(-1)?.titulo || MATERIAS.find(x => x.id === sesiones.at(-1)?.materia)?.label || sesiones.at(-1)?.materia)
            : "";
          const mensajeRai = tieneSesiones
            ? `¡Hola! Ayer hiciste un trabajo increíble en ${ultimoTema}. ¡Sigamos sumando pasos hoy! 🌟`
            : "¡Hola! Estoy muy entusiasmado de conocerte hoy y empezar a aprender juntos. 🚀";

          return (
            <div className="relative rounded-zen border border-amber-200/50 dark:border-amber-900/30 p-6 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 shadow-sm overflow-hidden text-left">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-white/40 dark:bg-black/20 -rotate-2 border-b border-hair/20" />
              <div className="flex items-start gap-3 mt-1">
                <span className="text-[20px]" aria-hidden>🤖</span>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-[11px] uppercase tracking-wider text-amber-800/80 dark:text-amber-300/80">
                    Mensaje de Rai
                  </span>
                  <p className="font-serif italic text-[15px] leading-relaxed">
                    "{mensajeRai}"
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </Reveal>

      {/* Reparto por materia (Etapas) */}
      <Reveal delay={450}>
        <div className="flex flex-col gap-3 text-left">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
            Tus materias y etapas
          </div>
          {plan.materias
            .slice()
            .sort((a, b) => a.prioridad - b.prioridad)
            .map((m) => {
              const label = MATERIAS.find((x) => x.id === m.materia)?.label ?? m.materia;
              const etapas = etapasDeMateria(m.materia, perfil.curso, perfil.tutoria);
              const progreso = progresoDeMateria(etapas);
              const pct = progreso.total > 0 ? Math.round((progreso.superadas / progreso.total) * 100) : 0;
              const colorMateria = COLOR_MATERIA[m.materia] || "var(--sage)";

              return (
                <div
                  key={m.materia}
                  className="rounded-zen border border-hair px-5 py-4 bg-surface"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-[16px] font-medium text-ink">{label}</span>
                    <span className="font-mono text-[12.5px] tabular-nums text-ink-soft">
                      {progreso.superadas} de {progreso.total} etapas superadas 🗺️
                    </span>
                  </div>
                  <div className="mt-2.5 h-[6px] overflow-hidden rounded-full bg-mist">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: colorMateria,
                      }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </Reveal>

      <Reveal delay={860}>
        <div className="flex flex-col gap-3">
          <button type="button" className="premium-glow-button animate-moving-border" onClick={onTutor}>
            Empezar a estudiar con el tutor
          </button>
          <button
            type="button"
            onClick={onVolver}
            className="text-center text-[13px] text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Volver
          </button>
        </div>

        <style jsx>{`
          .premium-glow-button {
            position: relative;
            z-index: 1;
            width: 100%;
            font-size: 17px;
            font-weight: 580;
            padding: 16px 24px;
            color: white;
            background: var(--sage-deep);
            border-radius: 14px;
            border: 1px solid transparent;
            background-clip: padding-box;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.04);
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
          }
          .premium-glow-button::before {
            content: "";
            position: absolute;
            top: 0; right: 0; bottom: 0; left: 0;
            z-index: -1;
            margin: -1.5px;
            border-radius: inherit;
            background: linear-gradient(
              90deg,
              var(--sage),
              var(--clay),
              var(--sage-deep),
              var(--sage)
            );
            background-size: 300% 300%;
            animation: move-border-kf 6s ease infinite;
          }
          .premium-glow-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(91, 138, 114, 0.15);
          }
          .premium-glow-button:active {
            transform: translateY(0.5px);
          }
          @keyframes move-border-kf {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @media (prefers-reduced-motion: reduce) {
            .premium-glow-button::before {
              animation: none;
            }
          }
        `}</style>
      </Reveal>
    </div>
  );
}

// Helpers requeridos para calcular materias de hoy
function materiasDeHoy(acuerdo: any): any[] {
  const diaMap: Record<number, string> = {
    0: "dom",
    1: "lun",
    2: "mar",
    3: "mie",
    4: "jue",
    5: "vie",
    6: "sab",
  };
  const hoyNum = new Date().getDay();
  const diaClave = diaMap[hoyNum] as any;
  return acuerdo.horario[diaClave] || [];
}


