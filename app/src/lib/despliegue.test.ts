import { describe, expect, it } from "vitest";
import {
  ESPERA_ENTRE_RECUPERACIONES_MS,
  esCacheDeMePreparo,
  esErrorDeDespliegue,
  puedeIntentarRecuperacion,
} from "./despliegue";

describe("actualizaciones de despliegue", () => {
  it("reconoce errores propios de mezclar builds de Next", () => {
    expect(esErrorDeDespliegue("ChunkLoadError: Loading chunk 42 failed")).toBe(
      true
    );
    expect(
      esErrorDeDespliegue("Failed to find Server Action abc123")
    ).toBe(true);
    expect(esErrorDeDespliegue("La API no tiene conexion")).toBe(false);
  });

  it("solo identifica caches que pertenecen a MePreparo", () => {
    expect(esCacheDeMePreparo("mepreparo-shell-v2")).toBe(true);
    expect(esCacheDeMePreparo("mepreparo-recursos-seguros-v1")).toBe(true);
    expect(esCacheDeMePreparo("otra-aplicacion-v1")).toBe(false);
  });

  it("impide una recarga inmediata pero permite recuperarse mas adelante", () => {
    const ahora = 1_000_000;
    expect(puedeIntentarRecuperacion(null, ahora)).toBe(true);
    expect(puedeIntentarRecuperacion(String(ahora - 1_000), ahora)).toBe(false);
    expect(
      puedeIntentarRecuperacion(
        String(ahora - ESPERA_ENTRE_RECUPERACIONES_MS),
        ahora
      )
    ).toBe(true);
  });
});
