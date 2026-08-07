// Saneo de la memoria por tema, EN EL SYNC.
//
// Hubo una limpieza de una pasada sobre la base y se deshizo sola en dos días:
// la app es offline-first, el navegador tenía la copia vieja en localStorage y
// al sincronizar la subió encima de la limpia. Una migración no puede ganarle
// a un cliente que guarda su propia copia.
//
// Por eso el saneo vive acá: cada vez que un cliente empuja su tutoría, se
// limpia. Da lo mismo qué copia gane — el resultado siempre queda sano, y no
// hay que volver a correr nada a mano.

import { pareceEnunciado, normalizarClaveTema } from "@/lib/plan/claveTema";
import { rutaDeTemas } from "@/lib/plan/etapas";
import type { Curso, Materia } from "@/lib/profile";
import type { AcuerdoTutoria, EstadoTema, TemaDominio } from "./acuerdo";

// superado gana; entre los otros, el de evidencia más reciente.
const RANGO: Record<EstadoTema, number> = { superado: 3, le_cuesta: 2, en_proceso: 1 };

function fusionar(a: TemaDominio, b: TemaDominio): TemaDominio {
  const ganador = RANGO[a.estado] >= RANGO[b.estado] ? a : b;
  const evidencias = [...(a.evidencias ?? []), ...(b.evidencias ?? [])]
    .filter((e, i, arr) => arr.findIndex((x) => x.fecha === e.fecha && x.nota === e.nota) === i)
    .sort((x, y) => x.fecha.localeCompare(y.fecha))
    .slice(-8);
  return {
    ...ganador,
    evidencias,
    actualizadoEn: a.actualizadoEn > b.actualizadoEn ? a.actualizadoEn : b.actualizadoEn,
  };
}

// Reglas, conservadoras a propósito:
//   - ENUNCIADOS de actividad ("une cada órgano con su función") → se van. No
//     dicen qué aprendió el niño.
//   - Temas REALES fuera de la ruta (sustantivos, balanza) → se quedan. No son
//     etapas del banco, pero son aprendizaje genuino que el apoderado ve.
//   - Variantes del mismo tema (articulos / artículos) → se fusionan.
export function sanearTemas(temas: TemaDominio[], curso: Curso): TemaDominio[] {
  const conservados = new Map<string, TemaDominio>();

  for (const t of temas) {
    if (!t?.tema || !t.materia) continue;
    const ruta = rutaDeTemas(t.materia as Materia, curso);
    const esCanonico = ruta.includes(t.tema);

    if (!esCanonico && pareceEnunciado(t.tema)) continue;

    const clave = esCanonico ? t.tema : normalizarClaveTema(t.tema);
    if (!clave) continue;

    const llave = `${t.materia}|${clave}`;
    const previo = conservados.get(llave);
    const normalizado: TemaDominio = { ...t, tema: clave, evidencias: t.evidencias ?? [] };
    conservados.set(llave, previo ? fusionar(previo, normalizado) : normalizado);
  }

  return [...conservados.values()];
}

export function sanearTutoria(
  tutoria: AcuerdoTutoria | null | undefined,
  curso: Curso
): AcuerdoTutoria | null {
  if (!tutoria) return null;
  if (!Array.isArray(tutoria.temas) || tutoria.temas.length === 0) return tutoria;
  return { ...tutoria, temas: sanearTemas(tutoria.temas, curso) };
}
