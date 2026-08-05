"use client";

// Estado real de la suscripción en Mi Cuenta: prueba/activa/vencida/cancelada,
// botón para suscribirse (redirige a Flow) o cancelar (mantiene acceso hasta
// el fin del período pagado — nunca corta de golpe).

import { useEffect, useState } from "react";
import { clp } from "@/lib/precios";

interface EstadoPagos {
  estado: "prueba" | "activa" | "vencida" | "cancelada";
  bloqueado: boolean;
  motivo: string;
  diasRestantes: number | null;
  periodoHasta: string | null;
  precioMensualClp: number;
  pagosDisponibles: boolean;
}

const ETIQUETA_ESTADO: Record<EstadoPagos["estado"], string> = {
  prueba: "Prueba gratis",
  activa: "Suscripción activa",
  vencida: "Suscripción vencida",
  cancelada: "Cancelada",
};

export function Suscripcion() {
  const [info, setInfo] = useState<EstadoPagos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarCancelar, setMostrarCancelar] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch("/api/pagos/estado");
      if (res.ok) setInfo(await res.json());
    } catch {
      /* la tarjeta de abajo simplemente no se muestra */
    } finally {
      setCargando(false);
    }
  }

  async function suscribirse() {
    setProcesando(true);
    setError("");
    try {
      const res = await fetch("/api/pagos/crear", { method: "POST" });
      const data = await res.json();
      if (data.disponible && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Los pagos aún no están disponibles.");
      }
    } catch {
      setError("No se pudo iniciar el pago. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  async function cancelar() {
    setProcesando(true);
    setError("");
    try {
      await fetch("/api/pagos/cancelar", { method: "POST" });
      setMostrarCancelar(false);
      await cargar();
    } catch {
      setError("No se pudo cancelar. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  if (cargando || !info) {
    return (
      <div className="rounded-zen border border-hair p-6 flex flex-col gap-4 bg-sage/5">
        <h2 className="font-serif text-[20px] text-ink border-b border-hair pb-2">
          Suscripción y Pagos
        </h2>
        <p className="text-[13px] text-ink-soft">Cargando…</p>
      </div>
    );
  }

  const fechaLimite = info.periodoHasta
    ? new Date(info.periodoHasta).toLocaleDateString("es-CL")
    : null;

  return (
    <div className="rounded-zen border border-hair p-6 flex flex-col gap-4 bg-sage/5">
      <h2 className="font-serif text-[20px] text-ink border-b border-hair pb-2">
        Suscripción y Pagos
      </h2>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Estado
        </span>
        <span
          className={
            "text-[16px] font-semibold " + (info.bloqueado ? "text-clay" : "text-sage-deep")
          }
        >
          {ETIQUETA_ESTADO[info.estado]}
        </span>
      </div>

      <p className="text-[13px] text-ink-soft leading-[1.4]">
        {info.estado === "prueba" &&
          (info.bloqueado
            ? "Tu prueba gratis terminó. Suscríbete para seguir estudiando con Rai."
            : `Te quedan ${info.diasRestantes ?? 0} días de prueba gratis.`)}
        {info.estado === "activa" && fechaLimite && `Tu acceso está activo hasta el ${fechaLimite}.`}
        {info.estado === "cancelada" &&
          (info.bloqueado
            ? "Tu período pagado terminó."
            : `Cancelaste la renovación, pero mantienes acceso hasta el ${fechaLimite}.`)}
        {info.estado === "vencida" && "Tu suscripción venció. Renueva para seguir estudiando con Rai."}
      </p>

      <div className="flex flex-col gap-1.5 border-t border-hair pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          Precio
        </span>
        <span className="text-[15px] font-medium text-ink">{clp(info.precioMensualClp)} / mes</span>
      </div>

      {!info.pagosDisponibles ? (
        <div className="mt-1 rounded-lg border border-dashed border-hair p-3 text-center text-[12px] text-ink-soft bg-white/40">
          Métodos de pago en configuración — pronto disponibles.
        </div>
      ) : (
        <>
          {error && <p className="text-[12.5px] text-clay">{error}</p>}
          {(info.estado === "prueba" || info.estado === "vencida" || info.bloqueado) && (
            <button
              onClick={suscribirse}
              disabled={procesando}
              className="cta mt-1 disabled:opacity-40"
            >
              {procesando ? "Redirigiendo…" : "Suscribirme"}
            </button>
          )}
          {info.estado === "activa" && !mostrarCancelar && (
            <button
              onClick={() => setMostrarCancelar(true)}
              className="mt-1 text-[13px] text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Cancelar suscripción
            </button>
          )}
          {mostrarCancelar && (
            <div className="mt-1 flex flex-col gap-2.5 rounded-xl border border-hair p-3">
              <p className="text-[12.5px] text-ink-soft">
                Mantienes acceso hasta el {fechaLimite}; después no se te volverá a cobrar.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={cancelar}
                  disabled={procesando}
                  className="flex-1 rounded-xl bg-clay/10 border border-clay/20 text-clay py-2 text-[13px] hover:bg-clay/20 disabled:opacity-40"
                >
                  {procesando ? "Cancelando…" : "Sí, cancelar"}
                </button>
                <button
                  onClick={() => setMostrarCancelar(false)}
                  disabled={procesando}
                  className="rounded-xl border border-hair px-4 py-2 text-[13px] text-ink-soft hover:text-ink"
                >
                  Volver
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
