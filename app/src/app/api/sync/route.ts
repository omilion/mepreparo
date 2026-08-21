import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable, sesiones as sesionesTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { PerfilNino } from "@/lib/profile";
import { verifyStudentToken } from "@/lib/auth-student";
import { sanearTutoria } from "@/lib/tutor/sanearMemoria";
import { chequearLimite } from "@/lib/rateLimit";
import { obtenerOCrearSuscripcion } from "@/lib/pagos/repositorio";
import { fusionarPerfilNino } from "@/lib/tutor/fusion";

export async function POST(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "sync", max: 60, ventanaMs: 60_000 });
  if (limite) return limite;

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

    if (!isStudentMode) {
      const idsNuevos = new Set(
        clientPupilos.filter((p) => !dbPupilosMap.has(p.id)).map((p) => p.id)
      );
      if (idsNuevos.size > 0) {
        const sub = await obtenerOCrearSuscripcion(userId);
        const esFamiliaNueva = dbPupilosList.length === 0;
        if (esFamiliaNueva && !sub.cuponId && !sub.ultimoPagoEn) {
          return NextResponse.json(
            { error: "Necesitas un cupón de invitación para completar la inscripción." },
            { status: 403 }
          );
        }
        if (
          sub.limitePupilos !== null &&
          dbPupilosList.length + idsNuevos.size > sub.limitePupilos
        ) {
          return NextResponse.json(
            { error: `Este cupón permite un máximo de ${sub.limitePupilos} niños.` },
            { status: 403 }
          );
        }
      }
    }

    for (const cp of clientPupilos) {
      const dbPupilo = dbPupilosMap.get(cp.id);

      const basePupilo: PerfilNino | undefined = dbPupilo
        ? {
            id: dbPupilo.id,
            nombre: dbPupilo.nombre,
            curso: dbPupilo.curso as any,
            examen: {
              fecha: dbPupilo.examenFecha,
              materias: dbPupilo.examenMaterias as any[],
            },
            disponibilidad: {
              horasSemana: dbPupilo.horasSemana,
            },
            contexto: (dbPupilo.contexto || {}) as any,
            diagnostico: (dbPupilo.diagnostico || undefined) as any,
            tutoria: (dbPupilo.tutoria || undefined) as any,
            creadoEn: dbPupilo.creadoEn.toISOString(),
            updatedAt: dbPupilo.updatedAt.toISOString(),
          }
        : undefined;

      // Fusión acumulativa de perfiles (Field-Level Merge): evita pérdidas
      const fusionado = fusionarPerfilNino(basePupilo, cp);

      // Preservar pinHash si existe en la BD y el cliente no lo envía (o si viene en modo alumno)
      let contextoFinal = (fusionado.contexto || {}) as Record<string, unknown>;
      const dbContexto = (dbPupilo?.contexto || {}) as Record<string, unknown>;
      if (dbContexto.pinHash && (!contextoFinal.pinHash || isStudentMode)) {
        contextoFinal = { ...contextoFinal, pinHash: dbContexto.pinHash };
      }

      const insertData = {
        id: fusionado.id,
        cuentaId: userId,
        nombre: fusionado.nombre,
        curso: fusionado.curso,
        examenFecha: fusionado.examen.fecha,
        examenMaterias: fusionado.examen.materias,
        horasSemana: fusionado.disponibilidad.horasSemana,
        contexto: contextoFinal,
        diagnostico: fusionado.diagnostico || null,
        tutoria: sanearTutoria(fusionado.tutoria, fusionado.curso),
        creadoEn: new Date(fusionado.creadoEn || Date.now()),
        updatedAt: new Date(fusionado.updatedAt || Date.now()),
      };

      if (!dbPupilo) {
        await db.insert(pupilosTable).values(insertData);
      } else {
        await db
          .update(pupilosTable)
          .set(insertData)
          .where(eq(pupilosTable.id, fusionado.id));
      }

      // Sincronizar las sesiones asociadas a este pupilo en la tabla sesiones relacional
      const sesionesList = fusionado.tutoria?.sesiones || [];
      if (sesionesList.length > 0) {
        for (const s of sesionesList) {
          const sessionId = `${fusionado.id}_${new Date(s.fecha).getTime()}`;
          // Upsert de la sesión
          await db
            .insert(sesionesTable)
            .values({
              id: sessionId,
              pupiloId: fusionado.id,
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

    // 2. Obtener lista actualizada definitiva de pupilos en la BD.
    // ORDER BY explícito: sin él, Postgres devuelve las filas en el orden que
    // le acomode y un UPDATE puede moverlas. La app ya no depende del orden
    // para saber a quién acompaña (usa el id), pero así la lista del panel no
    // se reordena sola delante del apoderado.
    const listFinal = isStudentMode && studentPupiloId
      ? await db
          .select()
          .from(pupilosTable)
          .where(and(eq(pupilosTable.cuentaId, userId), eq(pupilosTable.id, studentPupiloId)))
          .orderBy(pupilosTable.creadoEn)
      : await db
          .select()
          .from(pupilosTable)
          .where(eq(pupilosTable.cuentaId, userId))
          .orderBy(pupilosTable.creadoEn);

    const finalPupilos: PerfilNino[] = listFinal.map((p) => {
      // El pinHash NUNCA sale al cliente en respuestas de sincronización
      const contextoBruto = (p.contexto ?? {}) as Record<string, unknown>;
      const { pinHash: _h, pin: _p, ...contextoSeguro } = contextoBruto;

      return {
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
    });

    return NextResponse.json({ pupilos: finalPupilos });
  } catch (err) {
    console.error("Error en sincronización /api/sync:", err);
    return NextResponse.json({ error: "Fallo en la base de datos" }, { status: 500 });
  }
}
