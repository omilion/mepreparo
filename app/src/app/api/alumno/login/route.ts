import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyStudentToken } from "@/lib/auth-student";
import type { PerfilNino } from "@/lib/profile";

export async function POST(req: NextRequest) {
  let body: { token: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { token } = body;
  if (!token) {
    return NextResponse.json({ error: "Falta token" }, { status: 400 });
  }

  const payload = verifyStudentToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
  }

  try {
    const [p] = await db
      .select()
      .from(pupilosTable)
      .where(eq(pupilosTable.id, payload.pupiloId));

    if (!p) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }

    // el contexto puede tener el hash del PIN: NUNCA sale al cliente
    const contextoBruto = (p.contexto ?? {}) as Record<string, unknown>;
    const { pinHash: _h, pin: _p, ...contextoSeguro } = contextoBruto;
    const tienePin = !!contextoBruto.pinHash;

    const perfil: PerfilNino = {
      id: p.id,
      nombre: p.nombre,
      curso: p.curso as any,
      examen: {
        fecha: p.examenFecha,
        materias: p.examenMaterias as any[],
      },
      disponibilidad: {
        horasSemana: p.horasSemana,
      },
      contexto: contextoSeguro as any,
      diagnostico: (p.diagnostico || undefined) as any,
      tutoria: (p.tutoria || undefined) as any,
      creadoEn: p.creadoEn.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };

    // tienePin le dice al cliente si debe mostrar la pantalla de PIN (sin revelarlo)
    return NextResponse.json({
      ok: true,
      perfil,
      cuentaId: payload.cuentaId,
      tienePin,
      token,
    });
  } catch (err) {
    console.error("Error en /api/alumno/login:", err);
    return NextResponse.json({ error: "Fallo en la base de datos" }, { status: 500 });
  }
}
