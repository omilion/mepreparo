import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable, sesiones as sesionesTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { PerfilNino } from "@/lib/profile";
import { verifyStudentToken } from "@/lib/auth-student";

export async function POST(req: NextRequest) {
  let userId: string;
  let isStudentMode = false;
  let studentPupiloId: string | null = null;

  // 1. Intentar obtener sesión del apoderado
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    userId = session.user.id;
  } else {
    // 2. Si no hay apoderado, verificar token de alumno
    const authHeader = req.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = verifyStudentToken(token);
      if (payload) {
        userId = payload.cuentaId;
        studentPupiloId = payload.pupiloId;
        isStudentMode = true;
      } else {
        return NextResponse.json({ error: "Token de alumno inválido o expirado" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  let body: { pupilos: PerfilNino[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const clientPupilos = body.pupilos || [];

  // En modo alumno, validar que solo se sincronice a sí mismo
  if (isStudentMode && studentPupiloId) {
    if (clientPupilos.length !== 1 || clientPupilos[0].id !== studentPupiloId) {
      return NextResponse.json({ error: "Acceso denegado: modo alumno restringido" }, { status: 403 });
    }
  }

  try {
    // 1. Obtener todos los pupilos existentes en la BD para este usuario
    const dbPupilosList = await db
      .select()
      .from(pupilosTable)
      .where(eq(pupilosTable.cuentaId, userId));

    const dbPupilosMap = new Map(dbPupilosList.map((p) => [p.id, p]));

    for (const cp of clientPupilos) {
      const dbPupilo = dbPupilosMap.get(cp.id);
      const clientUpdateStr = cp.updatedAt || cp.creadoEn || new Date().toISOString();
      const clientUpdateMs = new Date(clientUpdateStr).getTime();

      // Si no existe en la BD o el cliente es más reciente: guardamos en la BD
      if (!dbPupilo || clientUpdateMs > dbPupilo.updatedAt.getTime()) {
        const insertData = {
          id: cp.id,
          cuentaId: userId,
          nombre: cp.nombre,
          curso: cp.curso,
          examenFecha: cp.examen.fecha,
          examenMaterias: cp.examen.materias,
          horasSemana: cp.disponibilidad.horasSemana,
          contexto: cp.contexto,
          diagnostico: cp.diagnostico || null,
          tutoria: cp.tutoria || null,
          creadoEn: new Date(cp.creadoEn || Date.now()),
          updatedAt: new Date(clientUpdateStr),
        };

        if (!dbPupilo) {
          await db.insert(pupilosTable).values(insertData);
        } else {
          await db
            .update(pupilosTable)
            .set(insertData)
            .where(eq(pupilosTable.id, cp.id));
        }

        // Sincronizar las sesiones asociadas a este pupilo en la tabla sesiones relacional
        const sesionesList = cp.tutoria?.sesiones || [];
        if (sesionesList.length > 0) {
          for (const s of sesionesList) {
            const sessionId = `${cp.id}_${new Date(s.fecha).getTime()}`;
            // Upsert de la sesión
            await db
              .insert(sesionesTable)
              .values({
                id: sessionId,
                pupiloId: cp.id,
                cuentaId: userId,
                fecha: new Date(s.fecha),
                duracionMin: s.duracionMin,
                dia: s.dia,
                materia: s.materia,
                titulo: s.titulo,
                resumen: s.resumen,
                nMensajes: s.nMensajes,
              })
              .onConflictDoUpdate({
                target: sesionesTable.id,
                set: {
                  duracionMin: s.duracionMin,
                  dia: s.dia,
                  materia: s.materia,
                  titulo: s.titulo,
                  resumen: s.resumen,
                  nMensajes: s.nMensajes,
                },
              });
          }
        }
      }
    }

    // 2. Obtener lista actualizada definitiva de pupilos en la BD
    const listFinal = isStudentMode && studentPupiloId
      ? await db
          .select()
          .from(pupilosTable)
          .where(and(eq(pupilosTable.cuentaId, userId), eq(pupilosTable.id, studentPupiloId)))
      : await db
          .select()
          .from(pupilosTable)
          .where(eq(pupilosTable.cuentaId, userId));

    const finalPupilos: PerfilNino[] = listFinal.map((p) => ({
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
      contexto: p.contexto as any,
      diagnostico: (p.diagnostico || undefined) as any,
      tutoria: (p.tutoria || undefined) as any,
      creadoEn: p.creadoEn.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({ pupilos: finalPupilos });
  } catch (err) {
    console.error("Error en sincronización /api/sync:", err);
    return NextResponse.json({ error: "Fallo en la base de datos" }, { status: 500 });
  }
}
