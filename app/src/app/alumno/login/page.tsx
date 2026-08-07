"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { guardarSesionAlumno, guardarCuenta } from "@/lib/storage";
import { useApp } from "@/lib/app/AppProvider";

function LoginAlumnoContent() {
  const router = useRouter();
  const { entrarComoAlumno } = useApp();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState("Verificando tu código de acceso...");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Código de acceso no válido. Pídele a tu apoderado que escanee el código QR de nuevo.");
      return;
    }

    const tokenStr: string = token;

    async function iniciarSesion() {
      try {
        setEstado("Cargando tu perfil de estudiante...");
        const res = await fetch("/api/alumno/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenStr }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || "No se pudo iniciar sesión. Verifica el código QR.");
          return;
        }

        setEstado("¡Listo! Conectando...");

        // Guardar la sesión específica del alumno (SIN el PIN: solo si aplica)
        const sesion = {
          token: tokenStr,
          cuentaId: data.cuentaId,
          pupiloId: data.perfil.id,
          nombre: data.perfil.nombre,
          tienePin: !!data.tienePin,
        };
        guardarSesionAlumno(sesion);

        // Guardar una "cuenta" simulada con solo este pupilo para que el flujo existente funcione directo
        const cuentaAlumno = {
          id: data.cuentaId,
          creadaEn: new Date().toISOString(),
          pupilos: [data.perfil],
        };
        guardarCuenta(cuentaAlumno);

        // Se le avisa DIRECTO al provider en vez de empujar a "/" y confiar en
        // que el arranque encuentre la sesión: ese arranque ya corrió mientras
        // validábamos el token, así que no volvía a rutear y el niño se quedaba
        // mirando una pantalla vacía hasta recargar a mano.
        entrarComoAlumno(sesion, cuentaAlumno);
      } catch (err) {
        console.error("Error al iniciar sesión de alumno:", err);
        setError("Ocurrió un error al conectar. Revisa tu conexión a internet.");
      }
    }

    iniciarSesion();
  }, [searchParams, router, entrarComoAlumno]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-6 text-center">
        <div className="max-w-md rounded-zen border border-clay/35 bg-clay/5 p-8">
          <span className="text-4xl">⚠️</span>
          <h1 className="mt-4 font-serif text-[22px] text-clay">Acceso Incorrecto</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
            {error}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-zen bg-sage-deep px-5 py-2.5 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <div className="flex flex-col items-center gap-5">
        {/* Aura animada Zen */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-full bg-sage/20 opacity-75 duration-1000"></div>
          <div className="h-10 w-10 rounded-full bg-sage-deep shadow-md flex items-center justify-center text-white">
            🎓
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[24px] text-ink">mepreparo</h1>
          <p className="text-[14.5px] text-ink-soft animate-pulse">{estado}</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginAlumnoPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-ink-soft">Cargando...</p>
      </div>
    }>
      <LoginAlumnoContent />
    </Suspense>
  );
}
