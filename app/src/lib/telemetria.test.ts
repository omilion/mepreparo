import { describe, it, expect } from "vitest";
import { sanearMeta, esTipoValido } from "./telemetria";

// La telemetría mira fallos, no niños. Estas pruebas fijan esa frontera: si
// alguien mañana pasa por descuido lo que escribió un niño, no debe pasar.

describe("sanear meta", () => {
  it("deja pasar números, booleanos y etiquetas cortas", () => {
    expect(sanearMeta({ ms: 1840, cayo: true, tipo: "sopa" })).toEqual({
      ms: 1840,
      cayo: true,
      tipo: "sopa",
    });
  });

  it("descarta una frase escrita por el niño", () => {
    const meta = sanearMeta({
      tipo: "sopa",
      texto: "me llamo Emilia y mi perro se llama Toby",
    });
    expect(meta).toEqual({ tipo: "sopa" });
  });

  it("descarta objetos y arreglos anidados (por ahí se cuela cualquier cosa)", () => {
    expect(sanearMeta({ datos: { nombre: "Emilia" }, palabras: ["a", "b"] })).toBeNull();
  });

  it("descarta valores no finitos y nulos", () => {
    expect(sanearMeta({ x: NaN, y: Infinity, z: null })).toBeNull();
  });

  it("devuelve null si no queda nada utilizable", () => {
    expect(sanearMeta({ frase: "una oración larga que no debe guardarse jamás" })).toBeNull();
    expect(sanearMeta(null)).toBeNull();
    expect(sanearMeta("texto suelto")).toBeNull();
  });
});

describe("catálogo cerrado de eventos", () => {
  it("acepta los tipos conocidos", () => {
    expect(esTipoValido("tutor_sin_conexion")).toBe(true);
    expect(esTipoValido("plan_incompleto")).toBe(true);
  });

  it("rechaza cualquier tipo inventado", () => {
    expect(esTipoValido("lo_que_dijo_el_nino")).toBe(false);
    expect(esTipoValido("")).toBe(false);
  });
});
