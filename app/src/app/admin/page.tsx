// PANEL DE LA EMPRESA (primera pantalla).
//
// Es un Server Component a propósito: la comprobación del rol ocurre ANTES de
// enviar una sola línea de HTML, y las consultas nunca salen al navegador. Si
// esto fuera una pantalla cliente que pide datos por una API, tendríamos que
// proteger además esa API; así hay una sola puerta.
//
// Quien no es admin recibe un 404, no un "no autorizado": desde afuera, esta
// ruta no existe.

import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { adminActual } from "@/lib/admin";
import { db } from "@/lib/db/db";
import { eventos, pupilos, sesiones, user } from "@/lib/db/schema";
import { SalirAdmin } from "./SalirAdmin";

export const dynamic = "force-dynamic"; // nunca cachear datos de la operación

async function contar(consulta: Promise<{ n: number }[]>): Promise<number> {
  try {
    return Number((await consulta)[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export default async function AdminRuta() {
  const admin = await adminActual();
  if (!admin) notFound();

  const [cuentas, ninos, clases7d, minutos7d, fallos7d, fallosPorTipo] =
    await Promise.all([
      contar(
        db
          .select({ n: sql<number>`count(*)` })
          .from(user)
          .where(sql`${user.rol} = 'apoderado'`)
      ),
      contar(db.select({ n: sql<number>`count(*)` }).from(pupilos)),
      contar(
        db
          .select({ n: sql<number>`count(*)` })
          .from(sesiones)
          .where(sql`${sesiones.fecha} > now() - interval '7 days'`)
      ),
      contar(
        db
          .select({ n: sql<number>`coalesce(sum(${sesiones.duracionMin}), 0)` })
          .from(sesiones)
          .where(sql`${sesiones.fecha} > now() - interval '7 days'`)
      ),
      contar(
        db
          .select({ n: sql<number>`count(*)` })
          .from(eventos)
          .where(
            sql`${eventos.creadoEn} > now() - interval '7 days' and ${eventos.tipo} <> 'sesion_iniciada'`
          )
      ),
      db
        .select({ tipo: eventos.tipo, n: sql<number>`count(*)` })
        .from(eventos)
        .where(sql`${eventos.creadoEn} > now() - interval '7 days'`)
        .groupBy(eventos.tipo)
        .orderBy(sql`count(*) desc`)
        .catch(() => [] as { tipo: string; n: number }[]),
    ]);

  return (
    <main className="zen-page flex flex-col gap-8 pb-24 pt-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-clay">
            Operación
          </div>
          <h1 className="text-[28px]">Cómo va mepreparo</h1>
          <p className="mt-2 text-[13px] text-ink-soft">
            {admin.email} · últimos 7 días
          </p>
        </div>
        <SalirAdmin />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta valor={cuentas} etiqueta="apoderados" />
        <Tarjeta valor={ninos} etiqueta="niños" />
        <Tarjeta valor={clases7d} etiqueta="clases (7 días)" />
        <Tarjeta valor={minutos7d} etiqueta="minutos estudiados" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px]">
          Fallos de los últimos 7 días{" "}
          <span className="text-ink-soft">({fallos7d})</span>
        </h2>
        {fallosPorTipo.length === 0 ? (
          <p className="rounded-zen border border-hair px-5 py-4 text-[14px] text-ink-soft">
            Todavía no hay eventos. Si acaban de desplegar, revisa que la
            migración de la tabla <code>eventos</code> esté aplicada: sin ella la
            app funciona igual pero no se registra nada.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {fallosPorTipo.map((f) => (
              <li
                key={f.tipo}
                className="flex items-baseline justify-between rounded-zen border border-hair px-5 py-3"
              >
                <span className="text-[14px] text-ink">{f.tipo}</span>
                <span className="font-mono text-[15px] tabular-nums text-ink-soft">
                  {Number(f.n)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-[12px] leading-[1.5] text-ink-soft">
        Este panel solo muestra comportamiento agregado. No incluye —ni debe
        incluir— nombres de niños, conversaciones con Rai ni resúmenes de clase:
        eso es del apoderado, no de la empresa.
      </p>
    </main>
  );
}

function Tarjeta({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="rounded-zen border border-hair px-5 py-4">
      <div className="font-serif text-[30px] tabular-nums text-ink">{valor}</div>
      <div className="mt-1 text-[12.5px] text-ink-soft">{etiqueta}</div>
    </div>
  );
}
