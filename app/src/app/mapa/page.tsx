"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { MapaEtapas } from "@/components/MapaEtapas";
import { StepFade } from "@/components/StepFade";
import { TopBar } from "@/components/TopBar";

export default function MapaRuta() {
  const { pupilo, setFoco } = useApp();
  const router = useRouter();

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
        />
      </StepFade>
    </main>
  );
}
