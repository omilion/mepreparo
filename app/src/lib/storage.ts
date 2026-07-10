// Persistencia local de la CUENTA del apoderado (Fase de sesión).
// Una cuenta por dispositivo (el apoderado dueño). Contiene sus pupilos.
// Hoy usa localStorage; la API está aislada para migrar a IndexedDB/Supabase
// (sincronización entre dispositivos) sin tocar las pantallas.

import type { Cuenta, PerfilNino } from "./profile";

const KEY = "mp-cuenta";
const ALUMNO_KEY = "mp-alumno-sesion";

export interface SesionAlumno {
  token: string;
  cuentaId: string;
  pupiloId: string;
  nombre: string;
  pin?: string;
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
