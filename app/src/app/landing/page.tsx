"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { Landing } from "@/components/Landing";
import { authClient } from "@/lib/auth-client";
import { leerSesionAlumno } from "@/lib/storage";

export default function LandingRuta() {
  const { setModoAuth } = useApp();
  const router = useRouter();
  const { data: sesionApoderado } = authClient.useSession();
  const [esAlumno, setEsAlumno] = useState(false);

  // La sesion de alumno vive localmente. Se lee despues de montar para no
  // provocar diferencias entre el HTML del servidor y el primer render.
  useEffect(() => {
    setEsAlumno(Boolean(leerSesionAlumno()));
  }, []);

  const tieneSesion = esAlumno || Boolean(sesionApoderado);
  const textoVolver = esAlumno ? "Volver a estudiar" : "Ir a mi panel";

  function entrarALaAplicacion() {
    // Carga completa intencional: AppProvider dejo la portada en paz por ser
    // publica. Al entrar a una ruta privada debe arrancar de nuevo, recuperar
    // la cuenta y sincronizarla antes de decidir el destino definitivo.
    window.location.assign(esAlumno ? "/hoy" : "/panel");
  }

  function comenzar() {
    if (tieneSesion) {
      entrarALaAplicacion();
      return;
    }
    setModoAuth("registro");
    router.push("/auth");
  }

  return (
    <main className="min-h-screen">
      <div className="zen-page flex h-[58px] items-center justify-between">
        <span className="font-serif text-[19px]">RAI</span>
        <button
          type="button"
          onClick={() => {
            if (tieneSesion) {
              entrarALaAplicacion();
              return;
            }
            setModoAuth("login");
            router.push("/auth");
          }}
          className="text-[13.5px] text-sage-deep hover:opacity-80"
        >
          {tieneSesion ? textoVolver : "Ingresar"}
        </button>
      </div>
      <Landing
        onComenzar={comenzar}
        onProbar={() => router.push("/demo")}
      />
    </main>
  );
}
