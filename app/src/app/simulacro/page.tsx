"use client";

import { Suspense, useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { Simulacro } from "@/components/Simulacro";
import { TopBar } from "@/components/TopBar";
import { MATERIAS, type Materia } from "@/lib/profile";

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

  return (
    <main className="min-h-screen">
      <TopBar />
      <Simulacro
        materia={materia}
        curso={pupilo.curso}
        nombre={pupilo.nombre}
        acuerdo={pupilo.tutoria}
        pupiloId={pupilo.id}
        onTerminar={(desglose) => alTerminarSimulacro(materia, desglose)}
        onSalir={() => router.push("/mapa")}
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
