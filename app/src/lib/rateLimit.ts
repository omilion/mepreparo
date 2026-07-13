// Rate limiting simple en memoria por IP. Protege los endpoints que llaman a
// Gemini para que un tercero no queme la cuota. Ventana deslizante por clave.
//
// Es en memoria (un solo proceso): suficiente para el VPS de un contenedor.
// Si algún día hay varias instancias, migrar a Redis. NO usa dependencias.

import { NextRequest, NextResponse } from "next/server";

interface Registro {
  conteo: number;
  reinicioEn: number; // timestamp ms en que se resetea la ventana
}

const almacen = new Map<string, Registro>();

// limpieza perezosa: cada tanto barremos las entradas ya vencidas
let ultimaLimpieza = Date.now();
function limpiarVencidos(ahora: number) {
  if (ahora - ultimaLimpieza < 60_000) return; // a lo más 1x/min
  ultimaLimpieza = ahora;
  for (const [k, v] of almacen) {
    if (v.reinicioEn < ahora) almacen.delete(k);
  }
}

// IP del cliente detrás de Caddy/proxy (X-Forwarded-For) o directa.
function ipDe(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "desconocida";
}

export interface OpcionesLimite {
  // máximo de peticiones permitidas en la ventana
  max: number;
  // duración de la ventana en ms
  ventanaMs: number;
  // sufijo para separar límites por endpoint (ej. "tutor", "demo")
  clave: string;
}

// Devuelve null si se permite; o una respuesta 429 si se excedió el límite.
export function chequearLimite(
  req: NextRequest,
  opts: OpcionesLimite
): NextResponse | null {
  const ahora = Date.now();
  limpiarVencidos(ahora);

  const id = `${opts.clave}:${ipDe(req)}`;
  const reg = almacen.get(id);

  if (!reg || reg.reinicioEn < ahora) {
    almacen.set(id, { conteo: 1, reinicioEn: ahora + opts.ventanaMs });
    return null;
  }

  if (reg.conteo >= opts.max) {
    const restaS = Math.ceil((reg.reinicioEn - ahora) / 1000);
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento." },
      { status: 429, headers: { "Retry-After": String(restaS) } }
    );
  }

  reg.conteo++;
  return null;
}
