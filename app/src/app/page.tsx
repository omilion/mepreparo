"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Registro } from "@/components/Registro";
import { WizardHijo } from "@/components/WizardHijo";
import { Diagnostico } from "@/components/Diagnostico";
import { ResultadoDiagnostico } from "@/components/ResultadoDiagnostico";
import { PlanEstudio } from "@/components/PlanEstudio";
import { Tutor } from "@/components/Tutor";
import { PanelHijos } from "@/components/PanelHijos";
import { StepFade } from "@/components/StepFade";
import { DevPanel, type EtapaDev } from "@/components/DevPanel";
import { AuthForm } from "@/components/AuthForm";
import { MiCuenta } from "@/components/MiCuenta";
import { Landing } from "@/components/Landing";
import { authClient } from "@/lib/auth-client";
import { cuentaDePrueba } from "@/lib/dev/seed";
import {
  leerCuenta,
  guardarCuenta,
  guardarPupilo,
  borrarCuenta,
  sincronizarConServidor,
} from "@/lib/storage";
import {
  nuevaCuenta,
  configuracionCompleta,
  tieneDiagnostico,
  type Cuenta,
  type PerfilNino,
} from "@/lib/profile";
import type { ResultadoMateria } from "@/lib/diagnostico/tipos";

type Etapa =
  | "cargando"
  | "landing"
  | "auth"
  | "cuenta"
  | "registro"
  | "panel"
  | "wizard"
  | "resultado"
  | "diagnostico"
  | "plan"
  | "tutor";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [etapa, setEtapa] = useState<Etapa>("cargando");
  // índice del pupilo enfocado dentro de cuenta.pupilos
  const [enfocado, setEnfocado] = useState(0);
  // para el wizard multi-hijo recién registrado
  const [nuevos, setNuevos] = useState<PerfilNino[]>([]);
  const [wizIdx, setWizIdx] = useState(0);
  // con qué modo abrir el formulario de auth (según de dónde venga el clic)
  const [modoAuth, setModoAuth] = useState<"login" | "registro">("registro");

  // Escuchar eventos de sincronización en segundo plano para actualizar el estado React
  useEffect(() => {
    function alSincronizar() {
      const c = leerCuenta();
      if (c) setCuenta(c);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("sync-completed", alSincronizar);
      return () => window.removeEventListener("sync-completed", alSincronizar);
    }
  }, []);

  // React al estado de sesión de Better Auth
  useEffect(() => {
    if (isPending) {
      setEtapa("cargando");
      return;
    }

    if (!session) {
      // visitante sin sesión: parte en la landing de venta. Si ya está en el
      // formulario de registro (auth), lo dejamos ahí (no lo devolvemos atrás).
      setEtapa((prev) => (prev === "auth" ? "auth" : "landing"));
      setCuenta(null);
      return;
    }

    const user = session.user;
    const local = leerCuenta() || nuevaCuenta();
    const updatedCuenta: Cuenta = {
      ...local,
      apoderado: { nombre: user.name || "Apoderado", email: user.email },
    };

    setCuenta(updatedCuenta);

    // Sincronizar perfiles locales con base de datos del servidor Postgres
    sincronizarConServidor(updatedCuenta)
      .then((sincronizada) => {
        setCuenta(sincronizada);
        if (sincronizada.pupilos.length > 0) {
          setEtapa("panel");
        } else {
          setEtapa("registro");
        }
      })
      .catch((err) => {
        console.error("Error al sincronizar al montar sesión:", err);
        if (updatedCuenta.pupilos.length > 0) {
          setEtapa("panel");
        } else {
          setEtapa("registro");
        }
      });
  }, [session, isPending]);

  // --- onboarding (primera vez o al agregar) ---
  function alRegistrar(pupilosNuevos: PerfilNino[]) {
    setNuevos(pupilosNuevos);
    setWizIdx(0);
    setEtapa("wizard");
  }

  function alConfigurarHijo(perfil: PerfilNino) {
    const base = cuenta ?? nuevaCuenta();
    const actualizada = guardarPupilo(base, perfil);
    setCuenta(actualizada);

    if (wizIdx < nuevos.length - 1) {
      setWizIdx(wizIdx + 1);
    } else {
      // termina el onboarding: al panel, enfocando el primero recién creado
      const idx = actualizada.pupilos.findIndex((p) => p.id === nuevos[0].id);
      setEnfocado(idx >= 0 ? idx : 0);
      setEtapa("panel");
    }
  }

  // --- navegación desde el panel ---
  function entrarAPupilo(indice: number) {
    setEnfocado(indice);
    const p = cuenta!.pupilos[indice];
    if (!configuracionCompleta(p)) setEtapa("wizard");
    else if (!tieneDiagnostico(p)) setEtapa("diagnostico");
    else setEtapa("plan");
  }

  function agregarHijo() {
    setNuevos([]);
    setEtapa("registro");
  }

  // --- diagnóstico ---
  function alTerminarDiagnostico(resultados: ResultadoMateria[]) {
    const p: PerfilNino = { ...cuenta!.pupilos[enfocado], diagnostico: {} };
    for (const r of resultados) {
      p.diagnostico![r.materia] = { nivel: r.nivel, brechas: r.brechas };
    }
    const actualizada = guardarPupilo(cuenta!, p);
    setCuenta(actualizada);
    setEtapa("resultado");
  }

  function irAlPanel() {
    setEtapa("panel");
  }

  function alCerrarSesionAuth() {
    borrarCuenta();
    setCuenta(null);
    setEtapa("auth");
  }

  // --- modo desarrollo: carga de datos de prueba y saltos directos ---
  function cargarPrueba() {
    const c = cuentaDePrueba();
    guardarCuenta(c);
    setCuenta(c);
    setNuevos([]);
    setEnfocado(0);
    setEtapa("panel");
  }

  function limpiarTodo() {
    borrarCuenta();
    setCuenta(null);
    setNuevos([]);
    setEnfocado(0);
    setEtapa("registro");
  }

  function saltarDev(indice: number, e: EtapaDev) {
    setEnfocado(indice);
    setEtapa(e);
  }

  // --- render ---
  const pupilo = cuenta?.pupilos[enfocado];
  const enWizardOnboarding = etapa === "wizard" && nuevos.length > 0;

  // el tutor y la landing son pantallas inmersivas: sin barra global
  const mostrarTopBar =
    etapa !== "tutor" &&
    etapa !== "auth" &&
    etapa !== "landing" &&
    etapa !== "cargando";

  return (
    <main className="min-h-screen">
      {mostrarTopBar && (
        <TopBar
          onHome={irAlPanel}
          onCuenta={() => setEtapa("cuenta")}
        />
      )}

      {etapa === "cargando" && (
        <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-zen items-center justify-center">
          <p className="text-ink-soft">Cargando…</p>
        </div>
      )}

      {etapa === "landing" && (
        <>
          {/* barra mínima de la landing: marca + acceso a login */}
          <div className="mx-auto flex h-[58px] max-w-zen items-center justify-between px-[22px]">
            <span className="font-serif text-[19px]">mepreparo</span>
            <button
              type="button"
              onClick={() => {
                setModoAuth("login");
                setEtapa("auth");
              }}
              className="text-[13.5px] text-sage-deep hover:opacity-80"
            >
              Ingresar
            </button>
          </div>
          <Landing
            onComenzar={() => {
              setModoAuth("registro");
              setEtapa("auth");
            }}
          />
        </>
      )}

      {etapa === "auth" && (
        <AuthForm
          modoInicial={modoAuth}
          onSuccess={(nombre, email) => {
            // El hook useSession reactivo de Better Auth se actualizará solo.
            console.log("Autenticación exitosa:", nombre, email);
          }}
        />
      )}

      {etapa === "cuenta" && cuenta && (
        <MiCuenta
          cuenta={cuenta}
          onCerrarSesion={alCerrarSesionAuth}
          onVolver={irAlPanel}
        />
      )}

      {etapa === "registro" && <Registro onListo={alRegistrar} />}

      {etapa === "panel" && cuenta && (
        <PanelHijos
          cuenta={cuenta}
          onEntrar={entrarAPupilo}
          onAgregar={agregarHijo}
        />
      )}

      {enWizardOnboarding && (
        <StepFade stepKey={`wiz-${wizIdx}`} direction="next">
          <WizardHijo
            key={nuevos[wizIdx].id}
            perfilInicial={nuevos[wizIdx]}
            indice={wizIdx}
            total={nuevos.length}
            onListo={alConfigurarHijo}
          />
        </StepFade>
      )}

      {/* diagnóstico / resultado / plan / tutor — sobre el pupilo enfocado */}
      {etapa === "diagnostico" && pupilo && (
        <StepFade stepKey={`diag-${pupilo.id}`} direction="next">
          <Diagnostico
            key={pupilo.id}
            perfil={pupilo}
            onListo={alTerminarDiagnostico}
          />
        </StepFade>
      )}

      {etapa === "resultado" && pupilo && (
        <ResultadoDiagnostico
          perfil={pupilo}
          onVolver={irAlPanel}
          onVerPlan={() => setEtapa("plan")}
        />
      )}

      {etapa === "plan" && pupilo && (
        <StepFade stepKey={`plan-${pupilo.id}`} direction="next">
          <PlanEstudio
            perfil={pupilo}
            onVolver={
              tieneDiagnostico(pupilo)
                ? () => setEtapa("resultado")
                : irAlPanel
            }
            onTutor={() => setEtapa("tutor")}
          />
        </StepFade>
      )}

      {etapa === "tutor" && pupilo && (
        <Tutor
          perfil={pupilo}
          onVolver={() => setEtapa("plan")}
          onGuardarPerfil={(p) => setCuenta(guardarPupilo(cuenta!, p))}
        />
      )}

      <PersistenciaGuard cuenta={cuenta} />

      {process.env.NODE_ENV === "development" && (
        <DevPanel
          cuenta={cuenta}
          onCargarPrueba={cargarPrueba}
          onLimpiar={limpiarTodo}
          onSaltar={saltarDev}
        />
      )}
    </main>
  );
}

// Persiste la cuenta ante cualquier cambio
function PersistenciaGuard({ cuenta }: { cuenta: Cuenta | null }) {
  useEffect(() => {
    if (cuenta) guardarCuenta(cuenta);
  }, [cuenta]);
  return null;
}
