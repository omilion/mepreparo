import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { apoderadoPerfil } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rutEsValido, formatearRut } from "@/lib/rut";

// Guarda / actualiza los datos extra del apoderado (teléfono, RUT, relación,
// comuna) y registra el consentimiento. Requiere sesión.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: {
    telefono?: string;
    rut?: string;
    relacion?: string;
    comuna?: string;
    region?: string;
    consentimientoVersion?: string;
    alertaSemanal?: boolean;
    alertaInactividad?: boolean;
    alertaLogro?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Si viene RUT, tiene que ser válido (identidad verificable).
  if (body.rut && !rutEsValido(body.rut)) {
    return NextResponse.json({ error: "RUT inválido" }, { status: 400 });
  }

  // Este endpoint también sirve para el switch de preferencias de alertas en
  // Mi Cuenta (llamada parcial, solo con esos 3 campos): por eso los booleanos
  // solo se tocan si vienen explícitos, sin pisar el resto del perfil.
  const datos: Record<string, unknown> = {
    actualizadoEn: new Date(),
  };
  if (body.telefono !== undefined) datos.telefono = body.telefono.trim() || null;
  if (body.rut !== undefined) datos.rut = body.rut ? formatearRut(body.rut) : null;
  if (body.relacion !== undefined) datos.relacion = body.relacion || null;
  if (body.comuna !== undefined) datos.comuna = body.comuna.trim() || null;
  if (body.region !== undefined) datos.region = body.region.trim() || null;
  if (body.consentimientoVersion !== undefined) {
    // el consentimiento se sella con la fecha del servidor (no confiamos en el cliente)
    datos.consentimientoAt = body.consentimientoVersion ? new Date() : null;
    datos.consentimientoVersion = body.consentimientoVersion || null;
  }
  if (body.alertaSemanal !== undefined) datos.alertaSemanal = !!body.alertaSemanal;
  if (body.alertaInactividad !== undefined) datos.alertaInactividad = !!body.alertaInactividad;
  if (body.alertaLogro !== undefined) datos.alertaLogro = !!body.alertaLogro;
  if (body.telefono !== undefined || body.rut !== undefined || body.comuna !== undefined) {
    datos.perfilCompleto = !!(body.telefono && body.rut && body.comuna);
  }

  try {
    await db
      .insert(apoderadoPerfil)
      .values({ userId, ...datos })
      .onConflictDoUpdate({ target: apoderadoPerfil.userId, set: datos });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error al guardar perfil de apoderado:", err);
    return NextResponse.json({ error: "Fallo en la base de datos" }, { status: 500 });
  }
}

// Devuelve el perfil del apoderado (para precargar "Mi cuenta").
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rows = await db
    .select()
    .from(apoderadoPerfil)
    .where(eq(apoderadoPerfil.userId, session.user.id));
  return NextResponse.json({ perfil: rows[0] ?? null });
}
