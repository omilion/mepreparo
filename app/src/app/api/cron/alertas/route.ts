// Alertas por email que NO dispara una acción del usuario: resumen semanal e
// inactividad. Nadie hace clic para que esto ocurra, así que necesita algo
// externo que lo despierte — un cron del sistema en el VPS pegándole a esta
// ruta una vez al día (ver .env.example para el secreto y el comando).
//
// Protegido por CRON_SECRET: sin él, cualquiera podría hacer que mandemos
// correo a toda la base con un solo GET.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { pupilos as pupilosTable, user, apoderadoPerfil } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { enviarEmail, plantillaZen } from "@/lib/email";
import { MATERIAS } from "@/lib/profile";
import { tituloDeTema } from "@/lib/plan/etapas";
import type { AcuerdoTutoria } from "@/lib/tutor/acuerdo";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
const UN_DIA_MS = 86_400_000;
const DIAS_INACTIVIDAD = 5;
const COOLDOWN_SEMANAL_MS = 6 * UN_DIA_MS;

function autorizado(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false; // sin secreto configurado, la ruta no opera
  const deHeader = req.headers.get("x-cron-secret");
  const deQuery = new URL(req.url).searchParams.get("secret");
  return deHeader === secreto || deQuery === secreto;
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const filas = await db
    .select({
      pupiloId: pupilosTable.id,
      nombre: pupilosTable.nombre,
      tutoria: pupilosTable.tutoria,
      ultimaAlertaInactividadEn: pupilosTable.ultimaAlertaInactividadEn,
      ultimoResumenSemanalEn: pupilosTable.ultimoResumenSemanalEn,
      email: user.email,
      alertaSemanal: apoderadoPerfil.alertaSemanal,
      alertaInactividad: apoderadoPerfil.alertaInactividad,
    })
    .from(pupilosTable)
    .innerJoin(user, eq(user.id, pupilosTable.cuentaId))
    .leftJoin(apoderadoPerfil, eq(apoderadoPerfil.userId, user.id));

  let inactividadEnviados = 0;
  let semanalesEnviados = 0;
  const ahora = Date.now();

  for (const p of filas) {
    if (!p.email) continue;
    const tutoria = (p.tutoria as AcuerdoTutoria | null) ?? null;

    // --- inactividad: "Emilia no estudia hace 5 días" ---
    if (p.alertaInactividad !== false && tutoria?.sesiones?.length) {
      const ultimaSesion = tutoria.sesiones.at(-1)!;
      const fechaUltima = new Date(ultimaSesion.fecha);
      const diasInactivo = Math.floor((ahora - fechaUltima.getTime()) / UN_DIA_MS);
      // no repetir la alerta por el MISMO período de inactividad: solo si la
      // última alerta fue ANTES de la última sesión (o nunca hubo alerta)
      const yaAlertadoEstePeriodo =
        p.ultimaAlertaInactividadEn && p.ultimaAlertaInactividadEn.getTime() >= fechaUltima.getTime();

      if (diasInactivo >= DIAS_INACTIVIDAD && !yaAlertadoEstePeriodo && !Number.isNaN(fechaUltima.getTime())) {
        const html = plantillaZen({
          titulo: `${p.nombre} no estudia hace ${diasInactivo} días`,
          cuerpoHtml:
            `<p>Notamos que <strong>${p.nombre}</strong> no ha tenido sesiones de estudio en ${diasInactivo} días.</p>` +
            `<p>Sin presión: a veces basta con recordarle que Rai lo está esperando.</p>`,
          cta: { texto: "Retomar el estudio", url: `${APP_URL}/panel` },
          piePagina:
            "Recibiste este correo porque tienes activas las alertas de inactividad. Puedes apagarlas en Mi Cuenta.",
        });
        const r = await enviarEmail({ para: p.email, asunto: `${p.nombre} no estudia hace ${diasInactivo} días`, html });
        if (r.ok) inactividadEnviados++;
        await db
          .update(pupilosTable)
          .set({ ultimaAlertaInactividadEn: new Date() })
          .where(eq(pupilosTable.id, p.pupiloId));
      }
    }

    // --- resumen semanal: minutos, temas superados, qué reforzar ---
    if (p.alertaSemanal !== false) {
      const dentroDelCooldown =
        p.ultimoResumenSemanalEn && ahora - p.ultimoResumenSemanalEn.getTime() < COOLDOWN_SEMANAL_MS;

      if (!dentroDelCooldown) {
        const haceUnaSemana = ahora - 7 * UN_DIA_MS;
        const sesionesSemana = (tutoria?.sesiones ?? []).filter(
          (s) => new Date(s.fecha).getTime() >= haceUnaSemana
        );
        const minutos = sesionesSemana.reduce((acc, s) => acc + s.duracionMin, 0);

        const temas = tutoria?.temas ?? [];
        const superadosSemana = temas.filter(
          (t) => t.estado === "superado" && new Date(t.actualizadoEn).getTime() >= haceUnaSemana
        );
        const aReforzar = [...temas]
          .filter((t) => t.estado === "le_cuesta")
          .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn))
          .slice(0, 3);

        // sin absolutamente nada que contar (ni sesiones ni cambios), no
        // mandamos un correo vacío — eso solo entrena a ignorar el remitente
        if (sesionesSemana.length > 0 || superadosSemana.length > 0 || aReforzar.length > 0) {
          const materiasTexto = [...new Set(sesionesSemana.map((s) => s.materia))]
            .map((m) => MATERIAS.find((x) => x.id === m)?.label ?? m)
            .join(", ");
          const cuerpo =
            `<p>Así fue la semana de <strong>${p.nombre}</strong>:</p>` +
            `<ul style="padding-left:18px;margin:8px 0;">` +
            `<li>${minutos} minutos de estudio${materiasTexto ? ` (${materiasTexto})` : ""}</li>` +
            (superadosSemana.length > 0
              ? `<li>Superó: ${superadosSemana.map((t) => tituloDeTema(t.tema)).join(", ")}</li>`
              : "") +
            (aReforzar.length > 0
              ? `<li>Para reforzar: ${aReforzar.map((t) => tituloDeTema(t.tema)).join(", ")}</li>`
              : "") +
            `</ul>`;
          const html = plantillaZen({
            titulo: `Resumen de la semana de ${p.nombre}`,
            cuerpoHtml: cuerpo,
            cta: { texto: "Ver el panel completo", url: `${APP_URL}/panel` },
            piePagina:
              "Recibiste este correo porque tienes activo el resumen semanal. Puedes apagarlo en Mi Cuenta.",
          });
          const r = await enviarEmail({ para: p.email, asunto: `Resumen de la semana de ${p.nombre}`, html });
          if (r.ok) semanalesEnviados++;
        }

        await db
          .update(pupilosTable)
          .set({ ultimoResumenSemanalEn: new Date() })
          .where(eq(pupilosTable.id, p.pupiloId));
      }
    }
  }

  return NextResponse.json({
    ok: true,
    revisados: filas.length,
    inactividadEnviados,
    semanalesEnviados,
  });
}
