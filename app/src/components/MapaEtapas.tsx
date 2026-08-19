"use client";

import { useState } from "react";
import { MATERIAS, diasHastaExamen, type Materia, type PerfilNino } from "@/lib/profile";
import { etapasDeMateria, progresoDeMateria, faseDeMateria, temasEnRepaso, tituloDeTema, type Etapa } from "@/lib/plan/etapas";
import { indicadorExamen } from "@/lib/plan/indicador";
import { materiasDeHoy } from "@/lib/tutor/acuerdo";
import { Reveal } from "./Reveal";

// Temas cromáticos por asignatura (tonos pastel desaturados en armonía con el diseño Zen)
interface ColorTheme {
  primary: string;
  primaryDeep: string;
  bgSoft: string;
}

const TEMAS_MATERIAS: Record<Materia, ColorTheme> = {
  matematica: {
    primary: "var(--sage)",
    primaryDeep: "var(--sage-deep)",
    bgSoft: "color-mix(in srgb, var(--sage) 12%, transparent)",
  },
  lenguaje: {
    primary: "var(--clay)",
    primaryDeep: "var(--color-lenguaje-deep, var(--clay))",
    bgSoft: "color-mix(in srgb, var(--clay) 12%, transparent)",
  },
  ciencias: {
    primary: "var(--color-ciencias)",
    primaryDeep: "var(--color-ciencias-deep)",
    bgSoft: "color-mix(in srgb, var(--color-ciencias) 12%, transparent)",
  },
  historia: {
    primary: "var(--color-historia)",
    primaryDeep: "var(--color-historia-deep)",
    bgSoft: "color-mix(in srgb, var(--color-historia) 12%, transparent)",
  },
  ingles: {
    primary: "var(--color-ingles)",
    primaryDeep: "var(--color-ingles-deep)",
    bgSoft: "color-mix(in srgb, var(--color-ingles) 12%, transparent)",
  },
};

// El HOME del alumno: el camino de etapas de una materia (mapa lineal zen).
// Cada etapa = un tema del banco; su estado viene de la memoria de Rai.
// Tocar la etapa actual ofrece: estudiar con Rai o rendir la prueba.

export function MapaEtapas({
  perfil,
  onEstudiar,
  onPrueba,
  onTutorLibre,
  onSimulacro,
}: {
  perfil: PerfilNino;
  onEstudiar: (materia: Materia, tema: string) => void;
  onPrueba: (materia: Materia, tema: string) => void;
  onTutorLibre: () => void;
  onSimulacro: (materia: Materia) => void;
}) {
  // materia inicial: la que toca hoy según el horario; si no, la primera del examen
  const deHoy = perfil.tutoria ? materiasDeHoy(perfil.tutoria) : [];
  const [materia, setMateria] = useState<Materia>(deHoy[0] ?? perfil.examen.materias[0]);

  const etapas = etapasDeMateria(materia, perfil.curso, perfil.tutoria);
  const progreso = progresoDeMateria(etapas);
  const dias = diasHastaExamen(perfil.examen.fecha);
  const nombre = perfil.nombre.trim() || "tú";
  const indicador = indicadorExamen(materia, perfil.curso, perfil.tutoria, perfil.examen.fecha);
  // Camino completo (todas las etapas superadas) ya no es "listo": falta el
  // simulacro de cierre. Sin esto, el mapa seguía mostrando solo "9 de 9
  // etapas superadas" sin ninguna pista de que faltaba algo más.
  const fase = faseDeMateria(materia, perfil.curso, perfil.tutoria);
  const debiles = temasEnRepaso(materia, perfil.curso, perfil.tutoria);

  const theme = TEMAS_MATERIAS[materia] || TEMAS_MATERIAS.matematica;

  return (
    <div
      className="zen-page flex flex-col gap-7 pb-24 pt-8"
      style={{
        "--materia-primary": theme.primary,
        "--materia-primary-deep": theme.primaryDeep,
        "--materia-bg-soft": theme.bgSoft,
      } as React.CSSProperties}
    >
      <Reveal variant="lead" delay={60}>
        <header className="text-center">
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--materia-primary-deep)" }}>
            Tu camino, {nombre}
          </div>
          <h1 className="text-[26px]">
            {MATERIAS.find((m) => m.id === materia)?.label}
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-soft">
            {progreso.superadas} de {progreso.total} etapas superadas
            {dias !== null && dias >= 0 && (
              <span className="text-clay font-medium"> · examen en {dias} días</span>
            )}
          </p>
        </header>
      </Reveal>

      {/* El camino completo ya no basta por sí solo: falta el simulacro de
          cierre (mixto, cronometrado, sin ayuda de Rai) que confirma que no
          se olvidó nada. Esta franja evita que el mapa diga solo "9 de 9"
          sin explicar qué falta todavía. */}
      {fase !== "aprendiendo" && (
        <Reveal delay={120}>
          <div
            className="mx-auto max-w-[360px] rounded-xl border px-4 py-2.5 text-center text-[13px]"
            style={{ borderColor: "var(--materia-primary)", color: "var(--materia-primary-deep)" }}
          >
            {fase === "simulacro_1_pendiente" &&
              "Camino completo — falta tu simulacro de cierre para confirmarlo."}
            {fase === "repaso" &&
              `En repaso antes del segundo simulacro: ${debiles.map(tituloDeTema).join(", ")}.`}
            {fase === "simulacro_2_pendiente" && "Repaso listo — falta tu segundo simulacro."}
            {fase === "materia_lista" && "¡Materia lista! Tu simulacro de cierre lo confirmó."}
          </div>
        </Reveal>
      )}

      {/* indicador "listo para tu examen": sutil para el niño (solo la barra
          y el %, sin el texto largo — eso queda para el apoderado) */}
      {progreso.total > 0 && (
        <Reveal delay={160}>
          <div className="mx-auto w-full max-w-[280px]">
            <div className="mb-1 flex items-center justify-between text-[10.5px] uppercase tracking-wider text-ink-soft/70">
              <span>Listo para tu examen</span>
              <span>{indicador.porcentaje}%</span>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-mist">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${indicador.porcentaje}%`, backgroundColor: "var(--materia-primary)" }}
              />
            </div>
          </div>
        </Reveal>
      )}

      {/* el simulacro solo tiene sentido con ALGO de camino recorrido: si el
          niño recién empieza, tirarle 20+ preguntas cronometradas desanima */}
      {progreso.superadas > 0 && (
        <Reveal delay={220}>
          <div className="text-center">
            <button
              onClick={() => onSimulacro(materia)}
              className="rounded-full border px-4 py-2 text-[13px] font-[560] transition-colors"
              style={{ borderColor: "var(--materia-primary-deep)", color: "var(--materia-primary-deep)" }}
            >
              Rendir simulacro de {MATERIAS.find((m) => m.id === materia)?.label}
            </button>
          </div>
        </Reveal>
      )}

      {/* selector de materia (solo las del examen) */}
      {perfil.examen.materias.length > 1 && (
        <Reveal delay={200}>
          <div className="flex flex-wrap justify-center gap-2">
            {perfil.examen.materias.map((m) => (
              <button
                key={m}
                onClick={() => setMateria(m)}
                className={
                  "rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors tab-materia " +
                  (m === materia
                    ? "text-white"
                    : "border-hair text-ink-soft tab-materia-unselected")
                }
                style={
                  m === materia
                    ? {
                        borderColor: "var(--materia-primary-deep)",
                        backgroundColor: "var(--materia-primary-deep)",
                      }
                    : {}
                }
              >
                {MATERIAS.find((x) => x.id === m)?.label}
              </button>
            ))}
          </div>
        </Reveal>
      )}

      {/* el camino */}
      {etapas.length === 0 ? (
        <Reveal delay={300}>
          <p className="text-center text-[14px] text-ink-soft">
            Aún no hay etapas para esta materia. Puedes estudiar conversando con
            Rai mientras preparamos el camino.
          </p>
        </Reveal>
      ) : (
        <Reveal delay={300}>
          <ol className="relative mx-auto flex w-full max-w-[420px] flex-col md:max-w-[540px]">
            {etapas.map((e, i) => (
              <NodoEtapa
                key={e.tema}
                etapa={e}
                esUltima={i === etapas.length - 1}
                onEstudiar={() => onEstudiar(materia, e.tema)}
                onPrueba={() => onPrueba(materia, e.tema)}
              />
            ))}
          </ol>
        </Reveal>
      )}

      <Reveal delay={420}>
        <div className="text-center">
          <button
            onClick={onTutorLibre}
            className="text-[13px] underline underline-offset-4 hover:opacity-80"
            style={{ color: "var(--materia-primary-deep)" }}
          >
            o conversa libre con Rai →
          </button>
        </div>
      </Reveal>

      {/* Estilos locales para los hover y dinámicas de tabs */}
      <style jsx>{`
        .tab-materia-unselected:hover {
          border-color: var(--materia-primary) !important;
          color: var(--ink) !important;
        }
      `}</style>
    </div>
  );
}

function NodoEtapa({
  etapa,
  esUltima,
  onEstudiar,
  onPrueba,
}: {
  etapa: Etapa;
  esUltima: boolean;
  onEstudiar: () => void;
  onPrueba: () => void;
}) {
  const esActual = etapa.estado === "actual";

  return (
    <li className="relative flex gap-4 pb-2">
      {/* columna del nodo + línea vectorial */}
      <div className="flex flex-col items-center">
        <NodoCirculo etapa={etapa} />
        {!esUltima && (
          <span
            aria-hidden
            className="w-[1.5px] flex-1"
            style={{
              minHeight: 26,
              backgroundColor: etapa.estado === "superada" ? "var(--materia-primary)" : "var(--hair)",
            }}
          />
        )}
      </div>

      {/* contenido */}
      <div className={"pb-5 " + (esActual ? "" : "pt-1")}>
        <div
          className={
            "text-[16px] " +
            (etapa.estado === "superada"
              ? "text-ink-soft"
              : esActual
                ? "font-[560] text-ink"
                : "text-ink-soft")
          }
        >
          {etapa.titulo}
          {etapa.estado === "refuerzo" && (
            <span className="ml-2 text-[11px] text-clay">para reforzar</span>
          )}
        </div>

        {esActual && (
          <div className="mt-3 flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={onEstudiar}
                className="btn-estudiar rounded-full px-4 py-2 text-[13px] font-[560] text-white transition-colors"
                style={{
                  backgroundColor: "var(--materia-primary-deep)",
                }}
              >
                Estudiar con Rai
              </button>
              {/* Antes este botón aparecía SIEMPRE, sin chequear nada: se podía
                  rendir la prueba de una etapa recién empezada. Ahora usa la
                  misma regla determinista que decide si Rai ofrece el marcador
                  <<PRUEBA>> — los dos caminos ya no pueden contradecirse. */}
              {etapa.preparacion === "lista_para_prueba" && (
                <button
                  onClick={onPrueba}
                  className="btn-prueba rounded-full border border-hair px-4 py-2 text-[13px] text-ink transition-colors"
                >
                  Rendir la prueba
                </button>
              )}
            </div>
            {etapa.preparacion === "refuerzo_tras_prueba" && (
              <p className="text-[12px] text-clay">
                Repasando esto con Rai antes de volver a intentar la prueba.
              </p>
            )}
          </div>
        )}

        {/* Un tema superado NO queda bloqueado: el niño puede volver a repasarlo
            o rendir la prueba cuando quiera (antes no tenía forma de retomarlo). */}
        {etapa.estado === "superada" && (
          <div className="mt-2 flex flex-wrap gap-4">
            <button
              onClick={onEstudiar}
              className="text-[12.5px] underline underline-offset-4 transition-colors hover:text-ink"
              style={{ color: "var(--materia-primary-deep)" }}
            >
              Repasar con Rai
            </button>
            <button
              onClick={onPrueba}
              className="text-[12.5px] text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
            >
              Repetir la prueba
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .btn-estudiar:hover {
          background-color: var(--materia-primary) !important;
        }
        .btn-prueba:hover {
          border-color: var(--materia-primary) !important;
        }
      `}</style>
    </li>
  );
}

function NodoCirculo({ etapa }: { etapa: Etapa }) {
  if (etapa.estado === "superada") {
    return (
      <span
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[14px] text-white"
        style={{ backgroundColor: "var(--materia-primary)" }}
      >
        ✓
      </span>
    );
  }
  if (etapa.estado === "actual") {
    return (
      <span
        className="nodo-actual flex h-11 w-11 flex-none items-center justify-center rounded-full border-[1.5px] font-serif text-[16px]"
        style={{
          borderColor: "var(--materia-primary-deep)",
          color: "var(--materia-primary-deep)",
        }}
      >
        {etapa.numero}
        <style jsx>{`
          .nodo-actual {
            animation: respira-nodo 3.2s ease-in-out infinite;
          }
          @keyframes respira-nodo {
            0%,
            100% {
              box-shadow: 0 0 0 0 color-mix(in srgb, var(--materia-primary) 35%, transparent);
            }
            50% {
              box-shadow: 0 0 0 7px color-mix(in srgb, var(--materia-primary) 12%, transparent);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .nodo-actual {
              animation: none;
            }
          }
        `}</style>
      </span>
    );
  }
  // pendiente o refuerzo
  return (
    <span
      className={
        "flex h-9 w-9 flex-none items-center justify-center rounded-full border text-[13px] " +
        (etapa.estado === "refuerzo"
          ? "border-clay/60 text-clay"
          : "border-hair text-ink-soft")
      }
    >
      {etapa.numero}
    </span>
  );
}
