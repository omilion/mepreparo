import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable, sesiones as sesionesTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { PerfilNino } from "@/lib/profile";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = session.user.id;
  let body: { pupilos: PerfilNino[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const clientPupilos = body.pupilos || [];

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

    // 2. Obtener lista actualizada definitiva de pupilos de este usuario en la BD
    const listFinal = await db
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
