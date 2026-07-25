// Persistencia local de la CUENTA del apoderado (Fase de sesión).
// Una cuenta por dispositivo (el apoderado dueño). Contiene sus pupilos.
// Hoy usa localStorage; la API está aislada para migrar a IndexedDB/Supabase
// (sincronización entre dispositivos) sin tocar las pantallas.

import type { Cuenta, Materia, PerfilNino } from "./profile";
import type { ResultadoMateria } from "./diagnostico/tipos";

const KEY = "mp-cuenta";
const ALUMNO_KEY = "mp-alumno-sesion";
const ONBOARDING_KEY = "mp-onboarding";
const DIAGNOSTICO_KEY = "mp-diagnostico-en-curso";
const FOCO_KEY = "mp-foco";

export interface SesionAlumno {
  token: string;
  cuentaId: string;
  pupiloId: string;
  nombre: string;
  // ¿el acceso está protegido por PIN? El PIN en sí NUNCA se guarda en el
  // cliente: se verifica contra el servidor con el token.
  tienePin?: boolean;
}

export function leerSesionAlumno(): SesionAlumno | null {
  if (!disponible()) return null;
  try {
    const raw = window.localStorage.getItem(ALUMNO_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SesionAlumno;
  } catch {
    return null;
  }
}

export function guardarSesionAlumno(sesion: SesionAlumno): void {
  if (!disponible()) return;
  window.localStorage.setItem(ALUMNO_KEY, JSON.stringify(sesion));
}

export function borrarSesionAlumno(): void {
  if (!disponible()) return;
  window.localStorage.removeItem(ALUMNO_KEY);
}

function disponible(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

// --- Onboarding en curso (hijos anotados que aún no pasan por el wizard) ---
//
// Antes esto vivía SOLO en memoria: si el apoderado recargaba, se le iba la
// señal o cerraba la pestaña a mitad del wizard, los hijos pendientes
// desaparecían sin aviso (y con varios hijos, el arranque lo mandaba al panel
// como si hubiera terminado). Lo persistimos hasta que el wizard se completa.

export interface OnboardingPendiente {
  pupilos: PerfilNino[]; // los perfiles anotados en /registro, en orden
  idx: number; // en cuál va el wizard
}

export function leerOnboarding(): OnboardingPendiente | null {
  if (!disponible()) return null;
  try {
    const raw = window.localStorage.getItem(ONBOARDING_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as OnboardingPendiente;
    if (!data || !Array.isArray(data.pupilos) || data.pupilos.length === 0) return null;
    // idx fuera de rango = onboarding ya terminado o corrupto
    if (typeof data.idx !== "number" || data.idx < 0 || data.idx >= data.pupilos.length) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function guardarOnboarding(pendiente: OnboardingPendiente): void {
  if (!disponible()) return;
  window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(pendiente));
}

export function borrarOnboarding(): void {
  if (!disponible()) return;
  window.localStorage.removeItem(ONBOARDING_KEY);
}

// --- Diagnóstico a medias y etapa enfocada (SIEMPRE atados a un niño) ---
//
// Los dos guardan `pupiloId` y se leen pidiendo ese id: si el guardado no es del
// niño que está estudiando ahora, se ignora. En una familia con dos hijas en la
// misma tablet, un progreso que se filtre de una a otra es peor que perderlo.

interface DiagnosticoEnCurso {
  pupiloId: string;
  hechas: Record<string, ResultadoMateria>;
}

// Materias ya rendidas del diagnóstico. Vivían solo en memoria: si el niño
// completaba 3 de 5 y se recargaba, volvía a empezar de cero.
export function leerDiagnosticoEnCurso(
  pupiloId: string
): Record<string, ResultadoMateria> | null {
  if (!disponible()) return null;
  try {
    const raw = window.localStorage.getItem(DIAGNOSTICO_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as DiagnosticoEnCurso;
    if (!data || data.pupiloId !== pupiloId) return null;
    if (!data.hechas || typeof data.hechas !== "object") return null;
    return data.hechas;
  } catch {
    return null;
  }
}

export function guardarDiagnosticoEnCurso(
  pupiloId: string,
  hechas: Record<string, ResultadoMateria>
): void {
  if (!disponible()) return;
  window.localStorage.setItem(
    DIAGNOSTICO_KEY,
    JSON.stringify({ pupiloId, hechas } satisfies DiagnosticoEnCurso)
  );
}

export function borrarDiagnosticoEnCurso(): void {
  if (!disponible()) return;
  window.localStorage.removeItem(DIAGNOSTICO_KEY);
}

// La etapa que el niño eligió en el mapa (materia + tema). Sobrevive a una
// recarga para que al volver a entrar la clase siga siendo la que pidió.
interface FocoGuardado {
  pupiloId: string;
  materia: Materia;
  tema: string;
}

export function leerFoco(pupiloId: string): { materia: Materia; tema: string } | null {
  if (!disponible()) return null;
  try {
    const raw = window.localStorage.getItem(FOCO_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as FocoGuardado;
    if (!data || data.pupiloId !== pupiloId) return null;
    if (!data.materia || !data.tema) return null;
    return { materia: data.materia, tema: data.tema };
  } catch {
    return null;
  }
}

export function guardarFoco(
  pupiloId: string,
  foco: { materia: Materia; tema: string }
): void {
  if (!disponible()) return;
  window.localStorage.setItem(
    FOCO_KEY,
    JSON.stringify({ pupiloId, ...foco } satisfies FocoGuardado)
  );
}

export function borrarFoco(): void {
  if (!disponible()) return;
  window.localStorage.removeItem(FOCO_KEY);
}

// --- Cuenta completa ---

export function leerCuenta(): Cuenta | null {
  if (!disponible()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Cuenta;
    if (!data || !Array.isArray(data.pupilos)) return null;
    return data;
  } catch {
    return null;
  }
}

export function guardarCuenta(cuenta: Cuenta): void {
  if (!disponible()) return;
  window.localStorage.setItem(KEY, JSON.stringify(cuenta));
}

export function borrarCuenta(): void {
  if (!disponible()) return;
  window.localStorage.removeItem(KEY);
}

// Sincroniza la lista local de pupilos con la base de datos Postgres del servidor
export async function sincronizarConServidor(cuenta: Cuenta): Promise<Cuenta> {
  if (!disponible()) return cuenta;
  try {
    const headersInit: Record<string, string> = { "Content-Type": "application/json" };
    
    // Si estamos en sesión de alumno, añadir el token en el Header
    const sesionAlumno = leerSesionAlumno();
    if (sesionAlumno?.token) {
      headersInit["Authorization"] = `Bearer ${sesionAlumno.token}`;
    }

    const res = await fetch("/api/sync", {
      method: "POST",
      headers: headersInit,
      body: JSON.stringify({ pupilos: cuenta.pupilos }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.pupilos)) {
        let nuevosPupilos = data.pupilos;
        
        // Si es alumno, mezclar con cuidado para no pisar hermanos en el storage local
        if (sesionAlumno?.token) {
          const actual = cuenta.pupilos;
          const nuevos = data.pupilos as PerfilNino[];
          nuevosPupilos = actual.map((p) => {
            const upd = nuevos.find((n) => n.id === p.id);
            return upd ? upd : p;
          });
        }
        
        const cuentaActualizada = { ...cuenta, pupilos: nuevosPupilos };
        guardarCuenta(cuentaActualizada);
        
        // Notificar a las pantallas que se completó una sincronización de fondo
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("sync-completed"));
        }
        return cuentaActualizada;
      }
    }
  } catch (err) {
    console.warn("Sincronización en segundo plano falló (modo offline activo):", err);
  }
  return cuenta;
}

// --- Pupilos (siempre dentro de la cuenta) ---

// Inserta o actualiza un pupilo en la cuenta y persiste. Devuelve la cuenta nueva.
export function guardarPupilo(cuenta: Cuenta, pupilo: PerfilNino): Cuenta {
  const pupiloConTimestamp: PerfilNino = {
    ...pupilo,
    updatedAt: new Date().toISOString(),
  };
  const pupilos = [...cuenta.pupilos];
  const i = pupilos.findIndex((p) => p.id === pupilo.id);
  if (i >= 0) pupilos[i] = pupiloConTimestamp;
  else pupilos.push(pupiloConTimestamp);
  const nueva: Cuenta = { ...cuenta, pupilos };
  guardarCuenta(nueva);

  // Ejecutar sincronización en segundo plano sin retrasar el render local
  if (typeof window !== "undefined") {
    setTimeout(() => {
      sincronizarConServidor(nueva).catch(console.error);
    }, 10);
  }

  return nueva;
}

export function eliminarPupilo(cuenta: Cuenta, id: string): Cuenta {
  const nueva: Cuenta = {
    ...cuenta,
    pupilos: cuenta.pupilos.filter((p) => p.id !== id),
  };
  guardarCuenta(nueva);

  if (typeof window !== "undefined") {
    setTimeout(() => {
      sincronizarConServidor(nueva).catch(console.error);
    }, 10);
  }

  return nueva;
}
