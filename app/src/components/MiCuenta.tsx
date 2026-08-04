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
  const [exportando, setExportando] = useState(false);
  const [mostrarBorrado, setMostrarBorrado] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState("");

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

  // Derecho de acceso: descarga un JSON con todo lo guardado del apoderado y
  // sus hijos (ver /api/apoderado/exportar).
  async function handleExportar() {
    setExportando(true);
    try {
      const res = await fetch("/api/apoderado/exportar");
      if (!res.ok) throw new Error("fallo export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mepreparo-mis-datos.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al exportar datos:", err);
      alert("No se pudo exportar. Intenta de nuevo en un momento.");
    } finally {
      setExportando(false);
    }
  }

  // Derecho de cancelación: borra la cuenta y TODO lo asociado (cascade en el
  // servidor). Exige escribir "ELIMINAR" para evitar un borrado accidental.
  async function handleEliminarCuenta() {
    if (confirmacion !== "ELIMINAR") {
      setErrorBorrado('Escribe "ELIMINAR" en mayúsculas para confirmar.');
      return;
    }
    setBorrando(true);
    setErrorBorrado("");
    try {
      const res = await fetch("/api/apoderado/cuenta", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacion: "ELIMINAR" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo eliminar la cuenta");
      }
      await authClient.signOut();
      onCerrarSesion();
    } catch (err) {
      console.error("Error al eliminar cuenta:", err);
      setErrorBorrado(
        err instanceof Error ? err.message : "No se pudo eliminar la cuenta."
      );
    } finally {
      setBorrando(false);
    }
  }

  return (
    <div className="zen-page flex flex-col gap-[30px] pb-24 pt-10">
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

      {/* Privacidad y datos: derechos de acceso y cancelación (Ley 21.719) */}
      <Reveal delay={620}>
        <div className="rounded-zen border border-hair p-6 flex flex-col gap-4 mt-2">
          <h2 className="font-serif text-[20px] text-ink border-b border-hair pb-2">
            Privacidad y Datos
          </h2>
          <p className="text-[13px] text-ink-soft leading-[1.4]">
            Puedes revisar qué guardamos y por qué en nuestra{" "}
            <a
              href="/privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sage-deep underline underline-offset-2"
            >
              Política de Privacidad
            </a>{" "}
            y{" "}
            <a
              href="/terminos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sage-deep underline underline-offset-2"
            >
              Términos de Uso
            </a>
            .
          </p>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={handleExportar}
              disabled={exportando}
              className="flex-1 rounded-xl border border-hair py-2.5 text-[14px] text-ink hover:border-sage transition-colors disabled:opacity-40"
            >
              {exportando ? "Preparando…" : "Exportar mis datos"}
            </button>
            <button
              type="button"
              onClick={() => setMostrarBorrado((v) => !v)}
              className="flex-1 rounded-xl border border-clay/30 py-2.5 text-[14px] text-clay hover:bg-clay/5 transition-colors"
            >
              Eliminar mi cuenta
            </button>
          </div>

          {mostrarBorrado && (
            <div className="mt-1 flex flex-col gap-3 rounded-xl border border-clay/30 bg-clay/5 p-4">
              <p className="text-[13.5px] leading-[1.5] text-ink">
                Esto borra tu cuenta, la de todos tus hijos, su historial de
                estudio y todo lo asociado. <strong>No se puede deshacer.</strong>{" "}
                Escribe <strong>ELIMINAR</strong> para confirmar.
              </p>
              <input
                type="text"
                value={confirmacion}
                onChange={(e) => {
                  setConfirmacion(e.target.value);
                  setErrorBorrado("");
                }}
                placeholder="ELIMINAR"
                disabled={borrando}
                className="input w-full"
              />
              {errorBorrado && (
                <p className="text-[12.5px] text-clay">{errorBorrado}</p>
              )}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleEliminarCuenta}
                  disabled={borrando || confirmacion !== "ELIMINAR"}
                  className="flex-1 rounded-xl bg-clay py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {borrando ? "Eliminando…" : "Sí, eliminar todo"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarBorrado(false);
                    setConfirmacion("");
                    setErrorBorrado("");
                  }}
                  disabled={borrando}
                  className="rounded-xl border border-hair px-4 py-2.5 text-[14px] text-ink-soft hover:text-ink transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
