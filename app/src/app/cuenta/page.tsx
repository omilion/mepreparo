"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { MiCuenta } from "@/components/MiCuenta";
import { TopBar } from "@/components/TopBar";

export default function CuentaRuta() {
  const { cuenta, alCerrarSesionAuth } = useApp();
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
      <MiCuenta
        cuenta={cuenta}
        onCerrarSesion={alCerrarSesionAuth}
        onVolver={() => router.push("/panel")}
      />
    </main>
  );
}
