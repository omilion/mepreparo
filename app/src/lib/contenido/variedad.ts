// VARIEDAD DENTRO DE UNA SESIÓN
//
// Los interactivos se guardan en una biblioteca compartida: la primera vez que
// alguien pide "sopa de fracciones" se genera con IA y queda cacheada. El
// problema: a partir de ahí esa consulta encuentra UNA sola fila, y un
// `random` sobre un elemento devuelve siempre lo mismo. Si Rai decidía que la
// mejor forma de enseñar era repetir el juego, el niño recibía dos veces
// exactamente el mismo contenido.
//
// Solución: el cliente manda los ids que ya usó EN ESTA SESIÓN y aquí se
// descartan. Si no queda ninguno sin usar, quien llama debe generar uno nuevo
// (que además enriquece la biblioteca para el resto).

import type { NextRequest } from "next/server";

// Ids ya vistos, en `?excluir=id1,id2`. Tolerante: sin el parámetro, vacío.
export function idsExcluidos(req: NextRequest): Set<string> {
  const crudo = req.nextUrl.searchParams.get("excluir") || "";
  return new Set(
    crudo
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

// Elige al azar una fila que el niño NO haya visto en esta sesión.
// Devuelve null si ya las vio todas → hay que generar contenido nuevo.
export function elegirNoUsado<T extends { id: string }>(
  filas: T[],
  excluidos: Set<string>
): T | null {
  const disponibles = excluidos.size > 0
    ? filas.filter((f) => !excluidos.has(f.id))
    : filas;
  if (disponibles.length === 0) return null;
  return disponibles[Math.floor(Math.random() * disponibles.length)];
}
