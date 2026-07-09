"use client";

import { useState } from "react";
import {
  CURSOS,
  ESTILOS_APRENDIZAJE,
  INTERESES,
  MATERIAS,
  type Curso,
  type Materia,
  type PerfilNino,
  diasHastaExamen,
} from "@/lib/profile";
import { Chip } from "./Chip";
import { Reveal } from "./Reveal";

// Retrasos del escalonado dentro de cada paso (ms).
// La pregunta entra primero; luego hay una pausa notoria antes de las opciones.
const D_TITULO = 80; // la pregunta entra primero, fade-up lento
const D_SUB = 560; // luego el subtítulo
const D_CUERPO = 950; // pausa mayor antes de mostrar las opciones
const D_ACCION = 1150; // por último la acción

// Wizard zen de configuración de UN hijo: una pregunta por pantalla,
// auto-avance en selecciones simples, botón discreto donde se elige
// varias cosas, y flecha sutil para volver atrás.

type PasoId =
  | "intro"
  | "curso"
  | "materias"
  | "fecha"
  | "horas"
  | "intereses"
  | "estilos";

const PASOS: PasoId[] = [
  "intro",
  "curso",
  "materias",
  "fecha",
  "horas",
  "intereses",
  "estilos",
];

export function WizardHijo({
  perfilInicial,
  indice,
  total,
  onListo,
}: {
  perfilInicial: PerfilNino;
  indice: number; // 0-based, para "Hijo 2 de 3"
  total: number;
  onListo: (perfil: PerfilNino) => void;
}) {
  const [p, setP] = useState<PerfilNino>(perfilInicial);
  const [i, setI] = useState(0);

  const paso = PASOS[i];
  const nombre = p.nombre.trim() || "tu hijo";

  function avanzar() {
    if (i < PASOS.length - 1) setI(i + 1);
    else onListo(p);
  }
  function volver() {
    if (i === 0) return;
    setI(i - 1);
  }

  function toggle<T>(lista: T[], v: T): T[] {
    return lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v];
  }

  const dias = diasHastaExamen(p.examen.fecha);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-zen flex-col px-[22px] pb-20 pt-4">
      {/* barra superior del wizard: atrás + progreso */}
      <div className="flex h-10 items-center justify-between">
        {i > 0 ? (
          <button
            type="button"
            onClick={volver}
            aria-label="Volver"
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-ink"
          >
            ←
          </button>
        ) : (
          <span className="w-8" />
        )}

        <div className="flex items-center gap-1.5" aria-hidden>
          {PASOS.slice(1).map((_, idx) => (
            <span
              key={idx}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: idx + 1 === i ? "18px" : "6px",
                background:
                  idx + 1 <= i ? "var(--sage)" : "var(--mist)",
              }}
            />
          ))}
        </div>

        {total > 1 ? (
          <span className="text-[11px] tabular-nums text-ink-soft">
            {indice + 1}/{total}
          </span>
        ) : (
          <span className="w-8" />
        )}
      </div>

      {/* contenido del paso, centrado vertical y horizontalmente.
          key={paso} remonta el subárbol para reiniciar el escalonado. */}
      <div key={paso} className="flex flex-1 flex-col items-center justify-center py-8">
          {paso === "intro" && (
            <Paso>
              <Eyebrow>
                {total > 1
                  ? `Configurando a ${nombre} · ${indice + 1} de ${total}`
                  : "Preparemos la experiencia"}
              </Eyebrow>
              <Titulo>Vamos a configurar la experiencia de {nombre}.</Titulo>
              <Sub>
                Te haré unas pocas preguntas, una a la vez. Con esto el tutor de{" "}
                {nombre} será preciso y muy personal.
              </Sub>
              <Reveal delay={D_ACCION}>
                <div className="mt-8 w-[280px] max-w-full">
                  <button type="button" onClick={avanzar} className="cta">
                    Empecemos
                  </button>
                </div>
              </Reveal>
            </Paso>
          )}

          {paso === "curso" && (
            <Paso>
              <Eyebrow>Paso 1</Eyebrow>
              <Titulo>¿Qué curso rinde {nombre}?</Titulo>
              <Sub>El examen libre corresponde a este nivel.</Sub>
              <Reveal delay={D_CUERPO}>
                <div className="mt-7 flex flex-wrap justify-center gap-2.5">
                  {CURSOS.map((c) => (
                    <ChoiceBig
                      key={c.id}
                      label={c.label}
                      active={p.curso === c.id}
                      onClick={() => {
                        setP({ ...p, curso: c.id as Curso });
                        setTimeout(avanzar, 160);
                      }}
                    />
                  ))}
                </div>
              </Reveal>
            </Paso>
          )}

          {paso === "materias" && (
            <Paso>
              <Eyebrow>Paso 2</Eyebrow>
              <Titulo>¿Qué materias dará en el examen?</Titulo>
              <Sub>Elige solo las que rendirá. No tienen que ser todas.</Sub>
              <Reveal delay={D_CUERPO}>
                <div className="mt-7 flex flex-wrap justify-center gap-2.5">
                  {MATERIAS.map((m) => (
                    <Chip
                      key={m.id}
                      label={m.label}
                      pressed={p.examen.materias.includes(m.id)}
                      onToggle={() =>
                        setP({
                          ...p,
                          examen: {
                            ...p.examen,
                            materias: toggle<Materia>(p.examen.materias, m.id),
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </Reveal>
              <ContinuarSuave
                visible={p.examen.materias.length > 0}
                onClick={avanzar}
              />
            </Paso>
          )}

          {paso === "fecha" && (
            <Paso>
              <Eyebrow>Paso 3</Eyebrow>
              <Titulo>¿Cuándo es el examen?</Titulo>
              <Sub>Con esto calculamos cuántas horas necesita {nombre}.</Sub>
              <Reveal delay={D_CUERPO}>
                <div className="mt-7">
                  <input
                    type="date"
                    value={p.examen.fecha}
                    onChange={(e) =>
                      setP({
                        ...p,
                        examen: { ...p.examen, fecha: e.target.value },
                      })
                    }
                    className="input max-w-[220px] text-center text-[18px]"
                  />
                  {dias !== null && dias >= 0 && (
                    <p className="mt-3 text-[13px] text-ink-soft">
                      Faltan <strong className="text-ink">{dias}</strong> días.
                    </p>
                  )}
                </div>
              </Reveal>
              <ContinuarSuave
                visible={dias !== null && dias >= 0}
                onClick={avanzar}
              />
            </Paso>
          )}

          {paso === "horas" && (
            <Paso>
              <Eyebrow>Paso 4</Eyebrow>
              <Titulo>¿Cuántas horas puede estudiar por semana?</Titulo>
              <Sub>Sé honesto: el plan se ajusta a la vida real, no al revés.</Sub>
              <Reveal delay={D_CUERPO}>
                <div className="mt-8 flex w-[280px] max-w-full items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={15}
                    value={p.disponibilidad.horasSemana}
                    onChange={(e) =>
                      setP({
                        ...p,
                        disponibilidad: { horasSemana: Number(e.target.value) },
                      })
                    }
                    aria-label="Horas por semana"
                    className="flex-1 accent-[var(--sage)]"
                  />
                  <span className="min-w-[86px] text-right font-mono text-[15px] tabular-nums">
                    {p.disponibilidad.horasSemana} h / sem
                  </span>
                </div>
              </Reveal>
              <ContinuarSuave visible onClick={avanzar} />
            </Paso>
          )}

          {paso === "intereses" && (
            <Paso>
              <Eyebrow>Paso 5</Eyebrow>
              <Titulo>¿Qué le gusta a {nombre}?</Titulo>
              <Sub>Esto le da personalidad al tutor. Puedes saltarlo.</Sub>
              <Reveal delay={D_CUERPO}>
                <div className="mt-7 flex max-w-[380px] flex-wrap justify-center gap-2.5">
                  {INTERESES.map((it) => (
                    <Chip
                      key={it}
                      label={it}
                      pressed={p.contexto.intereses.includes(it)}
                      onToggle={() =>
                        setP({
                          ...p,
                          contexto: {
                            ...p.contexto,
                            intereses: toggle(p.contexto.intereses, it),
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </Reveal>
              <ContinuarSuave visible onClick={avanzar} etiqueta="Continuar" />
            </Paso>
          )}

          {paso === "estilos" && (
            <Paso>
              <Eyebrow>Último paso</Eyebrow>
              <Titulo>¿Cómo aprende mejor?</Titulo>
              <Sub>Con esto el tutor sabrá cómo explicarle.</Sub>
              <Reveal delay={D_CUERPO}>
                <div className="mt-7 flex max-w-[380px] flex-wrap justify-center gap-2.5">
                  {ESTILOS_APRENDIZAJE.map((es) => (
                    <Chip
                      key={es}
                      label={es}
                      pressed={p.contexto.estilos.includes(es)}
                      onToggle={() =>
                        setP({
                          ...p,
                          contexto: {
                            ...p.contexto,
                            estilos: toggle(p.contexto.estilos, es),
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </Reveal>
              <ContinuarSuave
                visible
                onClick={avanzar}
                etiqueta={`Terminar con ${nombre}`}
              />
            </Paso>
          )}
      </div>
    </div>
  );
}

/* --- piezas de presentación --- */

// Cada paso se centra vertical y horizontalmente. La pregunta (Eyebrow+Titulo)
// entra primero con fade-up lento; el resto la sigue escalonado.
function Paso({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">{children}</div>
  );
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Reveal variant="lead" delay={D_TITULO}>
      <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
        {children}
      </div>
    </Reveal>
  );
}
function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <Reveal variant="lead" delay={D_TITULO + 40}>
      <h1 className="max-w-[18ch] text-[27px] leading-[1.2]">{children}</h1>
    </Reveal>
  );
}
function Sub({ children }: { children: React.ReactNode }) {
  return (
    <Reveal delay={D_SUB}>
      <p className="mt-3 max-w-[38ch] text-[15px] leading-[1.4] text-ink-soft">
        {children}
      </p>
    </Reveal>
  );
}

// Opción grande auto-avanzable (curso)
function ChoiceBig({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-[13px] border px-4 py-3 text-[15px] transition-colors " +
        (active
          ? "border-sage/70 text-sage-deep"
          : "border-hair text-ink hover:border-sage/50")
      }
    >
      {label}
    </button>
  );
}

// Botón "Continuar" que aparece con fade cuando el paso ya tiene respuesta
function ContinuarSuave({
  visible,
  onClick,
  etiqueta = "Continuar",
}: {
  visible: boolean;
  onClick: () => void;
  etiqueta?: string;
}) {
  return (
    <div
      className="mt-9 w-[280px] max-w-full"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity .3s ease, transform .3s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <button type="button" onClick={onClick} className="cta">
        {etiqueta} →
      </button>
    </div>
  );
}
