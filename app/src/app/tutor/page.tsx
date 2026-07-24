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
      // key por niño: al cambiar de pupilo, el Tutor se remonta LIMPIO (no arrastra
      // la conversación/sesión del niño anterior). La id no cambia al guardar el
      // perfil del mismo niño, así que la sesión en curso no se reinicia.
      key={pupilo.id}
      perfil={pupilo}
      temaFoco={foco?.tema}
      onVolver={() => router.push(pupilo.tutoria ? "/mapa" : "/plan")}
      // PERSISTE sin navegar: evidencia de interactivos y cierre de sesión. Antes
      // esto hacía router.push("/mapa") en CADA guardado → al terminar un
      // interactivo sacaba al niño de la clase (bug). Ahora solo guarda.
      onGuardarPerfil={(p) => guardarPupiloEnfocado(p)}
      // Solo la primera vez, al fijar el horario: guarda y pasa a preparar mundos.
      onHorarioCreado={(p) => {
        guardarPupiloEnfocado(p);
        router.push("/mundos");
      }}
    />
  );
}
