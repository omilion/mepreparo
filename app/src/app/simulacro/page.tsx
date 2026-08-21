"use client";

import { Suspense, useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { MINIMO_EVALUABLE_SIMULACRO, Simulacro } from "@/components/Simulacro";
import { TopBar } from "@/components/TopBar";
import { MATERIAS, type Materia } from "@/lib/profile";
import { faseDeMateria } from "@/lib/plan/etapas";
import { UMBRAL_SIMULACRO_CIERRE } from "@/lib/tutor/acuerdo";

const MATERIAS_VALIDAS = new Set(MATERIAS.map((m) => m.id));

function SimulacroContent() {
  const { pupilo, alTerminarSimulacro } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const materiaParam = searchParams.get("materia");
  const materia = (materiaParam && MATERIAS_VALIDAS.has(materiaParam as Materia) ? materiaParam : null) as Materia | null;

  // Guard: sin pupilo o sin una materia válida del examen, al mapa.
  useEffect(() => {
    if (!pupilo) {
      router.replace("/");
    } else if (!materia || !pupilo.examen.materias.includes(materia)) {
      router.replace("/mapa");
    }
  }, [pupilo, materia, router]);

  if (!pupilo || !materia) return null;

  const faseAntes = faseDeMateria(materia, pupilo.curso, pupilo.tutoria);
  const numeroCierre =
    faseAntes === "simulacro_1_pendiente"
      ? 1
      : faseAntes === "simulacro_2_pendiente"
        ? 2
        : undefined;

  const volverAlMapa = (evento?: string) => {
    const params = new URLSearchParams({ materia });
    if (evento) params.set("evento", evento);
    router.push(`/mapa?${params.toString()}`);
  };

  return (
    <main className="min-h-screen">
      <TopBar />
      <Simulacro
        materia={materia}
        curso={pupilo.curso}
        nombre={pupilo.nombre}
        acuerdo={pupilo.tutoria}
        pupiloId={pupilo.id}
        numeroCierre={numeroCierre}
        onRegistrar={(desglose) => alTerminarSimulacro(materia, desglose)}
        onContinuar={(correctos, total, cierreRegistrado) => {
          if (total < MINIMO_EVALUABLE_SIMULACRO) {
            volverAlMapa("simulacro_incompleto");
            return;
          }
          const aprobado = correctos / total >= UMBRAL_SIMULACRO_CIERRE;
          const evento =
            cierreRegistrado === 1
              ? aprobado
                ? "materia_confirmada"
                : "repaso_necesario"
              : cierreRegistrado === 2
                ? aprobado
                  ? "materia_confirmada"
                  : "ciclo_cerrado_con_refuerzo"
                : "simulacro_practica";
          volverAlMapa(evento);
        }}
        onSalir={() => volverAlMapa()}
      />
    </main>
  );
}

export default function SimulacroRuta() {
  return (
    <Suspense fallback={null}>
      <SimulacroContent />
    </Suspense>
  );
}
