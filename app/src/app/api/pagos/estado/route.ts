// Estado de la suscripción de la cuenta que pide (para Mi Cuenta y para el
// gate de acceso). Crea la fila de prueba gratis si es la primera vez.
//
// Acepta sesión de apoderado O el bearer token del alumno (mismo patrón que
// /api/eventos): un niño en "modo alumno" (tablet propia, sin cookie del
// apoderado) también necesita saber si la familia sigue con acceso.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyStudentToken } from "@/lib/auth-student";
import { obtenerOCrearSuscripcion } from "@/lib/pagos/repositorio";
import { evaluarAcceso } from "@/lib/pagos/suscripcion";
import { tieneClaveFlow } from "@/lib/pagos/flow";
import { calcularPrecio } from "@/lib/precios";

export async function GET(req: NextRequest) {
  let cuentaId: string | null = null;

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    cuentaId = session.user.id;
  } else {
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const payload = verifyStudentToken(authHeader.substring(7));
      if (payload) cuentaId = payload.cuentaId;
    }
  }
  if (!cuentaId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sub = await obtenerOCrearSuscripcion(cuentaId);
  const acceso = evaluarAcceso({
    estado: sub.estado as "prueba" | "activa" | "vencida" | "cancelada",
    pruebaHasta: sub.pruebaHasta,
    periodoHasta: sub.periodoHasta,
  });

  const hijos = await db
    .select({ id: pupilosTable.id })
    .from(pupilosTable)
    .where(eq(pupilosTable.cuentaId, cuentaId));
  const precio = calcularPrecio(Math.max(1, hijos.length), false);
  // Una cuenta nueva no puede iniciar el onboarding solo conociendo la URL:
  // necesita un cupón canjeado o un pago confirmado. Las familias que ya
  // tenían niños antes de este gate quedan expresamente preservadas.
  const requiereCupon = hijos.length === 0 && !sub.cuponId && !sub.ultimoPagoEn;

  return NextResponse.json({
    estado: sub.estado,
    ...acceso,
    bloqueado: requiereCupon || acceso.bloqueado,
    motivo: requiereCupon ? "requiere_cupon" : acceso.motivo,
    requiereCupon,
    limitePupilos: sub.limitePupilos,
    pupilosRegistrados: hijos.length,
    periodoHasta: sub.periodoHasta,
    pruebaHasta: sub.pruebaHasta,
    precioMensualClp: precio.mensualEfectivo,
    pagosDisponibles: tieneClaveFlow(),
  });
}
