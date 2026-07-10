import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateStudentToken, hashPin } from "@/lib/auth-student";

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

    let finalContexto = pupilo.contexto as Record<string, unknown>;
    // ¿el niño quedará protegido con PIN? (para informar al padre, sin exponer el PIN)
    let tienePin = !!finalContexto.pinHash;

    // 2. Si el apoderado define/actualiza el PIN, guardamos SOLO su hash.
    //    El PIN en texto plano nunca se persiste ni se devuelve.
    if (pin !== undefined) {
      if (pin !== "" && !/^\d{3}$/.test(pin)) {
        return NextResponse.json(
          { error: "El PIN debe tener exactamente 3 dígitos numéricos" },
          { status: 400 }
        );
      }

      // pin vacío = quitar la protección; pin válido = guardar su hash
      const { pin: _legacyPlano, ...resto } = finalContexto; // limpia PIN plano legado
      finalContexto = pin
        ? { ...resto, pinHash: hashPin(pin, pupiloId) }
        : { ...resto, pinHash: undefined };
      tienePin = !!pin;

      await db
        .update(pupilosTable)
        .set({ contexto: finalContexto, updatedAt: new Date() })
        .where(eq(pupilosTable.id, pupiloId));
    }

    // 3. Generar token firmado
    const token = generateStudentToken(userId, pupiloId);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
    const loginUrl = `${appUrl}/alumno/login?token=${token}`;

    // Nunca devolvemos el PIN; solo si el acceso queda protegido por PIN.
    return NextResponse.json({ ok: true, token, tienePin, loginUrl });
  } catch (err) {
    console.error("Error en /api/alumno/token:", err);
    return NextResponse.json({ error: "Fallo en la base de datos" }, { status: 500 });
  }
}
