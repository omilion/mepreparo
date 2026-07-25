"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { WizardHijo } from "@/components/WizardHijo";
import { StepFade } from "@/components/StepFade";
import { TopBar } from "@/components/TopBar";

export default function WizardRuta() {
  const { nuevos, wizIdx, onboardingListo, alConfigurarHijo } = useApp();
  const router = useRouter();

  // Guard: sin hijos por configurar, al inicio. Espera a que el Provider
  // termine de recuperar un onboarding a medias — si no, al recargar aquí
  // saldríamos disparados antes de saber que sí había algo pendiente.
  useEffect(() => {
    if (onboardingListo && nuevos.length === 0) {
      router.replace("/");
    }
  }, [onboardingListo, nuevos, router]);

  if (!onboardingListo || nuevos.length === 0 || wizIdx >= nuevos.length) {
    return null;
  }

  const perfilActual = nuevos[wizIdx];

  return (
    <main className="min-h-screen">
      <TopBar mostrarHome={false} />
      <StepFade stepKey={`wiz-${wizIdx}`} direction="next">
        <WizardHijo
          key={perfilActual.id}
          perfilInicial={perfilActual}
          indice={wizIdx}
          total={nuevos.length}
          onListo={alConfigurarHijo}
          // Solo en el primer hijo: aún no se ha configurado a nadie, así que
          // volver a los nombres no descarta trabajo hecho.
          onSalir={wizIdx === 0 ? () => router.push("/registro") : undefined}
        />
      </StepFade>
    </main>
  );
}
