import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { leads } from "@/lib/db/schema";
import { crearId } from "@/lib/profile";

// Captura el email del APODERADO antes de la demo (para remarketing). No crea
// cuenta ni sesión; solo guarda un lead. No requiere auth.
export async function POST(req: NextRequest) {
  let body: { email?: string; nombreNino?: string; aceptaContacto?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  // validación básica de email (no bloqueamos la demo por formato raro,
  // pero exigimos algo con @ para que el lead sirva)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Correo no válido" }, { status: 400 });
  }

  try {
    await db.insert(leads).values({
      id: crearId(),
      email,
      nombreNino: body.nombreNino?.trim() || null,
      origen: "demo",
      aceptaContacto: body.aceptaContacto ?? true,
    });
  } catch (err) {
    // no bloqueamos la demo si el guardado del lead falla
    console.error("No se pudo guardar el lead de la demo:", err);
  }

  return NextResponse.json({ ok: true });
}
