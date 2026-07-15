"use client";

// Estado compartido de toda la app (antes vivía en page.tsx como una máquina de
// estados con `etapa`). Ahora cada pantalla es una RUTA real de Next; este
// Provider guarda el estado que cruza pantallas (cuenta, pupilo enfocado, foco
// de etapa, sesión de alumno) y expone las transiciones, que navegan con el
// router. Así el botón atrás del navegador funciona de forma nativa.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  leerCuenta,
  guardarCuenta,
  guardarPupilo,
  borrarCuenta,
  sincronizarConServidor,
  leerSesionAlumno,
  borrarSesionAlumno,
  type SesionAlumno,
} from "@/lib/storage";
import {
  nuevaCuenta,
  configuracionCompleta,
  tieneDiagnostico,
  type Cuenta,
  type PerfilNino,
  type Materia,
} from "@/lib/profile";
import type { ResultadoMateria } from "@/lib/diagnostico/tipos";
import {
  registrarEjercicios,
  sembrarTemasDesdeDiagnostico,
  type AcuerdoTutoria,
} from "@/lib/tutor/acuerdo";
import { cuentaDePrueba } from "@/lib/dev/seed";

export type Foco = { materia: Materia; tema: string } | null;

// Acciones dev que el Tutor "publica" al panel dev global mientras está montado.
// El DevPanel las muestra como botones solo si existen (o sea, solo en el tutor).
export type AccionesDevTutor = {
  lanzarSopa: () => void;
  lanzarEjercicio: () => void;
  lanzarSeleccion: () => void;
} | null;

interface AppState {
  // datos
  cuenta: Cuenta | null;
  enfocado: number;
  pupilo: PerfilNino | null;
  foco: Foco;
  sesionAlumno: SesionAlumno | null;
  pinBloqueado: boolean;
  modoAuth: "login" | "registro";
  cargando: boolean; // sesión de auth aún resolviendo / arranque
  // onboarding multi-hijo
  nuevos: PerfilNino[];
  wizIdx: number;

  // setters expuestos
  setCuenta: (c: Cuenta | null) => void;
  setFoco: (f: Foco) => void;
  setEnfocado: (i: number) => void;
  setPinBloqueado: (v: boolean) => void;
  setModoAuth: (m: "login" | "registro") => void;

  // transiciones (navegan con el router)
  irAPupilo: (indice: number) => void;
  alRegistrar: (pupilosNuevos: PerfilNino[]) => void;
  alConfigurarHijo: (perfil: PerfilNino) => void;
  agregarHijo: () => void;
  alTerminarDiagnostico: (resultados: ResultadoMateria[]) => void;
  alTerminarPrueba: (correctos: number, total: number) => void;
  alCerrarSesionAuth: () => void;
  alSalirModoAlumno: () => void;
  guardarPupiloEnfocado: (p: PerfilNino) => void;

  // dev
  cargarPrueba: () => void;
  limpiarTodo: () => void;
  accionesDevTutor: AccionesDevTutor;
  setAccionesDevTutor: (a: AccionesDevTutor) => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return v;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [enfocado, setEnfocado] = useState(0);
  const [foco, setFoco] = useState<Foco>(null);
  const [nuevos, setNuevos] = useState<PerfilNino[]>([]);
  const [wizIdx, setWizIdx] = useState(0);
  const [modoAuth, setModoAuth] = useState<"login" | "registro">("registro");
  const [sesionAlumno, setSesionAlumno] = useState<SesionAlumno | null>(null);
  const [pinBloqueado, setPinBloqueado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [accionesDevTutor, setAccionesDevTutor] = useState<AccionesDevTutor>(null);
  // evita re-ejecutar el ruteo inicial en cada render
  const arranqueHecho = useRef(false);

  const pupilo = cuenta?.pupilos[enfocado] ?? null;

  // sincronización en segundo plano actualiza la cuenta en memoria
  useEffect(() => {
    function alSincronizar() {
      const c = leerCuenta();
      if (c) setCuenta(c);
    }
    window.addEventListener("sync-completed", alSincronizar);
    return () => window.removeEventListener("sync-completed", alSincronizar);
  }, []);

  // Persiste la cuenta ante cualquier cambio en el estado
  useEffect(() => {
    if (cuenta) {
      guardarCuenta(cuenta);
    }
  }, [cuenta]);

  // Arranque: decide a qué RUTA mandar al usuario según sesión/estado. Solo la
  // primera vez que se resuelve la sesión (no re-rutea en cada navegación).
  useEffect(() => {
    if (isPending) return;
    if (arranqueHecho.current) {
      setCargando(false);
      return;
    }

    // 1) modo alumno (sesión local)
    const alumno = leerSesionAlumno();
    if (alumno) {
      const c = leerCuenta();
      if (c && c.pupilos.length > 0) {
        setSesionAlumno(alumno);
        setCuenta(c);
        setEnfocado(0);
        setPinBloqueado(!!alumno.tienePin);
        const p = c.pupilos[0];
        arranqueHecho.current = true;
        setCargando(false);
        if (!configuracionCompleta(p)) router.replace("/wizard");
        else if (!tieneDiagnostico(p)) router.replace("/diagnostico");
        else router.replace("/mapa");
        return;
      }
      borrarSesionAlumno();
    }

    // 2) visitante sin sesión → landing
    if (!session) {
      arranqueHecho.current = true;
      setCuenta(null);
      setCargando(false);
      router.replace("/landing");
      return;
    }

    // 3) apoderado con sesión → sincroniza y va a panel o registro
    const user = session.user;
    const local = leerCuenta() || nuevaCuenta();
    const base: Cuenta = {
      ...local,
      apoderado: { nombre: user.name || "Apoderado", email: user.email },
    };
    setCuenta(base);
    arranqueHecho.current = true;
    sincronizarConServidor(base)
      .then((sinc) => {
        setCuenta(sinc);
        setCargando(false);
        router.replace(sinc.pupilos.length > 0 ? "/panel" : "/registro");
      })
      .catch(() => {
        setCargando(false);
        router.replace(base.pupilos.length > 0 ? "/panel" : "/registro");
      });
  }, [session, isPending, router]);

  // --- transiciones ---
  const irAPupilo = useCallback(
    (indice: number) => {
      setEnfocado(indice);
      const p = cuenta!.pupilos[indice];
      if (!configuracionCompleta(p)) router.push("/wizard");
      else if (!tieneDiagnostico(p)) router.push("/diagnostico");
      else router.push("/mapa");
    },
    [cuenta, router]
  );

  const alRegistrar = useCallback(
    (pupilosNuevos: PerfilNino[]) => {
      setNuevos(pupilosNuevos);
      setWizIdx(0);
      router.push("/wizard");
    },
    [router]
  );

  const alConfigurarHijo = useCallback(
    (perfil: PerfilNino) => {
      const cuentaBase = cuenta ?? nuevaCuenta();
      const actualizada = guardarPupilo(cuentaBase, perfil);
      setCuenta(actualizada);
      if (wizIdx < nuevos.length - 1) {
        setWizIdx(wizIdx + 1);
      } else {
        const idx = actualizada.pupilos.findIndex((p) => p.id === nuevos[0]?.id);
        setEnfocado(idx >= 0 ? idx : 0);
        router.push("/panel");
      }
    },
    [cuenta, wizIdx, nuevos, router]
  );

  const agregarHijo = useCallback(() => {
    setNuevos([]);
    router.push("/registro");
  }, [router]);

  const alTerminarDiagnostico = useCallback(
    (resultados: ResultadoMateria[]) => {
      const p: PerfilNino = { ...cuenta!.pupilos[enfocado], diagnostico: {} };
      for (const r of resultados) {
        p.diagnostico![r.materia] = { nivel: r.nivel, brechas: r.brechas };
      }
      setCuenta(guardarPupilo(cuenta!, p));
      router.push("/resultado");
    },
    [cuenta, enfocado, router]
  );

  const alTerminarPrueba = useCallback(
    (correctos: number, total: number) => {
      const p = cuenta?.pupilos[enfocado];
      if (!cuenta || !p || !foco) {
        router.push("/mapa");
        return;
      }
      const base: AcuerdoTutoria =
        p.tutoria ??
        sembrarTemasDesdeDiagnostico(
          { creadoEn: new Date().toISOString(), horario: {}, notasNino: "", sesiones: [] },
          p.diagnostico
        );
      const tutoria = registrarEjercicios(base, foco.tema, foco.materia, correctos, total);
      setCuenta(guardarPupilo(cuenta, { ...p, tutoria }));
      setFoco(null);
      router.push("/mapa");
    },
    [cuenta, enfocado, foco, router]
  );

  const alCerrarSesionAuth = useCallback(() => {
    borrarCuenta();
    setCuenta(null);
    void authClient.signOut();
    router.replace("/landing");
  }, [router]);

  const alSalirModoAlumno = useCallback(() => {
    borrarSesionAlumno();
    borrarCuenta();
    setSesionAlumno(null);
    setCuenta(null);
    router.replace("/landing");
  }, [router]);

  const guardarPupiloEnfocado = useCallback(
    (p: PerfilNino) => {
      setCuenta((c) => (c ? guardarPupilo(c, p) : c));
    },
    []
  );

  // --- dev ---
  const cargarPrueba = useCallback(() => {
    const c = cuentaDePrueba();
    guardarCuenta(c);
    setCuenta(c);
    setNuevos([]);
    setEnfocado(0);
    router.push("/panel");
  }, [router]);

  const limpiarTodo = useCallback(() => {
    borrarCuenta();
    setCuenta(null);
    setNuevos([]);
    setEnfocado(0);
    router.push("/registro");
  }, [router]);

  const value: AppState = {
    cuenta,
    enfocado,
    pupilo,
    foco,
    sesionAlumno,
    pinBloqueado,
    modoAuth,
    cargando: cargando || isPending,
    nuevos,
    wizIdx,
    setCuenta,
    setFoco,
    setEnfocado,
    setPinBloqueado,
    setModoAuth,
    irAPupilo,
    alRegistrar,
    alConfigurarHijo,
    agregarHijo,
    alTerminarDiagnostico,
    alTerminarPrueba,
    alCerrarSesionAuth,
    alSalirModoAlumno,
    guardarPupiloEnfocado,
    cargarPrueba,
    limpiarTodo,
    accionesDevTutor,
    setAccionesDevTutor,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
