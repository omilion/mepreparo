// Recibe eventos de fallo que SOLO el cliente puede ver: que no hubo conexión
// con el tutor, que una actividad prometida no llegó, que el freno tuvo que
// suprimir un juego repetido. El servidor no se entera de esos por sí solo.
//
// No acepta nada que venga como texto libre: el tipo tiene que estar en el
// catálogo y `meta` pasa por el saneador (ver lib/telemetria). Es deliberado:
// esta ruta la llama un navegador, así que hay que asumir que puede mandar
// cualquier cosa.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyStudentToken } from "@/lib/auth-student";
import { chequearLimite } from "@/lib/rateLimit";
import { esTipoValido, registrarEvento } from "@/lib/telemetria";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Generoso pero acotado: una clase con problemas de red puede emitir varios.
  const limite = chequearLimite(req, { clave: "eventos", max: 60, ventanaMs: 60_000 });
  if (limite) return limite;

  let cuentaId: string | null = null;
  let pupiloDelToken: string | null = null;

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    cuentaId = session.user.id;
  } else {
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const payload = verifyStudentToken(authHeader.substring(7));
      if (payload) {
        cuentaId = payload.cuentaId;
        pupiloDelToken = payload.pupiloId;
      }
    }
  }

  // Sin identificar no se registra nada: no queremos un buzón abierto.
  if (!cuentaId) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { tipo?: string; pupiloId?: string; materia?: string; meta?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.tipo || !esTipoValido(body.tipo)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // El pupilo se acepta solo si es de esta cuenta. Si no, se guarda el evento
  // igual (el fallo ocurrió) pero sin atribuírselo a un niño ajeno.
  let pupiloId: string | null = null;
  if (pupiloDelToken) {
    pupiloId = pupiloDelToken; // el token del alumno ya dice quién es
  } else if (body.pupiloId) {
    const suyo = await db
      .select({ id: pupilosTable.id })
      .from(pupilosTable)
      .where(and(eq(pupilosTable.id, body.pupiloId), eq(pupilosTable.cuentaId, cuentaId)))
      .limit(1);
    if (suyo.length > 0) pupiloId = body.pupiloId;
  }

  await registrarEvento({
    tipo: body.tipo,
    origen: "cliente",
    cuentaId,
    pupiloId,
    materia: body.materia ?? null,
    meta: body.meta,
  });

  return NextResponse.json({ ok: true });
}
