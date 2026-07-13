"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { PanelHijos } from "@/components/PanelHijos";
import { TopBar } from "@/components/TopBar";

export default function PanelRuta() {
  const { cuenta, irAPupilo, agregarHijo, guardarPupiloEnfocado } = useApp();
  const router = useRouter();

  // Guard: sin cuenta, al inicio
  useEffect(() => {
    if (!cuenta) {
      router.replace("/");
    }
  }, [cuenta, router]);

  // Bloquear botón "atrás" del navegador para no salir de la app
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.pushState(null, "", window.location.href);
    const bloquear = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", bloquear);
    return () => window.removeEventListener("popstate", bloquear);
  }, []);

  if (!cuenta) return null;

  return (
    <main className="min-h-screen">
      <TopBar />
      <PanelHijos
        cuenta={cuenta}
        onEntrar={irAPupilo}
        onAgregar={agregarHijo}
        onActualizarPupilo={guardarPupiloEnfocado}
      />
    </main>
  );
}
