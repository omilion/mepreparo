// Acceso a la tabla `suscripciones`. Separado de suscripcion.ts (reglas
// puras) porque esto sí toca la base — server-only.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { suscripciones } from "@/lib/db/schema";
import { DIAS_PRUEBA_GRATIS } from "./suscripcion";

export type FilaSuscripcion = typeof suscripciones.$inferSelect;

// Toda cuenta nueva entra en período de prueba desde que se consulta por
// primera vez (lazy init: no depende de engancharse al flujo de signup).
export async function obtenerOCrearSuscripcion(cuentaId: string): Promise<FilaSuscripcion> {
  const filas = await db.select().from(suscripciones).where(eq(suscripciones.cuentaId, cuentaId));
  if (filas[0]) return filas[0];

  const pruebaHasta = new Date(Date.now() + DIAS_PRUEBA_GRATIS * 86_400_000);
  const [nueva] = await db
    .insert(suscripciones)
    .values({ cuentaId, estado: "prueba", pruebaHasta })
    .onConflictDoNothing({ target: suscripciones.cuentaId })
    .returning();

  // condición de carrera rarísima: otra petición la creó justo antes
  if (!nueva) {
    const [existente] = await db.select().from(suscripciones).where(eq(suscripciones.cuentaId, cuentaId));
    return existente;
  }
  return nueva;
}
