"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { PanelHijos } from "@/components/PanelHijos";
import { TopBar } from "@/components/TopBar";

export default function PanelRuta() {
  const { cuenta, agregarHijo } = useApp();
  const router = useRouter();

  // Guard: sin cuenta, al inicio
  useEffect(() => {
    if (!cuenta) {
      router.replace("/");
    }
  }, [cuenta, router]);

  if (!cuenta) return null;

  return (
    <main className="min-h-screen">
      <TopBar />
      <PanelHijos
        cuenta={cuenta}
        // tocar una tarjeta abre la hoja del alumno, no despliega un acordeón
        onAbrirAlumno={(id) => router.push(`/estudiante/${id}`)}
        onAgregar={agregarHijo}
      />
    </main>
  );
}
