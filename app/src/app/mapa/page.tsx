"use client";

import { Suspense, useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { MapaEtapas } from "@/components/MapaEtapas";
import { StepFade } from "@/components/StepFade";
import { TopBar } from "@/components/TopBar";
import { MATERIAS, type Materia } from "@/lib/profile";

const MATERIAS_VALIDAS = new Set(MATERIAS.map((m) => m.id));

function MapaContent() {
  const { pupilo, setFoco } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const materiaParam = searchParams.get("materia");
  const materiaInicial =
    materiaParam && MATERIAS_VALIDAS.has(materiaParam as Materia)
      ? (materiaParam as Materia)
      : undefined;
  const evento = searchParams.get("evento") ?? undefined;
  const temaEvento = searchParams.get("tema") ?? undefined;

  // Guard: sin pupilo, al inicio
  useEffect(() => {
    if (!pupilo) {
      router.replace("/");
    }
  }, [pupilo, router]);

  // Bloquear botón "atrás" del navegador para no salir de la app
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.pushState(null, "", window.location.href);
    const bloquear = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", bloquear);
    return () => window.removeEventListener("popstate", bloquear);
  }, []);

  if (!pupilo) return null;

  return (
    <main className="min-h-screen">
      <TopBar />
      <StepFade stepKey={`mapa-${pupilo.id}`} direction="next">
        <MapaEtapas
          perfil={pupilo}
          materiaInicial={materiaInicial}
          evento={evento}
          temaEvento={temaEvento}
          onEstudiar={(materia, tema) => {
            setFoco({ materia, tema });
            router.push("/tutor");
          }}
          onPrueba={(materia, tema) => {
            setFoco({ materia, tema });
            router.push("/prueba");
          }}
          onTutorLibre={() => {
            setFoco(null);
            router.push("/tutor");
          }}
          onSimulacro={(materia) => {
            router.push(`/simulacro?materia=${materia}`);
          }}
        />
      </StepFade>
    </main>
  );
}

export default function MapaRuta() {
  return (
    <Suspense fallback={null}>
      <MapaContent />
    </Suspense>
  );
}
