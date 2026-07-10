"use client";

import { useMemo } from "react";
import { MATERIAS, type PerfilNino } from "@/lib/profile";
import { calcularPlan, type Veredicto } from "@/lib/plan/motor";
import { Reveal } from "./Reveal";

const VEREDICTO: Record<
  Veredicto,
  { titulo: (n: string) => string; color: string; frase: string }
> = {
  holgura: {
    titulo: (n) => `${n} llega con holgura.`,
    color: "var(--sage-deep)",
    frase: "Con tu dedicación actual hay tiempo de sobra. Pueden ir con calma.",
  },
  justo: {
    titulo: (n) => `${n} llega bien, sin apuros.`,
    color: "var(--sage-deep)",
    frase: "El tiempo alcanza para cubrir todo antes del examen manteniendo el ritmo.",
  },
  apretado: {
    titulo: (n) => `${n} va apretado.`,
    color: "var(--clay)",
    frase: "El tiempo es justo. Conviene enfocarse primero en lo más débil.",
  },
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
  const maxHoras = Math.max(...plan.materias.map((m) => m.horas), 1);
  const v = VEREDICTO[plan.veredicto];

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
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Progreso General
          </div>
          <h1 className="max-w-[20ch] text-[27px] leading-[1.2]">
            {v.titulo(nombre)}
          </h1>
          <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.4] text-ink-soft">
            {v.frase}
          </p>
        </header>
      </Reveal>

      {/* Meta del día (D1) */}
      <Reveal delay={250}>
        {(() => {
          const tieneAcuerdo = !!perfil.tutoria;
          const textoObjetivo = tieneAcuerdo
            ? "Realizar una sesión de estudio con Rai"
            : "Presentarte con Rai, tu tutor personal";
          const descObjetivo = tieneAcuerdo
            ? "Repasa la materia asignada hoy por 20-25 minutos."
            : "Ten tu primera conversación con Rai para conocerse y armar tu horario de estudio.";

          return (
            <div className="rounded-zen border border-hair p-5 flex flex-col gap-3.5 bg-surface/30">
              <div className="flex justify-between items-baseline border-b border-hair pb-2">
                <h3 className="font-serif text-[18px] text-ink">Objetivo de hoy</h3>
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

      {/* resumen de tiempo */}
      <Reveal delay={480}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Metrica
              valor={`${plan.horasTotales} h`}
              unidad="para prepararse"
            />
            <Metrica
              valor={plan.diasRestantes !== null ? `${plan.diasRestantes}` : "—"}
              unidad="días al examen"
            />
            <Metrica
              valor={`${perfil.disponibilidad.horasSemana} h`}
              unidad="cada semana"
            />
          </div>
          <p className="px-1 text-center text-[12.5px] leading-[1.4] text-ink-soft">
            En total necesita unas{" "}
            <strong className="text-ink">{plan.horasTotales} horas</strong> de
            estudio para cubrir todo el contenido antes del examen.
          </p>
        </div>
      </Reveal>

      {/* aviso si va apretado */}
      {plan.veredicto === "apretado" && plan.horasSemanaSugeridas && (
        <Reveal delay={620}>
          <div className="rounded-zen border border-[color-mix(in_srgb,var(--clay)_34%,transparent)] px-5 py-4 text-[13.5px] leading-[1.5] text-ink">
            Para llegar cómodo, {nombre} debería estudiar alrededor de{" "}
            <strong className="text-clay">
              {plan.horasSemanaSugeridas} horas por semana
            </strong>{" "}
            (hoy son {perfil.disponibilidad.horasSemana}). Si no es posible,
            prioricen las materias marcadas abajo como más urgentes.
          </div>
        </Reveal>
      )}

      {/* reparto por materia */}
      <Reveal delay={720}>
        <div className="flex flex-col gap-3">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
            Dónde poner el esfuerzo
          </div>
          {plan.materias
            .slice()
            .sort((a, b) => a.prioridad - b.prioridad)
            .map((m) => {
              const label =
                MATERIAS.find((x) => x.id === m.materia)?.label ?? m.materia;
              const pct = Math.round((m.horas / maxHoras) * 100);
              const urgente = m.prioridad === 1;
              return (
                <div
                  key={m.materia}
                  className="rounded-zen border border-hair px-5 py-4"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-[16px]">{label}</span>
                    <span className="font-mono text-[13px] tabular-nums text-ink-soft">
                      {m.horas} h
                    </span>
                  </div>
                  <div className="mt-2.5 h-[6px] overflow-hidden rounded-full bg-mist">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: urgente ? "var(--clay)" : "var(--sage)",
                      }}
                    />
                  </div>
                  {urgente && (
                    <p className="mt-2 text-[12px] text-clay">
                      Empezar por aquí — es donde más se necesita.
                    </p>
                  )}
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

function Metrica({ valor, unidad }: { valor: string; unidad: string }) {
  return (
    <div className="rounded-zen border border-hair px-3 py-4 text-center">
      <div className="font-serif text-[26px] tabular-nums leading-none">
        {valor}
      </div>
      <div className="mt-1.5 text-[11px] leading-tight text-ink-soft">
        {unidad}
      </div>
    </div>
  );
}
