// Mantenimiento diario de suscripciones (protegido por CRON_SECRET, igual
// que /api/cron/alertas — mismo secreto, mismo cron del sistema):
//
// 1. Marca "vencida" cualquier suscripción activa/cancelada cuyo período ya
//    terminó (así el estado en la base no miente, aunque nadie haya vuelto
//    a entrar a la app).
// 2. Recuerda por email renovar a quienes siguen activos (NO cancelaron) y
//    están a 3 días o menos de que se les acabe el período.
//
// NO cobra automáticamente: la API básica de pago de Flow no guarda la
// tarjeta para cargos recurrentes sin verificar antes su API específica de
// suscripciones (ver flow.ts). Renovar es un clic del apoderado sobre el
// link del correo, que reusa POST /api/pagos/crear.

import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { suscripciones, user } from "@/lib/db/schema";
import { enviarEmail, plantillaZen } from "@/lib/email";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";

function autorizado(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const deHeader = req.headers.get("x-cron-secret");
  const deQuery = new URL(req.url).searchParams.get("secret");
  return deHeader === secreto || deQuery === secreto;
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // 1) vencer lo que corresponda
  const vencidas = await db
    .update(suscripciones)
    .set({ estado: "vencida", actualizadoEn: new Date() })
    .where(
      and(
        inArray(suscripciones.estado, ["activa", "cancelada"]),
        lte(suscripciones.periodoHasta, sql`now()`)
      )
    )
    .returning({ cuentaId: suscripciones.cuentaId });

  // 2) recordar renovación a quienes siguen activos y les queda poco
  const porVencer = await db
    .select({ cuentaId: suscripciones.cuentaId, periodoHasta: suscripciones.periodoHasta, email: user.email, nombre: user.name })
    .from(suscripciones)
    .innerJoin(user, eq(user.id, suscripciones.cuentaId))
    .where(
      and(
        eq(suscripciones.estado, "activa"),
        lte(suscripciones.periodoHasta, sql`now() + interval '3 days'`)
      )
    );

  let recordatoriosEnviados = 0;
  for (const p of porVencer) {
    if (!p.email || !p.periodoHasta) continue;
    const html = plantillaZen({
      titulo: "Tu suscripción está por vencer",
      cuerpoHtml:
        `<p>Hola ${p.nombre || ""},</p>` +
        `<p>Tu suscripción a mepreparo vence el ${p.periodoHasta.toLocaleDateString("es-CL")}. ` +
        `Renueva para que tus hijos no pierdan acceso.</p>`,
      cta: { texto: "Renovar ahora", url: `${APP_URL}/cuenta` },
    });
    const r = await enviarEmail({ para: p.email, asunto: "Tu suscripción a mepreparo está por vencer", html });
    if (r.ok) recordatoriosEnviados++;
  }

  return NextResponse.json({
    ok: true,
    marcadasVencidas: vencidas.length,
    recordatoriosEnviados,
  });
}
