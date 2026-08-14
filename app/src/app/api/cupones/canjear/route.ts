import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/db";
import { cuponesAcceso, suscripciones } from "@/lib/db/schema";
import { chequearLimite } from "@/lib/rateLimit";
import { hashCupon, MAX_LARGO_CUPON, normalizarCupon } from "@/lib/pagos/cupones";

export async function POST(req: NextRequest) {
  const limite = chequearLimite(req, { clave: "canjear-cupon", max: 8, ventanaMs: 60_000 });
  if (limite) return limite;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { codigo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const codigo = normalizarCupon(typeof body.codigo === "string" ? body.codigo : "");
  if (!codigo || codigo.length > MAX_LARGO_CUPON) {
    return NextResponse.json({ error: "Ingresa un cupón válido." }, { status: 400 });
  }

  const codigoHash = hashCupon(codigo);

  try {
    const resultado = await db.transaction(async (tx) => {
      const [yaCanjeado] = await tx
        .select({
          id: cuponesAcceso.id,
          codigoHash: cuponesAcceso.codigoHash,
          limitePupilos: cuponesAcceso.limitePupilos,
        })
        .from(cuponesAcceso)
        .where(eq(cuponesAcceso.canjeadoPor, session.user.id))
        .limit(1);

      if (yaCanjeado) {
        return {
          estado: yaCanjeado.codigoHash === codigoHash ? "ya_activado" : "cuenta_activada",
          limitePupilos: yaCanjeado.limitePupilos,
        } as const;
      }

      // UPDATE condicional: solo una petición puede adjudicarse un cupón,
      // incluso si dos familias intentan canjearlo al mismo tiempo.
      const [cupon] = await tx
        .update(cuponesAcceso)
        .set({ usado: true, canjeadoPor: session.user.id, canjeadoEn: new Date() })
        .where(
          and(
            eq(cuponesAcceso.codigoHash, codigoHash),
            eq(cuponesAcceso.activo, true),
            eq(cuponesAcceso.usado, false),
            isNull(cuponesAcceso.canjeadoPor)
          )
        )
        .returning({ id: cuponesAcceso.id, limitePupilos: cuponesAcceso.limitePupilos });

      if (!cupon) return { estado: "invalido" } as const;

      await tx
        .insert(suscripciones)
        .values({
          cuentaId: session.user.id,
          estado: "activa",
          pruebaHasta: null,
          periodoHasta: null,
          cuponId: cupon.id,
          limitePupilos: cupon.limitePupilos,
        })
        .onConflictDoUpdate({
          target: suscripciones.cuentaId,
          set: {
            estado: "activa",
            pruebaHasta: null,
            periodoHasta: null,
            canceladaEn: null,
            cuponId: cupon.id,
            limitePupilos: cupon.limitePupilos,
            actualizadoEn: new Date(),
          },
        });

      return { estado: "activado", limitePupilos: cupon.limitePupilos } as const;
    });

    if (resultado.estado === "invalido") {
      return NextResponse.json(
        { error: "El cupón no existe o ya fue utilizado." },
        { status: 400 }
      );
    }
    if (resultado.estado === "cuenta_activada") {
      return NextResponse.json(
        { error: "Esta cuenta ya utilizó otro cupón." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, limitePupilos: resultado.limitePupilos });
  } catch (err) {
    console.error("Error canjeando cupón:", err);
    return NextResponse.json({ error: "No se pudo canjear el cupón." }, { status: 500 });
  }
}
