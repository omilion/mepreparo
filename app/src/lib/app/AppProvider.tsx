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
import { usePathname, useRouter } from "next/navigation";

// Herramientas internas que se abren escribiendo la URL a mano. El arranque no
// debe rutearlas: si no, entras y te rebota al home antes de ver nada.
const RUTAS_LIBRES = ["/rai"];
import { authClient } from "@/lib/auth-client";
import {
  leerCuenta,
  guardarCuenta,
  guardarPupilo,
  borrarCuenta,
  sincronizarConServidor,
  leerSesionAlumno,
  borrarSesionAlumno,
  leerOnboarding,
  guardarOnboarding,
  borrarOnboarding,
  leerFoco,
  guardarFoco,
  borrarFoco,
  borrarDiagnosticoEnCurso,
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

// A DÓNDE entra un niño según lo que le falta. El orden importa: sin
// configuración no hay diagnóstico, sin diagnóstico no hay plan, y sin la
// primera charla con Rai no hay horario ni memoria — por eso el mapa va último.
// Antes la escalera no miraba `tutoria`: el niño que volvía a entrar tras el
// diagnóstico caía en el mapa sin conocer a Rai, y al tocar una etapa recibía
// la presentación en vez de la clase que pidió.
function rutaSegunEstado(p: PerfilNino): string {
  if (!configuracionCompleta(p)) return "/wizard";
  if (!tieneDiagnostico(p)) return "/diagnostico";
  if (!p.tutoria) return "/tutor";
  return "/mapa";
}

// Acciones dev que el Tutor "publica" al panel dev global mientras está montado.
// El DevPanel las muestra como botones solo si existen (o sea, solo en el tutor).
export type AccionesDevTutor = {
  lanzarSopa: () => void;
  lanzarEjercicio: () => void;
  lanzarSeleccion: () => void;
  lanzarRueda: () => void;
  lanzarIntruso: () => void;
  lanzarConector: () => void;
  lanzarClasificador: () => void;
  lanzarSecuencia: () => void;
  lanzarFlashcards: () => void;
} | null;

interface AppState {
  // datos
  cuenta: Cuenta | null;
  // A QUIÉN estamos acompañando. Se guarda el ID, no la posición en la lista:
  // el sync reemplaza el arreglo de pupilos con lo que devuelve la base de
  // datos, y ese orden puede cambiar. Con un índice, un sync en segundo plano
  // hacía que la app pasara a apuntar a OTRO hijo sin que nadie lo notara.
  enfocadoId: string | null;
  pupilo: PerfilNino | null;
  foco: Foco;
  sesionAlumno: SesionAlumno | null;
  pinBloqueado: boolean;
  modoAuth: "login" | "registro";
  cargando: boolean; // sesión de auth aún resolviendo / arranque
  // onboarding multi-hijo
  nuevos: PerfilNino[];
  wizIdx: number;
  // ¿ya intentamos recuperar un onboarding a medias del almacenamiento? El
  // wizard debe esperar esto antes de decidir que no hay nada que configurar.
  onboardingListo: boolean;

  // setters expuestos
  setCuenta: (c: Cuenta | null) => void;
  setFoco: (f: Foco) => void;
  enfocarPupilo: (id: string) => void;
  setPinBloqueado: (v: boolean) => void;
  setModoAuth: (m: "login" | "registro") => void;

  // transiciones (navegan con el router)
  irAPupilo: (id: string) => void;
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
  const pathname = usePathname();

  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [enfocadoId, setEnfocadoId] = useState<string | null>(null);
  const [foco, setFocoState] = useState<Foco>(null);
  const [nuevos, setNuevos] = useState<PerfilNino[]>([]);
  const [wizIdx, setWizIdx] = useState(0);
  const [modoAuth, setModoAuth] = useState<"login" | "registro">("registro");
  const [sesionAlumno, setSesionAlumno] = useState<SesionAlumno | null>(null);
  const [pinBloqueado, setPinBloqueado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [onboardingListo, setOnboardingListo] = useState(false);
  const [accionesDevTutor, setAccionesDevTutor] = useState<AccionesDevTutor>(null);
  // evita re-ejecutar el ruteo inicial en cada render
  const arranqueHecho = useRef(false);

  const pupilo = cuenta?.pupilos.find((p) => p.id === enfocadoId) ?? null;

  // La etapa elegida en el mapa se guarda atada al niño: si recarga, al volver
  // a entrar la clase sigue siendo la que pidió y no una genérica.
  const setFoco = useCallback(
    (f: Foco) => {
      setFocoState(f);
      if (!enfocadoId) return;
      if (f) guardarFoco(enfocadoId, f);
      else borrarFoco();
    },
    [enfocadoId]
  );

  // Al saber a quién acompañamos, se recupera SU foco (y se suelta el del niño
  // anterior: cambiar de hija nunca debe arrastrar la etapa de la otra).
  useEffect(() => {
    if (!enfocadoId) return;
    setFocoState(leerFoco(enfocadoId));
  }, [enfocadoId]);

  // Recupera un onboarding a medias (hijos anotados que aún no pasan por el
  // wizard). Va en un efecto y no en el useState inicial a propósito: en el
  // servidor no existe localStorage y el HTML no coincidiría al hidratar.
  useEffect(() => {
    const pendiente = leerOnboarding();
    if (pendiente) {
      setNuevos(pendiente.pupilos);
      setWizIdx(pendiente.idx);
    }
    setOnboardingListo(true);
  }, []);

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
    // herramientas internas (/rai): se quedan donde están
    if (RUTAS_LIBRES.includes(pathname)) {
      arranqueHecho.current = true;
      setCargando(false);
      return;
    }

    // 1) modo alumno (sesión local)
    const alumno = leerSesionAlumno();
    if (alumno) {
      const c = leerCuenta();
      if (c && c.pupilos.length > 0) {
        // El token del alumno dice QUIÉN es. Antes se enfocaba c.pupilos[0]:
        // en una familia con dos hijos, la segunda entraba con su código y
        // estudiaba el plan de su hermana.
        const p = c.pupilos.find((x) => x.id === alumno.pupiloId) ?? c.pupilos[0];
        setSesionAlumno(alumno);
        setCuenta(c);
        setEnfocadoId(p.id);
        setPinBloqueado(!!alumno.tienePin);
        arranqueHecho.current = true;
        setCargando(false);
        router.replace(rutaSegunEstado(p));
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

    // DISPOSITIVO COMPARTIDO: lo que hay en este navegador puede ser de OTRO
    // apoderado (usó la tablet, su sesión venció y no cerró sesión). Si el
    // correo guardado no es el de quien entra ahora, se descarta: si no, sus
    // hijos se subirían al servidor dentro de la cuenta equivocada.
    const guardada = leerCuenta();
    const esDeOtro =
      !!guardada?.apoderado?.email && guardada.apoderado.email !== user.email;
    if (esDeOtro) {
      borrarCuenta();
      borrarOnboarding();
      setNuevos([]);
      setWizIdx(0);
    }
    const local = (esDeOtro ? null : guardada) || nuevaCuenta();

    const base: Cuenta = {
      ...local,
      apoderado: { nombre: user.name || "Apoderado", email: user.email },
    };
    setCuenta(base);
    arranqueHecho.current = true;

    // Si quedó un wizard a medias, se retoma ahí (aunque ya haya hijos listos:
    // el panel haría creer que el registro terminó).
    const pendiente = esDeOtro ? null : leerOnboarding();
    const destino = (cuentaSinc: Cuenta) =>
      pendiente ? "/wizard" : cuentaSinc.pupilos.length > 0 ? "/panel" : "/registro";

    sincronizarConServidor(base)
      .then((sinc) => {
        setCuenta(sinc);
        setCargando(false);
        router.replace(destino(sinc));
      })
      .catch(() => {
        setCargando(false);
        router.replace(destino(base));
      });
  }, [session, isPending, router, pathname]);

  // --- transiciones ---
  const irAPupilo = useCallback(
    (id: string) => {
      const p = cuenta?.pupilos.find((x) => x.id === id);
      if (!p) return;
      setEnfocadoId(id);
      router.push(rutaSegunEstado(p));
    },
    [cuenta, router]
  );

  const alRegistrar = useCallback(
    (pupilosNuevos: PerfilNino[]) => {
      setNuevos(pupilosNuevos);
      setWizIdx(0);
      // desde aquí y hasta terminar el wizard, los hijos anotados sobreviven a
      // una recarga o a que se cierre la pestaña
      guardarOnboarding({ pupilos: pupilosNuevos, idx: 0 });
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
        guardarOnboarding({ pupilos: nuevos, idx: wizIdx + 1 });
      } else {
        // se configuraron todos: el onboarding terminó
        borrarOnboarding();
        setNuevos([]);
        setWizIdx(0);
        setEnfocadoId(nuevos[0]?.id ?? actualizada.pupilos[0]?.id ?? null);
        // En el primer onboarding no hay nada que elegir: el siguiente paso
        // conocido es el diagnóstico. Con varios estudiantes, el panel deja
        // que el apoderado decida con cuál continuar.
        router.push(actualizada.pupilos.length === 1 ? "/diagnostico" : "/panel");
      }
    },
    [cuenta, wizIdx, nuevos, router]
  );

  const agregarHijo = useCallback(() => {
    setNuevos([]);
    setWizIdx(0);
    borrarOnboarding();
    router.push("/registro");
  }, [router]);

  const alTerminarDiagnostico = useCallback(
    (resultados: ResultadoMateria[]) => {
      if (!cuenta || !pupilo) return;
      const p: PerfilNino = { ...pupilo, diagnostico: {} };
      for (const r of resultados) {
        p.diagnostico![r.materia] = { nivel: r.nivel, brechas: r.brechas };
      }
      setCuenta(guardarPupilo(cuenta, p));
      router.push("/resultado");
    },
    [cuenta, pupilo, router]
  );

  const alTerminarPrueba = useCallback(
    (correctos: number, total: number) => {
      const p = pupilo;
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
    [cuenta, pupilo, foco, router]
  );

  // Al cerrar sesión no queda NADA de este apoderado en el dispositivo: ni la
  // cuenta ni un onboarding a medias (si no, el siguiente que entre se
  // encontraría configurando hijos que no son suyos).
  const alCerrarSesionAuth = useCallback(() => {
    borrarCuenta();
    borrarOnboarding();
    borrarDiagnosticoEnCurso();
    borrarFoco();
    setCuenta(null);
    setNuevos([]);
    setWizIdx(0);
    void authClient.signOut();
    router.replace("/landing");
  }, [router]);

  const alSalirModoAlumno = useCallback(() => {
    borrarSesionAlumno();
    borrarCuenta();
    borrarOnboarding();
    borrarDiagnosticoEnCurso();
    borrarFoco();
    setSesionAlumno(null);
    setCuenta(null);
    setNuevos([]);
    setWizIdx(0);
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
    borrarOnboarding();
    setCuenta(c);
    setNuevos([]);
    setWizIdx(0);
    setEnfocadoId(c.pupilos[0]?.id ?? null);
    router.push("/panel");
  }, [router]);

  const limpiarTodo = useCallback(() => {
    borrarCuenta();
    borrarOnboarding();
    borrarDiagnosticoEnCurso();
    borrarFoco();
    setCuenta(null);
    setNuevos([]);
    setWizIdx(0);
    setEnfocadoId(null);
    router.push("/registro");
  }, [router]);

  const value: AppState = {
    cuenta,
    enfocadoId,
    pupilo,
    foco,
    sesionAlumno,
    pinBloqueado,
    modoAuth,
    cargando: cargando || isPending,
    nuevos,
    wizIdx,
    onboardingListo,
    setCuenta,
    setFoco,
    enfocarPupilo: setEnfocadoId,
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
