import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateStudentToken } from "@/lib/auth-student";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  let body: { pupiloId: string; pin?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { pupiloId, pin } = body;
  if (!pupiloId) {
    return NextResponse.json({ error: "Falta pupiloId" }, { status: 400 });
  }

  try {
    // 1. Buscar al estudiante y comprobar que pertenezca al apoderado
    const [pupilo] = await db
      .select()
      .from(pupilosTable)
      .where(eq(pupilosTable.id, pupiloId));

    if (!pupilo) {
      return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
    }

    if (pupilo.cuentaId !== userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    let finalContexto = pupilo.contexto as any;

    // 2. Si se proporciona PIN, validarlo y actualizar el campo contexto.pin
    if (pin !== undefined) {
      if (pin !== "" && !/^\d{3}$/.test(pin)) {
        return NextResponse.json(
          { error: "El PIN debe tener exactamente 3 dígitos numéricos" },
          { status: 400 }
        );
      }
      
      finalContexto = {
        ...finalContexto,
        pin: pin || undefined,
      };

      await db
        .update(pupilosTable)
        .set({
          contexto: finalContexto,
          updatedAt: new Date(),
        })
        .where(eq(pupilosTable.id, pupiloId));
    }

    // 3. Generar token firmado
    const token = generateStudentToken(userId, pupiloId);
    
    // Obtener la URL base de la aplicación
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const loginUrl = `${appUrl}/alumno/login?token=${token}`;

    return NextResponse.json({
      ok: true,
      token,
      pin: finalContexto.pin || null,
      loginUrl,
    });
  } catch (err) {
    console.error("Error en /api/alumno/token:", err);
    return NextResponse.json({ error: "Fallo en la base de datos" }, { status: 500 });
  }
}
