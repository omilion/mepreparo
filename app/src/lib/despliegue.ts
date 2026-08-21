export const CLAVE_RECUPERACION_DESPLIEGUE =
  "mp-recuperacion-despliegue-en-curso";

// Evita ciclos si el problema no era un despliegue o si la limpieza fallo.
// A diferencia del guard anterior, este expira y una actualizacion futura de
// la misma pestana puede recuperarse sin borrar datos del navegador.
export const ESPERA_ENTRE_RECUPERACIONES_MS = 2 * 60 * 1000;

export function esErrorDeDespliegue(mensaje: string): boolean {
  return (
    /Failed to find Server Action/i.test(mensaje) ||
    /Loading chunk .* failed/i.test(mensaje) ||
    /ChunkLoadError/i.test(mensaje) ||
    /Failed to fetch dynamically imported module/i.test(mensaje) ||
    /Importing a module script failed/i.test(mensaje)
  );
}

export function esCacheDeMePreparo(clave: string): boolean {
  return clave.startsWith("mepreparo-");
}

export function puedeIntentarRecuperacion(
  valorGuardado: string | null,
  ahora = Date.now()
): boolean {
  if (!valorGuardado) return true;

  const ultimoIntento = Number(valorGuardado);
  if (!Number.isFinite(ultimoIntento) || ultimoIntento <= 0) return true;

  return ahora - ultimoIntento >= ESPERA_ENTRE_RECUPERACIONES_MS;
}
