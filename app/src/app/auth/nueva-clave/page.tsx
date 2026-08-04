"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Reveal } from "@/components/Reveal";

// El enlace del correo llega aquí con ?token=... (better-auth ya validó que no
// esté vencido antes de redirigir). Si falta o el enlace venció, se avisa con
// calma y se ofrece pedir uno nuevo.
function NuevaClaveContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const errorUrl = searchParams.get("error");

  const [clave, setClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (clave.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (clave !== confirmarClave) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!token) {
      setError("El enlace no es válido. Pide uno nuevo.");
      return;
    }
    setError("");
    setCargando(true);
    try {
      const { error: authError } = await authClient.resetPassword({
        newPassword: clave,
        token,
      });
      if (authError) {
        setError(authError.message || "No se pudo cambiar la contraseña.");
      } else {
        setListo(true);
      }
    } catch (err) {
      console.error("Error cambiando la contraseña:", err);
      setError("Hubo un error de red. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  const enlaceInvalido = !token || errorUrl === "INVALID_TOKEN";

  return (
    <div className="zen-page flex min-h-[calc(100vh-58px)] flex-col items-center justify-center gap-[30px] pb-24 pt-10 text-center">
      <header>
        <Reveal variant="lead" delay={80}>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Recuperar acceso
          </div>
        </Reveal>
        <Reveal variant="lead" delay={120}>
          <h1 className="text-[28px]">Elige tu nueva contraseña</h1>
        </Reveal>
      </header>

      {enlaceInvalido ? (
        <Reveal delay={200}>
          <div className="flex w-[320px] max-w-full flex-col gap-4">
            <div className="rounded-xl border border-clay/20 bg-clay/10 p-4 text-[14px] leading-[1.5] text-clay">
              Este enlace no es válido o ya venció. Los enlaces duran 1 hora
              por seguridad.
            </div>
            <Link href="/auth/recuperar" className="cta">
              Pedir un enlace nuevo
            </Link>
          </div>
        </Reveal>
      ) : listo ? (
        <Reveal delay={200}>
          <div className="flex w-[320px] max-w-full flex-col gap-4">
            <div className="rounded-xl border border-sage/30 bg-sage/5 p-4 text-[14px] leading-[1.5] text-ink">
              Tu contraseña se actualizó. Ya puedes iniciar sesión con ella.
            </div>
            <button onClick={() => router.push("/auth")} className="cta">
              Ir a iniciar sesión
            </button>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={300}>
          <form
            onSubmit={handleSubmit}
            className="flex w-[320px] max-w-full flex-col gap-4 text-left"
          >
            {error && (
              <div className="rounded-lg border border-clay/20 bg-clay/10 p-3 text-[13px] leading-snug text-clay">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="clave"
                className="text-[12px] font-semibold uppercase tracking-wider text-ink-soft"
              >
                Nueva contraseña
              </label>
              <input
                id="clave"
                type="password"
                value={clave}
                placeholder="••••••••"
                onChange={(e) => setClave(e.target.value)}
                disabled={cargando}
                className="input w-full"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirmar"
                className="text-[12px] font-semibold uppercase tracking-wider text-ink-soft"
              >
                Confírmala
              </label>
              <input
                id="confirmar"
                type="password"
                value={confirmarClave}
                placeholder="••••••••"
                onChange={(e) => setConfirmarClave(e.target.value)}
                disabled={cargando}
                className="input w-full"
              />
            </div>
            <button
              type="submit"
              disabled={cargando}
              className="cta mt-2 w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {cargando ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        </Reveal>
      )}
    </div>
  );
}

export default function NuevaClavePage() {
  return (
    <Suspense
      fallback={
        <div className="zen-page flex min-h-[calc(100vh-58px)] items-center justify-center">
          <p className="text-ink-soft">Cargando…</p>
        </div>
      }
    >
      <NuevaClaveContent />
    </Suspense>
  );
}
