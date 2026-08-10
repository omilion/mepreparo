"use client";

// El QR/enlace con que un niño entra desde su propia tablet. Lo usan tanto el
// panel como la hoja del alumno, así que vive aparte.

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { type PerfilNino } from "@/lib/profile";

export function ModalAccesoAlumno({
  pupilo,
  onClose,
  onActualizarPupilo,
}: {
  pupilo: PerfilNino;
  onClose: () => void;
  onActualizarPupilo?: (p: PerfilNino) => void;
}) {
  const [cargando, setCargando] = useState(false);
  // el servidor ya NO devuelve el PIN (seguridad); solo si el acceso quedó protegido
  const [tokenInfo, setTokenInfo] = useState<{ tienePin: boolean; loginUrl: string } | null>(null);
  const [pinTemp, setPinTemp] = useState(""); // lo escribe el padre; no se precarga del perfil
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [confirmarQuitarPin, setConfirmarQuitarPin] = useState(false);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  // Cargar token inicial al abrir
  useEffect(() => {
    cargarToken();
    cerrarRef.current?.focus();
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [pupilo]);

  useEffect(() => {
    if (!tokenInfo?.loginUrl) {
      setQrDataUrl(null);
      return;
    }
    let activo = true;
    QRCode.toDataURL(tokenInfo.loginUrl, { width: 360, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => activo && setQrDataUrl(url))
      .catch(() => activo && setError("No se pudo generar el código QR. Puedes copiar el enlace."));
    return () => {
      activo = false;
    };
  }, [tokenInfo?.loginUrl]);

  async function cargarToken(nuevoPin?: string) {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/alumno/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Omitir `pin` al abrir es fundamental: `pin: ""` significa quitarlo.
        body: JSON.stringify(
          nuevoPin === undefined ? { pupiloId: pupilo.id } : { pupiloId: pupilo.id, pin: nuevoPin }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo obtener el código de acceso.");
      } else {
        setTokenInfo({ tienePin: !!data.tienePin, loginUrl: data.loginUrl });

        // Reflejamos localmente SOLO si el acceso tiene PIN (nunca el PIN mismo).
        if (nuevoPin !== undefined && onActualizarPupilo) {
          const perfilActualizado: PerfilNino = {
            ...pupilo,
            contexto: { ...pupilo.contexto, tienePin: !!nuevoPin },
          };
          onActualizarPupilo(perfilActualizado);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión al servidor.");
    } finally {
      setCargando(false);
    }
  }

  function alGuardarPin(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{3}$/.test(pinTemp)) {
      setError("El PIN debe constar exactamente de 3 dígitos numéricos.");
      return;
    }
    cargarToken(pinTemp);
  }

  async function alCopiarEnlace() {
    if (!tokenInfo) return;
    try {
      await navigator.clipboard.writeText(tokenInfo.loginUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar el enlace. Intenta mantenerlo presionado para copiarlo.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="acceso-alumno-titulo"
        className="flex w-full max-w-md flex-col rounded-zen border border-hair bg-paper p-6 shadow-xl animate-fade-in"
      >
        <header className="flex items-center justify-between border-b border-hair pb-3">
          <h3 id="acceso-alumno-titulo" className="font-serif text-[18px]">Acceso Alumno: {pupilo.nombre}</h3>
          <button
            type="button"
            onClick={onClose}
            ref={cerrarRef}
            aria-label="Cerrar acceso de alumno"
            className="text-ink-soft hover:text-ink text-[18px]"
          >
            ✕
          </button>
        </header>

        <div className="mt-4 flex flex-col gap-4">
          {/* Formulario de PIN */}
          <form onSubmit={alGuardarPin} className="flex flex-col gap-2">
            <label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-sage-deep">
              Código PIN de 3 dígitos
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                pattern="\d*"
                value={pinTemp}
                onChange={(e) => setPinTemp(e.target.value.replace(/\D/g, ""))}
                placeholder="Ej: 123"
                className="flex-1 rounded-zen border border-hair px-3 py-2 text-[14px] bg-paper text-ink focus:border-sage focus:outline-none"
              />
              <button
                type="submit"
                disabled={cargando || pinTemp.length !== 3}
                className="rounded-zen bg-sage-deep px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {cargando ? "Guardando..." : "Guardar PIN"}
              </button>
            </div>
            <p className="text-[11.5px] text-ink-soft leading-relaxed">
              Ingresa un código numérico corto para proteger el acceso del niño. Déjalo vacío si prefieres ingresar sin PIN.
            </p>
          </form>

          {tokenInfo?.tienePin && (
            <div className="flex flex-col gap-2 rounded-zen border border-clay/25 bg-clay/5 p-3">
              {confirmarQuitarPin ? (
                <>
                  <p className="text-[12px] text-ink">¿Quitar el PIN de este acceso? Cualquier persona con el enlace podrá entrar.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={cargando}
                      onClick={() => cargarToken("")}
                      className="rounded-zen bg-clay px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"
                    >
                      {cargando ? "Quitando..." : "Sí, quitar PIN"}
                    </button>
                    <button
                      type="button"
                      disabled={cargando}
                      onClick={() => setConfirmarQuitarPin(false)}
                      className="rounded-zen border border-hair px-3 py-2 text-[12px] text-ink-soft"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  disabled={cargando}
                  onClick={() => setConfirmarQuitarPin(true)}
                  className="self-start text-[12px] text-clay underline underline-offset-2 disabled:opacity-50"
                >
                  Quitar PIN de acceso
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-zen bg-clay/5 border border-clay/20 p-2.5 text-[12px] text-clay">
              {error}
            </div>
          )}

          {/* Código QR */}
          {tokenInfo && (
            <div className="mt-2 flex flex-col items-center gap-3 border-t border-hair pt-4">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-sage-deep">
                Escanea el código QR
              </span>
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-zen border border-hair bg-white p-2">
                {qrDataUrl ? <img
                  src={qrDataUrl}
                  alt="Código QR de inicio de sesión"
                  className="h-[180px] w-[180px] object-contain"
                /> : <span className="text-[12px] text-ink-soft">Generando QR…</span>}
              </div>
              <p className="text-center text-[12px] text-ink-soft leading-relaxed max-w-[32ch]">
                Escanea este código con la cámara de la tablet o celular de <strong>{pupilo.nombre}</strong> para conectarle directo.
              </p>
              
              <div className="mt-2 flex w-full gap-2 font-sans">
                <button
                  type="button"
                  onClick={alCopiarEnlace}
                  className="flex-1 rounded-zen border border-hair py-2.5 text-[12.5px] font-medium text-ink hover:bg-sage/5 transition-colors"
                >
                  {copiado ? "¡Enlace Copiado! ✓" : "Copiar enlace"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-zen bg-ink/5 py-2.5 px-5 text-[12.5px] font-medium text-ink-soft hover:bg-ink/10 transition-colors"
                >
                  Listo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
