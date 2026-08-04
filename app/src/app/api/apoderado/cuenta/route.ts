import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Derecho de CANCELACIÓN (Ley 21.719): borra la cuenta del apoderado y TODO lo
// asociado. El schema ya tiene onDelete:"cascade" en session, account,
// apoderadoPerfil, pupilos, y desde pupilos en sesiones/eventos — borrar la fila
// de `user` arrastra todo lo demás. No queda rastro.
//
// Requiere confirmación explícita en el body (no un GET/DELETE sin cuerpo) para
// que un enlace o CSRF accidental no pueda gatillar el borrado.
export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { confirmacion?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (body.confirmacion !== "ELIMINAR") {
    return NextResponse.json(
      { error: "Falta la confirmación explícita" },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  try {
    await db.delete(user).where(eq(user.id, userId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error eliminando cuenta:", err);
    return NextResponse.json(
      { error: "No se pudo eliminar la cuenta" },
      { status: 500 }
    );
  }
}
