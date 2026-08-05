// Inicia el checkout: crea una orden en Flow y devuelve la URL de pago a la
// que el navegador debe redirigir. Sin credenciales de Flow, responde con
// disponible:false para que la UI muestre un aviso en vez de romperse.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable, suscripciones } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { crearOrdenPago, tieneClaveFlow } from "@/lib/pagos/flow";
import { calcularPrecio } from "@/lib/precios";
import { chequearLimite } from "@/lib/rateLimit";
import { crearId } from "@/lib/profile";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";

export async function POST(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "pagos-crear", max: 10, ventanaMs: 60_000 });
  if (limite) return limite;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!tieneClaveFlow()) {
    return NextResponse.json({ disponible: false, error: "Los pagos aún no están habilitados." });
  }

  const hijos = await db
    .select({ id: pupilosTable.id })
    .from(pupilosTable)
    .where(eq(pupilosTable.cuentaId, session.user.id));
  const precio = calcularPrecio(Math.max(1, hijos.length), false);

  const commerceOrder = `mp_${crearId()}`;

  try {
    const orden = await crearOrdenPago({
      commerceOrder,
      subject: `mepreparo · suscripción mensual (${hijos.length || 1} estudiante${hijos.length === 1 ? "" : "s"})`,
      amountClp: precio.mensualEfectivo,
      email: session.user.email,
      urlConfirmation: `${APP_URL}/api/pagos/webhook`,
      urlReturn: `${APP_URL}/cuenta`,
    });

    await db
      .insert(suscripciones)
      .values({
        cuentaId: session.user.id,
        estado: "prueba",
        flowOrdenComercio: commerceOrder,
        flowToken: orden.token,
      })
      .onConflictDoUpdate({
        target: suscripciones.cuentaId,
        set: { flowOrdenComercio: commerceOrder, flowToken: orden.token, actualizadoEn: new Date() },
      });

    return NextResponse.json({ disponible: true, url: `${orden.url}?token=${orden.token}` });
  } catch (err) {
    console.error("Error creando orden de pago en Flow:", err);
    return NextResponse.json({ disponible: false, error: "No se pudo iniciar el pago. Intenta de nuevo." });
  }
}
