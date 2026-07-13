"use client";
import { useEffect } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { Tutor } from "@/components/Tutor";

export default function TutorRuta() {
  const { pupilo, foco, guardarPupiloEnfocado } = useApp();
  const router = useRouter();

  // Guard: sin pupilo, al inicio
  useEffect(() => {
    if (!pupilo) {
      router.replace("/");
    }
  }, [pupilo, router]);

  if (!pupilo) return null;

  return (
    <Tutor
      perfil={pupilo}
      temaFoco={foco?.tema}
      onVolver={() => router.push(pupilo.tutoria ? "/mapa" : "/plan")}
      onGuardarPerfil={(p) => {
        guardarPupiloEnfocado(p);
        if (p.tutoria && !p.tutoria.planMaterias) router.push("/mundos");
        else router.push("/mapa");
      }}
    />
  );
}
