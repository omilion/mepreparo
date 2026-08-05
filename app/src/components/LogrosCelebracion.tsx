"use client";

// Celebra los logros nuevos al aterrizar en /hoy (justo después de que algo
// cambió: terminó una sesión, superó una etapa, etc). Partículas, nunca
// emojis (ver memoria del proyecto). NO puntos ni ranking: acompañamos.

import { useEffect, useState } from "react";
import type { Curso, PerfilNino } from "@/lib/profile";
import { calcularRacha } from "@/lib/plan/racha";
import { logroDe, logrosDesbloqueados, logrosNuevos, type LogroId } from "@/lib/plan/logros";
import { Fireworks } from "./Fireworks";
import { Reveal } from "./Reveal";

export function LogrosCelebracion({
  perfil,
  curso,
  onGuardar,
}: {
  perfil: PerfilNino;
  curso: Curso;
  onGuardar: (p: PerfilNino) => void;
}) {
  const [celebrando, setCelebrando] = useState<LogroId[] | null>(null);

  useEffect(() => {
    const sesiones = perfil.tutoria?.sesiones ?? [];
    const racha = calcularRacha(sesiones);
    const desbloqueados = logrosDesbloqueados(perfil, curso, racha);
    const nuevos = logrosNuevos(desbloqueados, perfil.contexto.logrosVistos);
    if (nuevos.length === 0) return;

    setCelebrando(nuevos);
    onGuardar({
      ...perfil,
      contexto: {
        ...perfil.contexto,
        logrosVistos: [...(perfil.contexto.logrosVistos ?? []), ...nuevos],
      },
    });
    // Solo al montar (llegar a /hoy): evita re-disparar la celebración en
    // cada render por cambios de referencia en `perfil`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!celebrando) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
      onClick={() => setCelebrando(null)}
    >
      <div
        className="relative w-full max-w-[340px] overflow-hidden rounded-zen border border-hair bg-paper p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Fireworks />
        <Reveal variant="lead" delay={80}>
          <div className="relative mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            Logro desbloqueado
          </div>
        </Reveal>
        <div className="relative flex flex-col gap-4">
          {celebrando.map((id) => {
            const l = logroDe(id);
            return (
              <Reveal key={id} delay={200}>
                <div>
                  <h3 className="font-serif text-[20px] text-ink">{l.titulo}</h3>
                  <p className="mt-1 text-[13.5px] text-ink-soft">{l.descripcion}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={420}>
          <button onClick={() => setCelebrando(null)} className="cta relative mt-5 px-8">
            ¡Genial!
          </button>
        </Reveal>
      </div>
    </div>
  );
}
