"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { ResultadoDiagnostico } from "@/components/ResultadoDiagnostico";
import { TopBar } from "@/components/TopBar";

export default function ResultadoRuta() {
  const { pupilo } = useApp();
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
      <ResultadoDiagnostico
        perfil={pupilo}
        onVolver={() => router.push("/panel")}
        onVerPlan={() => router.push("/plan")}
      />
    </main>
  );
}
