// Convierte el perfil completo del niño en un resumen CORTO (2-3 líneas) para
// inyectar en el prompt del tutor. Este es el truco de "personalización sin
// quemar tokens": la app mantiene el perfil, y solo mandamos lo esencial.

import { CURSOS, MATERIAS, type PerfilNino } from "@/lib/profile";

export function resumenPerfil(p: PerfilNino): string {
  const nombre = p.nombre.trim() || "el estudiante";
  const curso = CURSOS.find((c) => c.id === p.curso)?.label ?? p.curso;

  const partes: string[] = [`${nombre}, ${curso}`];

  // brechas del diagnóstico (dónde se traba) — lo más útil para el tutor
  const brechas: string[] = [];
  for (const m of p.examen.materias) {
    const d = p.diagnostico?.[m];
    if (d && d.brechas.length > 0) {
      const label = MATERIAS.find((x) => x.id === m)?.label ?? m;
      brechas.push(`${label} (${d.brechas.slice(0, 2).join(", ")})`);
    }
  }
  if (brechas.length > 0) {
    partes.push(`le cuesta: ${brechas.join("; ")}`);
  }

  if (p.contexto.intereses.length > 0) {
    partes.push(`le gustan: ${p.contexto.intereses.slice(0, 3).join(", ")}`);
  }
  if (p.contexto.estilos.length > 0) {
    partes.push(`aprende mejor ${p.contexto.estilos[0].toLowerCase()}`);
  }

  return partes.join(". ") + ".";
}
