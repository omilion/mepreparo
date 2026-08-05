// Cancela la renovación. NO corta el acceso: periodoHasta sigue como está
// (el apoderado ya pagó ese ciclo), solo evita que el cron de facturación
// vuelva a cobrar el próximo mes. El gate (evaluarAcceso) hace el resto.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { suscripciones } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { obtenerOCrearSuscripcion } from "@/lib/pagos/repositorio";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  await obtenerOCrearSuscripcion(session.user.id); // asegura que exista la fila

  await db
    .update(suscripciones)
    .set({ estado: "cancelada", canceladaEn: new Date(), actualizadoEn: new Date() })
    .where(eq(suscripciones.cuentaId, session.user.id));

  return NextResponse.json({ ok: true });
}
