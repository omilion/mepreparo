"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { PlanEstudio } from "@/components/PlanEstudio";
import { StepFade } from "@/components/StepFade";
import { tieneDiagnostico } from "@/lib/profile";
import { TopBar } from "@/components/TopBar";

export default function PlanRuta() {
  const { pupilo, setFoco } = useApp();
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
      <StepFade stepKey={`plan-${pupilo.id}`} direction="next">
        <PlanEstudio
          perfil={pupilo}
          onVolver={
            tieneDiagnostico(pupilo)
              ? () => router.push("/resultado")
              : () => router.push("/panel")
          }
          onTutor={() => {
            if (!pupilo.tutoria) {
              setFoco(null);
              router.push("/tutor");
            } else {
              router.push("/mapa");
            }
          }}
        />
      </StepFade>
    </main>
  );
}
