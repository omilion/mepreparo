"use client";

import { useEffect, useState } from "react";
import { MATERIAS, type Materia, type PerfilNino } from "@/lib/profile";
import type { ResultadoMateria } from "@/lib/diagnostico/tipos";
import {
  leerDiagnosticoEnCurso,
  guardarDiagnosticoEnCurso,
  borrarDiagnosticoEnCurso,
} from "@/lib/storage";
import { DiagnosticoMateria } from "./DiagnosticoMateria";
import { CelebracionMateria } from "./CelebracionMateria";
import { Reveal } from "./Reveal";

// Menú del diagnóstico: muestra al niño las asignaturas a evaluar. Puede entrar
// a una, completarla (queda "superada") y continuar con la siguiente, en el
// orden que quiera. Al terminar todas, entrega los resultados.

export function Diagnostico({
  perfil,
  onListo,
}: {
  perfil: PerfilNino;
  onListo: (resultados: ResultadoMateria[]) => void;
}) {
  const nombre = perfil.nombre.trim() || "tu hijo";
  const materias = perfil.examen.materias;

  // Resultados acumulados por materia. Se persisten a medida que el niño las
  // rinde: antes vivían solo en memoria y completar 3 de 5 y recargar (o que se
  // cierre la pestaña) obligaba a repetirlas todas. Son pruebas largas y quien
  // las da es un niño de básica en una tablet.
  const [hechas, setHechas] = useState<Record<string, ResultadoMateria>>({});
  // materia actualmente en curso (null = estamos en el menú)
  const [enCurso, setEnCurso] = useState<Materia | null>(null);
  // materia recién completada que estamos celebrando (null = no celebrando)
  const [celebrando, setCelebrando] = useState<Materia | null>(null);

  // Recupera lo ya rendido por ESTE niño (va en un efecto, no en el useState
  // inicial: en el servidor no hay localStorage y no calzaría al hidratar).
  useEffect(() => {
    const guardado = leerDiagnosticoEnCurso(perfil.id);
    if (guardado) setHechas(guardado);
  }, [perfil.id]);

  const completas = materias.filter((m) => hechas[m]).length;
  const todasListas = completas === materias.length;

  function alTerminarMateria(r: ResultadoMateria) {
    setHechas((h) => {
      const actualizadas = { ...h, [r.materia]: r };
      guardarDiagnosticoEnCurso(perfil.id, actualizadas);
      return actualizadas;
    });
    setEnCurso(null);
    setCelebrando(r.materia); // mostrar felicitación
  }

  function verResultados() {
    // el diagnóstico queda guardado en el perfil: el borrador ya no hace falta
    borrarDiagnosticoEnCurso();
    onListo(materias.map((m) => hechas[m]).filter(Boolean));
  }

  if (enCurso) {
    return (
      <DiagnosticoMateria
        key={enCurso}
        materia={enCurso}
        curso={perfil.curso}
        nombre={nombre}
        onListo={alTerminarMateria}
      />
    );
  }

  if (celebrando) {
    const quedan = materias.filter((m) => !hechas[m]).length;
    return (
      <CelebracionMateria
        key={celebrando}
        materia={celebrando}
        nombre={nombre}
        quedan={quedan}
        onContinuar={() => {
          const eranTodas = quedan === 0;
          setCelebrando(null);
          if (eranTodas) verResultados();
        }}
      />
    );
  }

  return (
    <div className="zen-page flex min-h-[calc(100vh-58px)] flex-col items-center justify-center gap-[26px] pb-24 pt-6 text-center">
      <Reveal variant="lead" delay={80}>
        <header>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Diagnóstico de {nombre}
          </div>
          <h1 className="max-w-[20ch] text-[26px] leading-[1.25]">
            {todasListas
              ? "¡Listo! Completaste todas."
              : "Vamos a conocer tu nivel."}
          </h1>
          <p className="mt-3 max-w-[38ch] text-[15px] leading-[1.4] text-ink-soft">
            {todasListas
              ? "Ya podemos ver tus resultados y preparar tu plan."
              : "Estas son las asignaturas a evaluar. Entra a una cuando quieras; puedes hacerlas en el orden que prefieras."}
          </p>
        </header>
      </Reveal>

      <Reveal delay={560}>
        <div className="flex w-[320px] max-w-full flex-col gap-2.5 md:w-[440px]">
          {materias.map((m) => {
            const label = MATERIAS.find((x) => x.id === m)?.label ?? m;
            const superada = !!hechas[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => !superada && setEnCurso(m)}
                disabled={superada}
                className={
                  "flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-[15px] transition-colors " +
                  (superada
                    ? "border-sage/40 text-ink-soft"
                    : "border-hair text-ink hover:border-sage")
                }
              >
                <span>{label}</span>
                {superada ? (
                  <span className="flex items-center gap-1.5 text-[12.5px] text-sage-deep">
                    <Check /> Superada
                  </span>
                ) : (
                  <span className="text-ink-soft">→</span>
                )}
              </button>
            );
          })}
        </div>
      </Reveal>

      <Reveal delay={760}>
        <div className="flex w-[300px] max-w-full flex-col items-center gap-3 md:w-[380px]">
          <p className="text-[12.5px] tabular-nums text-ink-soft">
            {completas} de {materias.length} completadas
          </p>
          <button
            type="button"
            onClick={verResultados}
            disabled={!todasListas}
            className="cta w-[280px] max-w-full disabled:cursor-not-allowed disabled:opacity-40 md:w-[360px]"
          >
            Ver mis resultados
          </button>
        </div>
      </Reveal>
    </div>
  );
}

function Check() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12.5 10 17l9-10" />
    </svg>
  );
}
