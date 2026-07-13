"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { PrepararMundos } from "@/components/PrepararMundos";

export default function MundosRuta() {
  const { pupilo, guardarPupiloEnfocado } = useApp();
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
      <PrepararMundos
        perfil={pupilo}
        onListo={(planMaterias) => {
          if (planMaterias && pupilo.tutoria) {
            const actualizado = {
              ...pupilo,
              tutoria: { ...pupilo.tutoria, planMaterias },
            };
            guardarPupiloEnfocado(actualizado);
          }
          router.push("/mapa");
        }}
      />
    </main>
  );
}
