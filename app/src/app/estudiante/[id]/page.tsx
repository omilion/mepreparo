"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app/AppProvider";
import { DashboardAlumno } from "@/components/DashboardAlumno";
import { TopBar } from "@/components/TopBar";

// La hoja de UN alumno. El detalle vivía desplegándose dentro de la tarjeta
// del panel, donde siempre iba a pelear con el espacio; acá tiene la página
// entera y el panel vuelve a ser una lista para elegir.
export default function EstudianteRuta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { cuenta, irAPupilo, enfocarPupilo, guardarPupiloEnfocado } = useApp();
  const router = useRouter();

  const pupilo = cuenta?.pupilos.find((p) => p.id === id) ?? null;

  // Sin cuenta, al inicio. Con cuenta pero sin ese hijo (id inventado en la
  // URL, o de otro apoderado en una tablet compartida), de vuelta al panel.
  useEffect(() => {
    if (!cuenta) router.replace("/");
    else if (!pupilo) router.replace("/panel");
  }, [cuenta, pupilo, router]);

  // El resto de la app trabaja sobre el pupilo "enfocado": al abrir su hoja,
  // pasa a serlo (si no, el botón de estudiar llevaría al hermano equivocado).
  useEffect(() => {
    if (pupilo) enfocarPupilo(pupilo.id);
  }, [pupilo, enfocarPupilo]);

  if (!cuenta || !pupilo) return null;

  return (
    <main className="min-h-screen">
      <TopBar />
      <DashboardAlumno
        p={pupilo}
        onEntrar={() => irAPupilo(pupilo.id)}
        onVolver={() => router.push("/panel")}
        onActualizarPupilo={guardarPupiloEnfocado}
      />
    </main>
  );
}
