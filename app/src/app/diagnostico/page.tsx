"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { Diagnostico } from "@/components/Diagnostico";
import { StepFade } from "@/components/StepFade";
import { TopBar } from "@/components/TopBar";

export default function DiagnosticoRuta() {
  const { pupilo, alTerminarDiagnostico } = useApp();
  const router = useRouter();

  // Guard: sin pupilo, al inicio
  useEffect(() => {
    if (!pupilo) {
      router.replace("/");
    }
  }, [pupilo, router]);

  if (!pupilo) return null;

  return (
    <main className="min-h-screen">
      <TopBar />
      <StepFade stepKey={`diag-${pupilo.id}`} direction="next">
        <Diagnostico
          key={pupilo.id}
          perfil={pupilo}
          onListo={alTerminarDiagnostico}
        />
      </StepFade>
    </main>
  );
}
