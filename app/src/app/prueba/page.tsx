"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { PruebaEtapa } from "@/components/PruebaEtapa";
import { TopBar } from "@/components/TopBar";
import { MINIMO_EVALUABLE_PRUEBA, UMBRAL_PRUEBA_ETAPA } from "@/lib/tutor/acuerdo";

export default function PruebaRuta() {
  const { pupilo, foco, alTerminarPrueba } = useApp();
  const router = useRouter();

  // Guard: si falta pupilo o foco, al mapa
  useEffect(() => {
    if (!pupilo) {
      router.replace("/");
    } else if (!foco) {
      router.replace("/mapa");
    }
  }, [pupilo, foco, router]);

  if (!pupilo || !foco) return null;

  const volverAlMapa = (evento?: string) => {
    const params = new URLSearchParams({ materia: foco.materia, tema: foco.tema });
    if (evento) params.set("evento", evento);
    router.push(`/mapa?${params.toString()}`);
  };

  return (
    <main className="min-h-screen">
      <TopBar />
      <PruebaEtapa
        materia={foco.materia}
        curso={pupilo.curso}
        tema={foco.tema}
        onTerminar={alTerminarPrueba}
        onContinuar={(correctos, total) => {
          const superada =
            total >= MINIMO_EVALUABLE_PRUEBA && correctos / total >= UMBRAL_PRUEBA_ETAPA;
          volverAlMapa(superada ? "etapa_superada" : "refuerzo_necesario");
        }}
        onSalir={() => volverAlMapa()}
      />
    </main>
  );
}
