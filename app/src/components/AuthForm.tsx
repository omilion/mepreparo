"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Reveal } from "./Reveal";

export function AuthForm({
  onSuccess,
}: {
  onSuccess: (apoderadoName: string, email: string) => void;
}) {
  const [esLogin, setEsLogin] = useState(true);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim() || (!esLogin && !nombre.trim())) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setError("");
    setCargando(true);

    try {
      if (esLogin) {
        const { data, error: authError } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });

        if (authError) {
          setError(authError.message || "Error al iniciar sesión.");
        } else if (data?.user) {
          onSuccess(data.user.name, data.user.email);
        }
      } else {
        const { data, error: authError } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: nombre.trim(),
        });

        if (authError) {
          setError(authError.message || "Error al registrarse.");
        } else if (data?.user) {
          onSuccess(data.user.name, data.user.email);
        }
      }
    } catch (err) {
      console.error("Error en autenticación:", err);
      setError("Hubo un error de red. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-zen flex-col items-center justify-center gap-[30px] px-[22px] pb-24 pt-10 text-center">
      <header>
        <Reveal variant="lead" delay={80}>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            {esLogin ? "Ingresar" : "Comenzar"}
          </div>
        </Reveal>
        <Reveal variant="lead" delay={120}>
          <h1 className="text-[30px]">
            {esLogin ? "Tu cuenta de Apoderado" : "Crea tu cuenta de Apoderado"}
          </h1>
        </Reveal>
        <Reveal delay={470}>
          <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.4] text-ink-soft">
            {esLogin
              ? "Inicia sesión para sincronizar el avance de tus estudiantes y acceder desde cualquier dispositivo."
              : "Regístrate para guardar y respaldar de forma segura el progreso de tus hijos."}
          </p>
        </Reveal>
      </header>

      <Reveal delay={600}>
        <form onSubmit={handleSubmit} className="flex w-[320px] max-w-full flex-col gap-4 text-left">
          {error && (
            <div className="rounded-lg bg-clay/10 p-3 text-[13px] text-clay border border-clay/20 leading-snug">
              {error}
            </div>
          )}

          {!esLogin && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nombre" className="text-[12px] font-semibold text-ink-soft uppercase tracking-wider">
                Nombre completo
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                placeholder="Ej. Juan Pérez"
                onChange={(e) => setNombre(e.target.value)}
                disabled={cargando}
                className="input w-full"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[12px] font-semibold text-ink-soft uppercase tracking-wider">
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pass" className="text-[12px] font-semibold text-ink-soft uppercase tracking-wider">
              Contraseña
            </label>
            <input
              id="pass"
              type="password"
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              disabled={cargando}
              className="input w-full"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="cta mt-2 w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            {cargando ? "Cargando…" : esLogin ? "Iniciar Sesión" : "Crear Cuenta"}
          </button>
        </form>
      </Reveal>

      <Reveal delay={800}>
        <button
          type="button"
          onClick={() => {
            setEsLogin(!esLogin);
            setError("");
          }}
          disabled={cargando}
          className="text-[13.5px] text-sage-deep underline underline-offset-4 hover:opacity-85 disabled:opacity-50"
        >
          {esLogin ? "¿No tienes cuenta? Regístrate aquí" : "¿Ya tienes cuenta? Inicia sesión aquí"}
        </button>
      </Reveal>
    </div>
  );
}
