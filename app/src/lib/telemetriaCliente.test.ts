import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fake mínimo de localStorage: vitest corre en Node, sin window/localStorage
// real. Se instala en globalThis ANTES de importar el módulo bajo prueba
// (pero como telemetriaCliente.ts solo toca localStorage DENTRO de las
// funciones, no al cargar el módulo, el orden de import no importa aquí).
class FakeStorage {
  private mapa = new Map<string, string>();
  getItem(k: string) {
    return this.mapa.has(k) ? this.mapa.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.mapa.set(k, v);
  }
  removeItem(k: string) {
    this.mapa.delete(k);
  }
}

let fakeStorage: FakeStorage;

beforeEach(() => {
  fakeStorage = new FakeStorage();
  vi.stubGlobal("localStorage", fakeStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

import { avisarEvento, sincronizarColaEventos } from "./telemetriaCliente";

describe("avisarEvento — cola local sin red", () => {
  it("si el POST falla (sin red), el evento queda encolado en localStorage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin red")));
    avisarEvento("sesion_iniciada", { pupiloId: "p1", materia: "matematica" });
    // avisarEvento no espera el fetch (fire-and-forget): dejamos que el
    // microtask del .catch() corra antes de revisar la cola.
    await new Promise((r) => setTimeout(r, 0));

    const cola = JSON.parse(fakeStorage.getItem("mp_cola_eventos") || "[]");
    expect(cola).toHaveLength(1);
    expect(cola[0]).toMatchObject({ tipo: "sesion_iniciada", pupiloId: "p1", materia: "matematica" });
  });

  it("si el POST funciona, no se encola nada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    avisarEvento("sesion_iniciada", {});
    await new Promise((r) => setTimeout(r, 0));

    expect(fakeStorage.getItem("mp_cola_eventos")).toBeNull();
  });
});

describe("sincronizarColaEventos", () => {
  it("reintenta lo encolado y, si ahora sí funciona, vacía la cola", async () => {
    fakeStorage.setItem(
      "mp_cola_eventos",
      JSON.stringify([{ tipo: "tutor_sin_conexion", pupiloId: "p1" }])
    );
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    sincronizarColaEventos();
    await new Promise((r) => setTimeout(r, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // guardarCola([]) escribe "[]", no borra la clave — se verifica el
    // contenido parseado, no la presencia de la clave.
    expect(JSON.parse(fakeStorage.getItem("mp_cola_eventos") || "null")).toEqual([]);
  });

  it("si sigue sin red, el evento se reencola (no se pierde)", async () => {
    fakeStorage.setItem(
      "mp_cola_eventos",
      JSON.stringify([{ tipo: "tutor_sin_conexion", pupiloId: "p1" }])
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sigue sin red")));

    sincronizarColaEventos();
    await new Promise((r) => setTimeout(r, 0));

    const cola = JSON.parse(fakeStorage.getItem("mp_cola_eventos") || "[]");
    expect(cola).toHaveLength(1);
    expect(cola[0].tipo).toBe("tutor_sin_conexion");
  });

  it("cola vacía: no llama a fetch", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    sincronizarColaEventos();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
