// Acceso a la tabla `suscripciones`. Separado de suscripcion.ts (reglas
// puras) porque esto sí toca la base — server-only.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { pupilos, suscripciones } from "@/lib/db/schema";
import { DIAS_PRUEBA_GRATIS } from "./suscripcion";

export type FilaSuscripcion = typeof suscripciones.$inferSelect;

// Las familias que ya alcanzaron a registrar niños antes del modo por
// invitación conservan su prueba gratis. Una cuenta nueva, sin niños, nace
// bloqueada hasta canjear un cupón o completar un pago.
export async function obtenerOCrearSuscripcion(cuentaId: string): Promise<FilaSuscripcion> {
  const filas = await db.select().from(suscripciones).where(eq(suscripciones.cuentaId, cuentaId));
  if (filas[0]) return filas[0];

  const [pupiloExistente] = await db
    .select({ id: pupilos.id })
    .from(pupilos)
    .where(eq(pupilos.cuentaId, cuentaId))
    .limit(1);
  const tieneFamiliaExistente = !!pupiloExistente;
  const pruebaHasta = tieneFamiliaExistente
    ? new Date(Date.now() + DIAS_PRUEBA_GRATIS * 86_400_000)
    : null;
  const [nueva] = await db
    .insert(suscripciones)
    .values({
      cuentaId,
      estado: tieneFamiliaExistente ? "prueba" : "vencida",
      pruebaHasta,
    })
    .onConflictDoNothing({ target: suscripciones.cuentaId })
    .returning();

  // condición de carrera rarísima: otra petición la creó justo antes
  if (!nueva) {
    const [existente] = await db.select().from(suscripciones).where(eq(suscripciones.cuentaId, cuentaId));
    return existente;
  }
  return nueva;
}
