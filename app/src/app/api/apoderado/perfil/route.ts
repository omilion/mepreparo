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

  const datos = {
    telefono: body.telefono?.trim() || null,
    rut: body.rut ? formatearRut(body.rut) : null,
    relacion: body.relacion || null,
    comuna: body.comuna?.trim() || null,
    region: body.region?.trim() || null,
    // el consentimiento se sella con la fecha del servidor (no confiamos en el cliente)
    consentimientoAt: body.consentimientoVersion ? new Date() : null,
    consentimientoVersion: body.consentimientoVersion || null,
    perfilCompleto: !!(body.telefono && body.rut && body.comuna),
    actualizadoEn: new Date(),
  };

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
