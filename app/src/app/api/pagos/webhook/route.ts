// Confirmación de Flow (urlConfirmation). Flow manda SOLO `token` por POST
// form-encoded — nunca confiamos en eso solo: se vuelve a consultar el
// estado real contra la API de Flow antes de activar nada. Sin esto,
// cualquiera podría llamar esta URL con un token viejo y "pagar gratis".
//
// Responde 200 siempre que procesó algo razonable: Flow reintenta si no
// recibe 200, y un 500 por un token ya viejo generaría reintentos infinitos.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { suscripciones, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { consultarEstadoPago } from "@/lib/pagos/flow";
import { enviarEmail, plantillaZen } from "@/lib/email";
import { clp } from "@/lib/precios";

const DIAS_PERIODO = 30;

export async function POST(req: NextRequest) {
  let token: string | null = null;
  try {
    const form = await req.formData();
    token = String(form.get("token") || "");
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!token) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const estado = await consultarEstadoPago(token);

    const [fila] = await db
      .select()
      .from(suscripciones)
      .where(eq(suscripciones.flowOrdenComercio, estado.commerceOrder));
    if (!fila) {
      // orden de otra instancia/ambiente, o ya limpiada: no es un error nuestro
      return NextResponse.json({ ok: true });
    }

    if (estado.status === 2) {
      // pagada
      const periodoHasta = new Date(Date.now() + DIAS_PERIODO * 86_400_000);
      await db
        .update(suscripciones)
        .set({ estado: "activa", periodoHasta, ultimoPagoEn: new Date(), actualizadoEn: new Date() })
        .where(eq(suscripciones.cuentaId, fila.cuentaId));

      const [cuenta] = await db.select({ email: user.email, nombre: user.name }).from(user).where(eq(user.id, fila.cuentaId));
      if (cuenta?.email) {
        const html = plantillaZen({
          titulo: "Recibimos tu pago",
          cuerpoHtml:
            `<p>Hola ${cuenta.nombre || ""},</p>` +
            `<p>Confirmamos tu pago de <strong>${clp(estado.amount)}</strong> por la suscripción mensual de mepreparo.</p>` +
            `<p>Tu acceso queda activo hasta el ${periodoHasta.toLocaleDateString("es-CL")}.</p>`,
          piePagina: "Este es tu recibo. Guárdalo para tus registros.",
        });
        await enviarEmail({ para: cuenta.email, asunto: "Recibo de pago — mepreparo", html });
      }
    } else if (estado.status === 3 || estado.status === 4) {
      // rechazada o anulada: no tocamos el estado actual (sigue en prueba/activa
      // según corresponda); solo no se activa nada nuevo.
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error procesando webhook de Flow:", err);
    // 200 igual: un fallo nuestro no debe hacer que Flow reintente infinito
    // un token que de todas formas no vamos a poder validar mejor después.
    return NextResponse.json({ ok: false });
  }
}
