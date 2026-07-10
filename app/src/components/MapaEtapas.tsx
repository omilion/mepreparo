"use client";

import { useState } from "react";
import { MATERIAS, diasHastaExamen, type Materia, type PerfilNino } from "@/lib/profile";
import { etapasDeMateria, progresoDeMateria, type Etapa } from "@/lib/plan/etapas";
import { materiasDeHoy } from "@/lib/tutor/acuerdo";
import { Reveal } from "./Reveal";

// El HOME del alumno: el camino de etapas de una materia (mapa lineal zen).
// Cada etapa = un tema del banco; su estado viene de la memoria de Rai.
// Tocar la etapa actual ofrece: estudiar con Rai o rendir la prueba.

export function MapaEtapas({
  perfil,
  onEstudiar,
  onPrueba,
  onTutorLibre,
}: {
  perfil: PerfilNino;
  onEstudiar: (materia: Materia, tema: string) => void;
  onPrueba: (materia: Materia, tema: string) => void;
  onTutorLibre: () => void;
}) {
  // materia inicial: la que toca hoy según el horario; si no, la primera del examen
  const deHoy = perfil.tutoria ? materiasDeHoy(perfil.tutoria) : [];
  const [materia, setMateria] = useState<Materia>(deHoy[0] ?? perfil.examen.materias[0]);

  const etapas = etapasDeMateria(materia, perfil.curso, perfil.tutoria);
  const progreso = progresoDeMateria(etapas);
  const dias = diasHastaExamen(perfil.examen.fecha);
  const nombre = perfil.nombre.trim() || "tú";

  return (
    <div className="mx-auto flex max-w-zen flex-col gap-7 px-[22px] pb-24 pt-8">
      <Reveal variant="lead" delay={60}>
        <header className="text-center">
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Tu camino, {nombre}
          </div>
          <h1 className="text-[26px]">
            {MATERIAS.find((m) => m.id === materia)?.label}
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-soft">
            {progreso.superadas} de {progreso.total} etapas superadas
            {dias !== null && dias >= 0 && (
              <span className="text-clay"> · examen en {dias} días</span>
            )}
          </p>
        </header>
      </Reveal>

      {/* selector de materia (solo las del examen) */}
      {perfil.examen.materias.length > 1 && (
        <Reveal delay={200}>
          <div className="flex flex-wrap justify-center gap-2">
            {perfil.examen.materias.map((m) => (
              <button
                key={m}
                onClick={() => setMateria(m)}
                className={
                  "rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors " +
                  (m === materia
                    ? "border-sage-deep bg-sage-deep text-white"
                    : "border-hair text-ink-soft hover:border-sage")
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
          <ol className="relative mx-auto flex w-full max-w-[420px] flex-col">
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
            className="text-[13px] text-sage-deep underline underline-offset-4 hover:opacity-80"
          >
            o conversa libre con Rai →
          </button>
        </div>
      </Reveal>
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
            className={
              "w-[1.5px] flex-1 " +
              (etapa.estado === "superada" ? "bg-sage" : "bg-hair")
            }
            style={{ minHeight: 26 }}
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
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button
              onClick={onEstudiar}
              className="rounded-full bg-sage-deep px-4 py-2 text-[13px] font-[560] text-white transition-colors hover:bg-sage"
            >
              Estudiar con Rai
            </button>
            <button
              onClick={onPrueba}
              className="rounded-full border border-hair px-4 py-2 text-[13px] text-ink transition-colors hover:border-sage"
            >
              Rendir la prueba
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function NodoCirculo({ etapa }: { etapa: Etapa }) {
  if (etapa.estado === "superada") {
    return (
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sage text-[14px] text-white">
        ✓
      </span>
    );
  }
  if (etapa.estado === "actual") {
    return (
      <span className="nodo-actual flex h-11 w-11 flex-none items-center justify-center rounded-full border-[1.5px] border-sage-deep font-serif text-[16px] text-sage-deep">
        {etapa.numero}
        <style jsx>{`
          .nodo-actual {
            animation: respira-nodo 3.2s ease-in-out infinite;
          }
          @keyframes respira-nodo {
            0%,
            100% {
              box-shadow: 0 0 0 0 color-mix(in srgb, var(--sage) 35%, transparent);
            }
            50% {
              box-shadow: 0 0 0 7px color-mix(in srgb, var(--sage) 12%, transparent);
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
