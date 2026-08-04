// Dispara el correo de "logro" al apoderado cuando un tema recién pasó a
// superado (el que más engancha, según el plan de retención). Lo llama el
// cliente en el momento exacto de la transición (ver temasSuperadosNuevos en
// acuerdo.ts), desde los tres lugares donde un tema puede superarse: prueba
// de etapa, simulacro y cierre de sesión con Rai.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable, user, apoderadoPerfil } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyStudentToken } from "@/lib/auth-student";
import { chequearLimite } from "@/lib/rateLimit";
import { enviarEmail, plantillaZen } from "@/lib/email";
import { MATERIAS, type Materia } from "@/lib/profile";
import { tituloDeTema } from "@/lib/plan/etapas";

export const runtime = "nodejs";

const MATERIAS_VALIDAS = new Set(MATERIAS.map((m) => m.id));
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";

export async function POST(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "pupilo-logro", max: 20, ventanaMs: 60_000 });
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
  if (!cuentaId) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { pupiloId?: string; tema?: string; materia?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const pupiloId = pupiloDelToken || body.pupiloId;
  const materia = body.materia;
  const tema = (body.tema || "").trim().slice(0, 60);
  if (!pupiloId || !tema || !materia || !MATERIAS_VALIDAS.has(materia as Materia)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // el pupilo debe ser de esta cuenta (nunca mandar el logro de otro niño)
  const filas = await db
    .select({ nombre: pupilosTable.nombre })
    .from(pupilosTable)
    .where(and(eq(pupilosTable.id, pupiloId), eq(pupilosTable.cuentaId, cuentaId)))
    .limit(1);
  if (filas.length === 0) return NextResponse.json({ ok: false }, { status: 404 });
  const nombreNino = filas[0].nombre;

  const [cuenta] = await db
    .select({ email: user.email, alertaLogro: apoderadoPerfil.alertaLogro })
    .from(user)
    .leftJoin(apoderadoPerfil, eq(apoderadoPerfil.userId, user.id))
    .where(eq(user.id, cuentaId))
    .limit(1);

  // sin fila en apoderado_perfil todavía = preferencia por defecto (activa)
  if (!cuenta?.email || cuenta.alertaLogro === false) {
    return NextResponse.json({ ok: true, enviado: false });
  }

  const materiaLabel = MATERIAS.find((m) => m.id === materia)?.label ?? materia;
  const temaLabel = tituloDeTema(tema);
  const html = plantillaZen({
    titulo: `¡${nombreNino} superó ${temaLabel}!`,
    cuerpoHtml:
      `<p>Buenas noticias: <strong>${nombreNino}</strong> acaba de superar la etapa de ` +
      `<strong>${temaLabel}</strong> en ${materiaLabel}.</p>` +
      `<p>Puedes ver el detalle de su avance en cualquier momento en tu panel.</p>`,
    cta: { texto: "Ver el avance", url: `${APP_URL}/panel` },
    piePagina:
      `Recibiste este correo porque tienes activas las alertas de logro. ` +
      `Puedes apagarlas en Mi Cuenta.`,
  });

  const resultado = await enviarEmail({
    para: cuenta.email,
    asunto: `¡${nombreNino} superó ${temaLabel}!`,
    html,
  });

  return NextResponse.json({ ok: true, enviado: resultado.ok });
}
