// Reglas de acceso de la suscripción — puras, sin tocar red ni base, para
// poder testearlas sin credenciales de Flow. Los flujos con Flow (Fase 4.3)
// solo escriben estos mismos 4 estados; esto decide qué significan.

export type EstadoSuscripcion = "prueba" | "activa" | "vencida" | "cancelada";

export const DIAS_PRUEBA_GRATIS = 14;

export interface DatosSuscripcion {
  estado: EstadoSuscripcion;
  pruebaHasta: Date | null;
  periodoHasta: Date | null;
}

export type MotivoAcceso =
  | "prueba_vigente"
  | "activa"
  | "cancelada_con_acceso" // canceló, pero el período que pagó no ha terminado
  | "vencida";

export interface Acceso {
  bloqueado: boolean;
  motivo: MotivoAcceso;
  diasRestantes: number | null; // hasta que se acabe el acceso actual
}

function diasHasta(fecha: Date | null, ahora: Date): number | null {
  if (!fecha) return null;
  return Math.ceil((fecha.getTime() - ahora.getTime()) / 86_400_000);
}

// Bloqueo SUAVE: esta función decide si una NUEVA sesión puede empezar. No
// tiene forma de (ni debe) cortar una conversación ya en curso — eso lo
// garantiza dónde se llama (al aterrizar/arrancar, no dentro del tutor).
export function evaluarAcceso(sub: DatosSuscripcion, ahora = new Date()): Acceso {
  const t = ahora.getTime();

  if (sub.estado === "prueba") {
    const vigente = !sub.pruebaHasta || sub.pruebaHasta.getTime() > t;
    return {
      bloqueado: !vigente,
      motivo: vigente ? "prueba_vigente" : "vencida",
      diasRestantes: diasHasta(sub.pruebaHasta, ahora),
    };
  }

  if (sub.estado === "activa") {
    const vigente = !sub.periodoHasta || sub.periodoHasta.getTime() > t;
    return {
      bloqueado: !vigente,
      motivo: vigente ? "activa" : "vencida",
      diasRestantes: diasHasta(sub.periodoHasta, ahora),
    };
  }

  if (sub.estado === "cancelada") {
    // CA explícito: al cancelar, mantiene acceso hasta el fin del período pagado
    const vigente = !!sub.periodoHasta && sub.periodoHasta.getTime() > t;
    return {
      bloqueado: !vigente,
      motivo: vigente ? "cancelada_con_acceso" : "vencida",
      diasRestantes: diasHasta(sub.periodoHasta, ahora),
    };
  }

  // 'vencida'
  return { bloqueado: true, motivo: "vencida", diasRestantes: diasHasta(sub.periodoHasta, ahora) };
}
