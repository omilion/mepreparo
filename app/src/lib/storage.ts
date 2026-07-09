// Persistencia local de la CUENTA del apoderado (Fase de sesión).
// Una cuenta por dispositivo (el apoderado dueño). Contiene sus pupilos.
// Hoy usa localStorage; la API está aislada para migrar a IndexedDB/Supabase
// (sincronización entre dispositivos) sin tocar las pantallas.

import type { Cuenta, PerfilNino } from "./profile";

const KEY = "mp-cuenta";

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

// --- Pupilos (siempre dentro de la cuenta) ---

// Inserta o actualiza un pupilo en la cuenta y persiste. Devuelve la cuenta nueva.
export function guardarPupilo(cuenta: Cuenta, pupilo: PerfilNino): Cuenta {
  const pupilos = [...cuenta.pupilos];
  const i = pupilos.findIndex((p) => p.id === pupilo.id);
  if (i >= 0) pupilos[i] = pupilo;
  else pupilos.push(pupilo);
  const nueva: Cuenta = { ...cuenta, pupilos };
  guardarCuenta(nueva);
  return nueva;
}

export function eliminarPupilo(cuenta: Cuenta, id: string): Cuenta {
  const nueva: Cuenta = {
    ...cuenta,
    pupilos: cuenta.pupilos.filter((p) => p.id !== id),
  };
  guardarCuenta(nueva);
  return nueva;
}
