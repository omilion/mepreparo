import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyStudentToken, verificarPin } from "@/lib/auth-student";

// Valida el PIN del alumno EN EL SERVIDOR. Requiere un token de alumno válido
// (que ya prueba pertenencia a la cuenta). El PIN nunca se compara en el cliente
// ni se guarda en texto plano: aquí se compara contra su hash.
export async function POST(req: NextRequest) {
  let body: { token: string; pin: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { token, pin } = body;
  if (!token || !pin) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const payload = verifyStudentToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  try {
    const [p] = await db
      .select()
      .from(pupilosTable)
      .where(eq(pupilosTable.id, payload.pupiloId));

    if (!p) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }

    const contexto = (p.contexto ?? {}) as Record<string, unknown>;
    const hash = typeof contexto.pinHash === "string" ? contexto.pinHash : "";

    // sin PIN configurado: no hay nada que verificar (acceso abierto por token)
    if (!hash) {
      return NextResponse.json({ ok: true, sinPin: true });
    }

    const ok = verificarPin(pin, payload.pupiloId, hash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "PIN incorrecto" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/alumno/verificar-pin:", err);
    return NextResponse.json({ error: "Fallo en la base de datos" }, { status: 500 });
  }
}
