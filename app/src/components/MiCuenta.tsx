"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { type Cuenta, MATERIAS } from "@/lib/profile";
import { DIAS } from "@/lib/tutor/acuerdo";
import { Reveal } from "./Reveal";

export function MiCuenta({
  cuenta,
  onCerrarSesion,
  onVolver,
}: {
  cuenta: Cuenta;
  onCerrarSesion: () => void;
  onVolver: () => void;
}) {
  const apoderado = cuenta.apoderado || { nombre: "Apoderado", email: "" };
  const [cargando, setCargando] = useState(false);

  async function handleSignOut() {
    setCargando(true);
    try {
      await authClient.signOut();
      onCerrarSesion();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-zen flex-col gap-[30px] px-[22px] pb-24 pt-10">
      <Reveal variant="lead" delay={80}>
        <header className="flex items-center justify-between">
          <div>
            <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
              Configuración
            </div>
            <h1 className="text-[28px]">Mi Cuenta</h1>
          </div>
          <button
            type="button"
            onClick={onVolver}
            className="rounded-full border border-hair px-4 py-1.5 text-[13px] text-ink-soft hover:text-ink transition-colors"
          >
            Volver
          </button>
        </header>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Datos Personales */}
        <Reveal delay={200}>
          <div className="rounded-zen border border-hair p-6 flex flex-col gap-4">
            <h2 className="font-serif text-[20px] text-ink border-b border-hair pb-2">
              Datos Personales
            </h2>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Nombre
              </span>
              <span className="text-[15px] font-medium text-ink">
                {apoderado.nombre || "Sin nombre"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5 pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Correo Electrónico
              </span>
              <span className="text-[15px] font-medium text-ink">
                {apoderado.email || "Sin email"}
              </span>
            </div>
            <button
              type="button"
              disabled={cargando}
              onClick={handleSignOut}
              className="mt-4 rounded-xl bg-clay/10 border border-clay/20 text-clay py-2.5 text-[14px] hover:bg-clay/20 transition-all font-medium disabled:opacity-40"
            >
              {cargando ? "Cerrando Sesión…" : "Cerrar Sesión"}
            </button>
          </div>
        </Reveal>

        {/* Planes y Suscripción */}
        <Reveal delay={350}>
          <div className="rounded-zen border border-hair p-6 flex flex-col gap-4 bg-sage/5">
            <h2 className="font-serif text-[20px] text-ink border-b border-hair pb-2">
              Suscripción y Pagos
            </h2>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Plan Actual
              </span>
              <span className="text-[16px] font-semibold text-sage-deep">
                Beta Gratuita 🎁
              </span>
            </div>
            <p className="text-[13px] text-ink-soft leading-[1.4] mt-2">
              Actualmente tienes acceso ilimitado a todas las herramientas pedagógicas de Rai. 
              En la fase de producto final podrás suscribirte a un plan familiar mensual.
            </p>
            <div className="mt-2 rounded-lg border border-dashed border-hair p-3 text-center text-[12px] text-ink-soft bg-white/40">
              Métodos de pago deshabilitados temporalmente
            </div>
          </div>
        </Reveal>
      </div>

      {/* Lista detallada de pupilos */}
      <Reveal delay={500}>
        <div className="rounded-zen border border-hair p-6 flex flex-col gap-4 mt-2">
          <h2 className="font-serif text-[20px] text-ink border-b border-hair pb-2">
            Tus Estudiantes ({cuenta.pupilos.length})
          </h2>
          <div className="flex flex-col gap-4">
            {cuenta.pupilos.length === 0 ? (
              <p className="text-[13.5px] text-ink-soft italic">
                No tienes estudiantes registrados aún.
              </p>
            ) : (
              cuenta.pupilos.map((p) => {
                const materias = p.examen.materias
                  .map((m) => MATERIAS.find((x) => x.id === m)?.label ?? m)
                  .join(", ");
                const diagnosticado = !!p.diagnostico && Object.keys(p.diagnostico).length > 0;
                
                return (
                  <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-hair/60 p-4 bg-transparent">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-serif text-[17px] text-ink">{p.nombre}</h3>
                      <span className="text-[11.5px] font-semibold text-sage-deep uppercase tracking-wider">
                        {diagnosticado ? "En preparación" : "Diagnóstico pendiente"}
                      </span>
                    </div>
                    <div className="text-[12.5px] text-ink-soft">
                      <span className="font-semibold text-ink">Curso:</span> {p.curso} · <span className="font-semibold text-ink">Examen:</span> {p.examen.fecha || "Sin fecha"}
                    </div>
                    <div className="text-[12.5px] text-ink-soft">
                      <span className="font-semibold text-ink">Materias:</span> {materias || "Ninguna"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
