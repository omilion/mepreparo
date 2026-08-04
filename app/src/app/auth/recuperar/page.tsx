"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Reveal } from "@/components/Reveal";

// Pide el correo y dispara el email de recuperación (better-auth arma el token
// y redirige a /auth/nueva-clave?token=... si es válido). Respuesta genérica
// siempre (no revela si el correo existe, para no filtrar qué emails están
// registrados).
export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Ingresa tu correo.");
      return;
    }
    setError("");
    setCargando(true);
    try {
      await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: "/auth/nueva-clave",
      });
      setEnviado(true);
    } catch (err) {
      console.error("Error pidiendo recuperación:", err);
      // Igual mostramos éxito: no revelamos si el correo existe o no.
      setEnviado(true);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="zen-page flex min-h-[calc(100vh-58px)] flex-col items-center justify-center gap-[30px] pb-24 pt-10 text-center">
      <header>
        <Reveal variant="lead" delay={80}>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Recuperar acceso
          </div>
        </Reveal>
        <Reveal variant="lead" delay={120}>
          <h1 className="text-[28px]">¿Olvidaste tu contraseña?</h1>
        </Reveal>
        <Reveal delay={300}>
          <p className="mt-3 max-w-[38ch] text-[15px] leading-[1.4] text-ink-soft">
            Escribe el correo con el que te registraste y te enviamos un
            enlace para elegir una nueva contraseña.
          </p>
        </Reveal>
      </header>

      {enviado ? (
        <Reveal delay={200}>
          <div className="flex w-[320px] max-w-full flex-col gap-4">
            <div className="rounded-xl border border-sage/30 bg-sage/5 p-4 text-[14px] leading-[1.5] text-ink">
              Si ese correo tiene una cuenta, te llegará un enlace en unos
              minutos. Revisa también spam.
            </div>
            <Link
              href="/auth"
              className="text-[13.5px] text-sage-deep underline underline-offset-4 hover:opacity-85"
            >
              ← Volver a iniciar sesión
            </Link>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={400}>
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
                htmlFor="email"
                className="text-[12px] font-semibold uppercase tracking-wider text-ink-soft"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                placeholder="apoderado@correo.com"
                onChange={(e) => setEmail(e.target.value)}
                disabled={cargando}
                className="input w-full"
              />
            </div>
            <button
              type="submit"
              disabled={cargando}
              className="cta mt-2 w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {cargando ? "Enviando…" : "Enviar enlace"}
            </button>
            <Link
              href="/auth"
              className="text-center text-[13.5px] text-sage-deep underline underline-offset-4 hover:opacity-85"
            >
              ← Volver a iniciar sesión
            </Link>
          </form>
        </Reveal>
      )}
    </div>
  );
}
