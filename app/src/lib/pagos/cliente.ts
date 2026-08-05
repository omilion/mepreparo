"use client";

// Consulta rápida del gate de acceso, para el arranque de la app (Fase 4.3).
// Fail-open a propósito: un error de red NUNCA debe bloquear a una familia
// que sí pagó, solo porque la consulta falló.
export async function accesoBloqueado(bearerToken?: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (bearerToken) headers["Authorization"] = `Bearer ${bearerToken}`;
    const res = await fetch("/api/pagos/estado", { headers });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.bloqueado;
  } catch {
    return false;
  }
}
