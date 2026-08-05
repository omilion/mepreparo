"use client";

// Paywall: solo se llega aquí cuando evaluarAcceso() dice bloqueado (Fase
// 4.3). Bloqueo SUAVE: esto se decide al ARRANCAR la app (ver AppProvider),
// nunca corta una sesión de estudio ya en curso.

import { useApp } from "@/lib/app/AppProvider";
import { Suscripcion } from "@/components/Suscripcion";
import { TopBar } from "@/components/TopBar";
import { Reveal } from "@/components/Reveal";

export default function SuscripcionRuta() {
  const { sesionAlumno, alSalirModoAlumno, alCerrarSesionAuth } = useApp();

  // Un niño en su propia tablet no puede pagar nada: se le pide con calma que
  // avise a su apoderado, sin mencionar dinero ni suscripciones.
  if (sesionAlumno) {
    return (
      <main className="min-h-screen">
        <div className="zen-page flex min-h-[calc(100vh-58px)] flex-col items-center justify-center gap-6 px-4 text-center">
          <Reveal variant="lead" delay={80}>
            <h1 className="max-w-[18ch] text-[24px]">
              Necesitamos que tu apoderado revise la cuenta
            </h1>
          </Reveal>
          <Reveal delay={260}>
            <p className="max-w-[34ch] text-[15px] leading-[1.5] text-ink-soft">
              Pídele que entre a mepreparo desde su celular o computador para
              que puedas seguir estudiando con Rai.
            </p>
          </Reveal>
          <Reveal delay={420}>
            <button onClick={alSalirModoAlumno} className="cta px-9">
              Salir
            </button>
          </Reveal>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <TopBar mostrarHome={false} />
      <div className="zen-page flex flex-col items-center gap-7 pb-24 pt-10 text-center">
        <Reveal variant="lead" delay={80}>
          <h1 className="text-[26px]">Tu acceso está pausado</h1>
        </Reveal>
        <Reveal delay={220}>
          <p className="max-w-[38ch] text-[15px] leading-[1.5] text-ink-soft">
            Renueva tu suscripción para que tus hijos sigan estudiando con Rai.
          </p>
        </Reveal>
        <Reveal delay={360}>
          <div className="w-full max-w-[400px]">
            <Suscripcion />
          </div>
        </Reveal>
        <Reveal delay={480}>
          <button
            onClick={alCerrarSesionAuth}
            className="text-[13px] text-ink-soft underline underline-offset-4 hover:text-ink"
          >
            Cerrar sesión
          </button>
        </Reveal>
      </div>
    </main>
  );
}
