"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { WizardHijo } from "@/components/WizardHijo";
import { StepFade } from "@/components/StepFade";
import { TopBar } from "@/components/TopBar";

export default function WizardRuta() {
  const { nuevos, wizIdx, alConfigurarHijo } = useApp();
  const router = useRouter();

  // Guard: sin nuevos, al inicio
  useEffect(() => {
    if (nuevos.length === 0) {
      router.replace("/");
    }
  }, [nuevos, router]);

  if (nuevos.length === 0 || wizIdx >= nuevos.length) return null;

  const perfilActual = nuevos[wizIdx];

  return (
    <main className="min-h-screen">
      <TopBar />
      <StepFade stepKey={`wiz-${wizIdx}`} direction="next">
        <WizardHijo
          key={perfilActual.id}
          perfilInicial={perfilActual}
          indice={wizIdx}
          total={nuevos.length}
          onListo={alConfigurarHijo}
        />
      </StepFade>
    </main>
  );
}
