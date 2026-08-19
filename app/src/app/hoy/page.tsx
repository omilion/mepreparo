"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { QueHacerHoy } from "@/components/QueHacerHoy";
import { LogrosCelebracion } from "@/components/LogrosCelebracion";
import { TopBar } from "@/components/TopBar";

export default function HoyRuta() {
  const { pupilo, setFoco, guardarPupiloEnfocado } = useApp();
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
      <LogrosCelebracion key={pupilo.id} perfil={pupilo} curso={pupilo.curso} onGuardar={guardarPupiloEnfocado} />
      <QueHacerHoy
        perfil={pupilo}
        curso={pupilo.curso}
        onEmpezar={(materia, tema) => {
          setFoco({ materia, tema });
          router.push("/tutor");
        }}
        onVerCamino={() => router.push("/mapa")}
        onHablarConRai={() => {
          setFoco(null);
          router.push("/tutor");
        }}
        onSimulacro={(materia) => router.push(`/simulacro?materia=${materia}`)}
      />
    </main>
  );
}
