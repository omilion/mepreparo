// Racha de días de estudio consecutivos. Extraído de PlanEstudio.tsx (donde
// vivía sin tipar y sin celebrarse) para reusarlo también en /hoy.

import type { SesionTutoria } from "@/lib/tutor/acuerdo";

export function calcularRacha(sesiones: SesionTutoria[]): number {
  if (!sesiones || sesiones.length === 0) return 0;

  const fechasUnicas = sesiones
    .map((s) => new Date(s.fecha).toDateString())
    .filter((v, i, self) => self.indexOf(v) === i); // fechas únicas

  const sorted = fechasUnicas.map((f) => new Date(f)).sort((a, b) => b.getTime() - a.getTime());

  let racha = 0;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const ultimaSesion = sorted[0];
  if (!ultimaSesion) return 0;

  const diffTime = Math.abs(hoy.getTime() - ultimaSesion.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 1) return 0; // racha rota

  let checkDate = diffDays === 1 ? ultimaSesion : hoy;

  for (const f of sorted) {
    const diff = Math.abs(checkDate.getTime() - f.getTime());
    const diffD = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (diffD <= 1) {
      racha++;
      checkDate = f;
    } else {
      break;
    }
  }
  return racha;
}
