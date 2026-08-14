import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db/db";
import { user, apoderadoPerfil, pupilos, sesiones } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Derecho de ACCESO (Ley 21.719): el apoderado descarga TODO lo que guardamos
// de él y de sus hijos, en un JSON legible. No incluye telemetría de eventos:
// esa tabla no guarda contenido, solo qué pasó y cuándo (ver lib/telemetria).
export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const [usuario] = await db.select().from(user).where(eq(user.id, userId));
    const [perfil] = await db
      .select()
      .from(apoderadoPerfil)
      .where(eq(apoderadoPerfil.userId, userId));
    const misPupilos = await db
      .select()
      .from(pupilos)
      .where(eq(pupilos.cuentaId, userId));
    const misSesiones = await db
      .select()
      .from(sesiones)
      .where(eq(sesiones.cuentaId, userId));

    const exportado = {
      exportadoEn: new Date().toISOString(),
      apoderado: usuario
        ? {
            nombre: usuario.name,
            email: usuario.email,
            creadoEn: usuario.createdAt,
          }
        : null,
      perfilApoderado: perfil
        ? {
            telefono: perfil.telefono,
            rut: perfil.rut,
            relacion: perfil.relacion,
            comuna: perfil.comuna,
            region: perfil.region,
            consentimientoAt: perfil.consentimientoAt,
            consentimientoVersion: perfil.consentimientoVersion,
          }
        : null,
      hijos: misPupilos.map((p) => {
        const rawCtx = (p.contexto ?? {}) as Record<string, unknown>;
        const { pinHash: _h, pin: _p, ...contextoSeguro } = rawCtx;
        return {
          id: p.id,
          nombre: p.nombre,
          curso: p.curso,
          examenFecha: p.examenFecha,
          examenMaterias: p.examenMaterias,
          horasSemana: p.horasSemana,
          contexto: contextoSeguro,
          diagnostico: p.diagnostico,
          tutoria: p.tutoria,
          creadoEn: p.creadoEn,
        };
      }),
      sesionesDeEstudio: misSesiones.map((s) => ({
        pupiloId: s.pupiloId,
        fecha: s.fecha,
        duracionMin: s.duracionMin,
        materia: s.materia,
        titulo: s.titulo,
        resumen: s.resumen,
      })),
    };

    return NextResponse.json(exportado, {
      headers: {
        "Content-Disposition": `attachment; filename="mepreparo-mis-datos-${userId.slice(0, 8)}.json"`,
      },
    });
  } catch (err) {
    console.error("Error exportando datos del apoderado:", err);
    return NextResponse.json({ error: "No se pudo exportar" }, { status: 500 });
  }
}
