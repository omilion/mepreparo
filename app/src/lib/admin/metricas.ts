// Métricas de negocio para el panel de operación: retención, embudo de
// onboarding y costo real (Fase 4.2 del plan de cierre). Server-only.

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { eventos, pupilos, sesiones, user } from "@/lib/db/schema";
import { costoClp } from "@/lib/costoGemini";

export interface Retencion {
  cohorteN: number; // apoderados que se registraron hace 7-14 días
  retenidosN: number; // de esos, cuántos tuvieron una sesión en los últimos 7 días
  porcentaje: number; // 0-100
}

// "¿Cuánta gente vuelve la segunda semana?" — cohorte de quienes se
// registraron hace 7-14 días; retenido = tuvo al menos una sesión de estudio
// en su segunda semana (los últimos 7 días).
export async function retencionSemanal(): Promise<Retencion> {
  try {
    const cohorte = await db
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          eq(user.rol, "apoderado"),
          sql`${user.createdAt} between now() - interval '14 days' and now() - interval '7 days'`
        )
      );
    const cohorteIds = cohorte.map((c) => c.id);
    if (cohorteIds.length === 0) return { cohorteN: 0, retenidosN: 0, porcentaje: 0 };

    const retenidos = await db
      .selectDistinct({ cuentaId: sesiones.cuentaId })
      .from(sesiones)
      .where(and(inArray(sesiones.cuentaId, cohorteIds), gte(sesiones.fecha, sql`now() - interval '7 days'`)));

    const cohorteN = cohorteIds.length;
    const retenidosN = retenidos.length;
    return { cohorteN, retenidosN, porcentaje: Math.round((retenidosN / cohorteN) * 100) };
  } catch {
    return { cohorteN: 0, retenidosN: 0, porcentaje: 0 };
  }
}

export interface Embudo {
  registro: number; // cuentas de apoderado creadas
  wizard: number; // al menos un hijo configurado (fila en pupilos)
  diagnostico: number; // hijos con diagnóstico hecho
  primeraSesion: number; // hijos con al menos una sesión de estudio
}

// "¿Dónde abandonan?": registro → wizard → diagnóstico → primera sesión.
export async function embudoOnboarding(): Promise<Embudo> {
  const contar = async (consulta: Promise<{ n: number }[]>): Promise<number> => {
    try {
      return Number((await consulta)[0]?.n ?? 0);
    } catch {
      return 0;
    }
  };

  const [registro, wizard, diagnostico, primeraSesion] = await Promise.all([
    contar(db.select({ n: sql<number>`count(*)` }).from(user).where(eq(user.rol, "apoderado"))),
    contar(db.select({ n: sql<number>`count(distinct ${pupilos.cuentaId})` }).from(pupilos)),
    contar(
      db
        .select({ n: sql<number>`count(distinct ${pupilos.cuentaId})` })
        .from(pupilos)
        .where(sql`${pupilos.diagnostico} is not null`)
    ),
    contar(db.select({ n: sql<number>`count(distinct ${sesiones.pupiloId})` }).from(sesiones)),
  ]);

  return { registro, wizard, diagnostico, primeraSesion };
}

export interface CostoOperacion {
  totalClp7d: number; // costo estimado total, últimos 7 días
  sesiones7d: number;
  familiasActivas7d: number;
  costoPorSesionClp: number;
  costoPorFamiliaMesClp: number; // proyección: (costo/familia en 7d) × 4.33
}

// "¿Cuánto me cuesta un niño al mes?" — usa los eventos sesion_costo
// (Fase 4.1) para calcular el CLP real, no un supuesto.
export async function costoOperacion(): Promise<CostoOperacion> {
  try {
    const filas = await db
      .select({
        tokensIn: sql<number>`(${eventos.meta}->>'tokensIn')::int`,
        tokensOut: sql<number>`(${eventos.meta}->>'tokensOut')::int`,
        modelo: sql<string>`${eventos.meta}->>'modelo'`,
        pupiloId: eventos.pupiloId,
      })
      .from(eventos)
      .where(and(eq(eventos.tipo, "sesion_costo"), gte(eventos.creadoEn, sql`now() - interval '7 days'`)));

    const totalClp7d = filas.reduce(
      (acc, f) => acc + costoClp(f.tokensIn || 0, f.tokensOut || 0, f.modelo || ""),
      0
    );
    const familiasActivas7d = new Set(filas.map((f) => f.pupiloId).filter(Boolean)).size;

    const sesionesRows = await db
      .select({ n: sql<number>`count(*)` })
      .from(sesiones)
      .where(gte(sesiones.fecha, sql`now() - interval '7 days'`));
    const sesiones7d = Number(sesionesRows[0]?.n ?? 0);

    const costoPorSesionClp = sesiones7d > 0 ? totalClp7d / sesiones7d : 0;
    const costoPorFamiliaMesClp = familiasActivas7d > 0 ? (totalClp7d / familiasActivas7d) * 4.33 : 0;

    return { totalClp7d, sesiones7d, familiasActivas7d, costoPorSesionClp, costoPorFamiliaMesClp };
  } catch {
    return { totalClp7d: 0, sesiones7d: 0, familiasActivas7d: 0, costoPorSesionClp: 0, costoPorFamiliaMesClp: 0 };
  }
}
