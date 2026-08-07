"use client";

import { MATERIAS, diasHastaExamen, tieneDiagnostico, type Cuenta, type PerfilNino } from "@/lib/profile";
import { estadoDelAlumno, colorEstado } from "@/lib/plan/estadoAlumno";
import { Reveal } from "./Reveal";

// Panel del apoderado: la lista para ELEGIR a quién acompañar hoy.
//
// Antes cada tarjeta desplegaba el dashboard completo dentro de la grilla, y
// eran cuatro cajas idénticas donde lo único distinto era el nombre — para
// decidir a quién acompañar eso no servía. Ahora cada tarjeta responde de un
// vistazo las dos preguntas que importan (¿cuánto lleva? ¿hay algo que mirar?)
// y el detalle vive en la hoja propia de cada alumno.

export function PanelHijos({
  cuenta,
  onAbrirAlumno,
  onAgregar,
}: {
  cuenta: Cuenta;
  onAbrirAlumno: (id: string) => void;
  onAgregar: () => void;
}) {
  return (
    <div className="zen-page flex flex-col gap-[26px] pb-24 pt-10">
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
        <div className="grid gap-3 md:grid-cols-2">
          {cuenta.pupilos.map((p) => (
            <TarjetaPupilo key={p.id} p={p} onAbrir={() => onAbrirAlumno(p.id)} />
          ))}

          <button
            type="button"
            onClick={onAgregar}
            className="rounded-zen border border-dashed border-hair px-5 py-4 text-[14px] text-sage-deep transition-colors hover:border-sage"
          >
            {cuenta.pupilos.length === 0
              ? "+ Agregar un estudiante"
              : "+ Agregar otro estudiante"}
          </button>
        </div>
      </Reveal>
    </div>
  );
}

function TarjetaPupilo({ p, onAbrir }: { p: PerfilNino; onAbrir: () => void }) {
  const dias = diasHastaExamen(p.examen.fecha);
  const materias = p.examen.materias
    .map((id) => MATERIAS.find((m) => m.id === id)?.label ?? id)
    .join(" · ");
  const diagnosticado = tieneDiagnostico(p);
  const est = estadoDelAlumno(p);

  // Dónde está en su recorrido. Es distinto del estado de ritmo: uno dice qué
  // le falta para partir, el otro cómo va una vez andando.
  const etapa = !p.examen.materias.length
    ? "Configuración pendiente"
    : !diagnosticado
      ? "Listo para el diagnóstico"
      : null;

  const ultima = p.tutoria?.sesiones?.at(-1);

  return (
    <button
      type="button"
      onClick={onAbrir}
      className="flex w-full flex-col gap-2.5 rounded-zen border border-hair px-5 py-[18px] text-left transition-colors hover:border-sage/50"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-[19px]">{p.nombre.trim() || "Sin nombre"}</h2>
        {dias !== null && dias >= 0 && (
          <span className="flex-none text-[12px] text-clay">examen en {dias} días</span>
        )}
      </div>

      <div className="truncate text-[12.5px] text-ink-soft">
        {materias || "Sin materias aún"}
      </div>

      {/* Avance y estado: lo que el apoderado necesita para decidir. El estado
          SIEMPRE dice algo — cuando no hay nada que reportar dice "ritmo
          normal", porque el silencio se lee como que algo falta. El color va
          siempre con su texto, nunca solo. */}
      {diagnosticado ? (
        <>
          <div className="flex items-center gap-2.5">
            <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-mist">
              <div
                className="h-full rounded-full bg-sage-deep"
                style={{ width: `${est.avance}%` }}
              />
            </div>
            <span className="flex-none font-serif text-[15px] font-bold tabular-nums text-ink">
              {est.avance}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-1.5 w-1.5 flex-none rounded-full"
              style={{ background: colorEstado(est.nivel) }}
            />
            <span className="text-[12px] font-medium" style={{ color: colorEstado(est.nivel) }}>
              {est.titulo}
            </span>
          </div>
        </>
      ) : (
        <span className="text-[12.5px] text-sage-deep">{etapa}</span>
      )}

      {ultima && (
        <div className="truncate text-[11.5px] italic text-ink-soft">
          Último tema: {ultima.titulo}
        </div>
      )}
    </button>
  );
}
