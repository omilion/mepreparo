"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { rutEsValido, formatearRut } from "@/lib/rut";
import { Reveal } from "./Reveal";

// versión del consentimiento aceptado (subir si cambian los términos)
const CONSENTIMIENTO_VERSION = "2026-07-v1";

const RELACIONES = [
  { id: "madre", label: "Madre" },
  { id: "padre", label: "Padre" },
  { id: "tutor", label: "Tutor/a legal" },
  { id: "otro", label: "Otro" },
];

export function AuthForm({
  onSuccess,
  modoInicial = "login",
}: {
  onSuccess: (apoderadoName: string, email: string) => void;
  // desde la landing entramos en "registro"; desde "Ingresar", en "login".
  modoInicial?: "login" | "registro";
}) {
  const [esLogin, setEsLogin] = useState(modoInicial === "login");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // datos de responsabilidad sobre el menor (solo registro)
  const [telefono, setTelefono] = useState("");
  const [rut, setRut] = useState("");
  const [relacion, setRelacion] = useState("madre");
  const [comuna, setComuna] = useState("");
  const [consiente, setConsiente] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Guarda los datos extra del apoderado tras crear la cuenta (endpoint propio).
  async function guardarPerfilApoderado() {
    try {
      await fetch("/api/apoderado/perfil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: telefono.trim(),
          rut: formatearRut(rut),
          relacion,
          comuna: comuna.trim(),
          consentimientoVersion: CONSENTIMIENTO_VERSION,
        }),
      });
    } catch (err) {
      // no bloqueamos el registro por esto; se puede completar en Mi cuenta
      console.error("No se pudo guardar el perfil del apoderado:", err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (esLogin) {
      if (!email.trim() || !password.trim()) {
        setError("Por favor completa todos los campos.");
        return;
      }
    } else {
      // validación de registro (datos para operar con un menor)
      if (!nombre.trim() || !email.trim() || !password.trim() || !telefono.trim() || !rut.trim() || !comuna.trim()) {
        setError("Por favor completa todos los campos.");
        return;
      }
      if (!rutEsValido(rut)) {
        setError("El RUT no es válido. Revísalo (incluye el dígito verificador).");
        return;
      }
      if (!consiente) {
        setError("Debes aceptar los términos y confirmar que eres responsable del menor.");
        return;
      }
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
          await guardarPerfilApoderado();
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

          {!esLogin && (
            <>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="tel" className="text-[12px] font-semibold text-ink-soft uppercase tracking-wider">
                    Teléfono
                  </label>
                  <input
                    id="tel"
                    type="tel"
                    value={telefono}
                    placeholder="+56 9 1234 5678"
                    onChange={(e) => setTelefono(e.target.value)}
                    disabled={cargando}
                    className="input w-full"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="rut" className="text-[12px] font-semibold text-ink-soft uppercase tracking-wider">
                    RUT
                  </label>
                  <input
                    id="rut"
                    type="text"
                    value={rut}
                    placeholder="12.345.678-5"
                    onChange={(e) => setRut(e.target.value)}
                    onBlur={() => rut.trim() && setRut(formatearRut(rut))}
                    disabled={cargando}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="rel" className="text-[12px] font-semibold text-ink-soft uppercase tracking-wider">
                    Eres…
                  </label>
                  <select
                    id="rel"
                    value={relacion}
                    onChange={(e) => setRelacion(e.target.value)}
                    disabled={cargando}
                    className="input w-full bg-transparent"
                  >
                    {RELACIONES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="comuna" className="text-[12px] font-semibold text-ink-soft uppercase tracking-wider">
                    Comuna
                  </label>
                  <input
                    id="comuna"
                    type="text"
                    value={comuna}
                    placeholder="Ej. Providencia"
                    onChange={(e) => setComuna(e.target.value)}
                    disabled={cargando}
                    className="input w-full"
                  />
                </div>
              </div>

              <label className="mt-1 flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-ink-soft">
                <input
                  type="checkbox"
                  checked={consiente}
                  onChange={(e) => setConsiente(e.target.checked)}
                  disabled={cargando}
                  className="mt-0.5 h-4 w-4 flex-none accent-sage-deep"
                />
                <span>
                  Soy mayor de edad y responsable del/los menor(es) que voy a
                  registrar. Acepto los{" "}
                  <a href="#" className="text-sage-deep underline underline-offset-2">
                    términos
                  </a>{" "}
                  y la{" "}
                  <a href="#" className="text-sage-deep underline underline-offset-2">
                    política de privacidad
                  </a>
                  , y autorizo el tratamiento de los datos de estudio del menor.
                </span>
              </label>
            </>
          )}

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
