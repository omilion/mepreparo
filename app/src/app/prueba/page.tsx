"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { PruebaEtapa } from "@/components/PruebaEtapa";
import { TopBar } from "@/components/TopBar";

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

  return (
    <main className="min-h-screen">
      <TopBar />
      <PruebaEtapa
        materia={foco.materia}
        curso={pupilo.curso}
        tema={foco.tema}
        onTerminar={alTerminarPrueba}
        onSalir={() => router.push("/mapa")}
      />
    </main>
  );
}
