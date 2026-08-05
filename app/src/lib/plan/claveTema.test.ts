import { describe, expect, it } from "vitest";
import { normalizarClaveTema, emparejarConRuta, pareceEnunciado } from "./claveTema";

// la ruta real de matematica|5basico
const RUTA = [
  "division",
  "multiplicacion",
  "numeros",
  "decimales",
  "fracciones",
  "algebra",
  "geometria",
  "resolucion_problemas",
];

describe("normalizarClaveTema", () => {
  it("quita tildes, baja a minúsculas y une con guion bajo", () => {
    expect(normalizarClaveTema("Comprensión Lectora")).toBe("comprension_lectora");
  });

  it("los signos de pregunta no sobreviven", () => {
    expect(normalizarClaveTema("¿Fracciones?")).toBe("fracciones");
  });

  it("colapsa espacios y guiones repetidos", () => {
    expect(normalizarClaveTema("  resolución   de - problemas ")).toBe("resolucion_de_problemas");
  });

  it("texto vacío o solo signos da cadena vacía", () => {
    expect(normalizarClaveTema("  ¿? ")).toBe("");
  });
});

describe("emparejarConRuta", () => {
  it("clave exacta se mantiene", () => {
    expect(emparejarConRuta("fracciones", RUTA)).toBe("fracciones");
  });

  it("variante con tilde y mayúscula empareja con la canónica", () => {
    expect(emparejarConRuta("Fracciones", RUTA)).toBe("fracciones");
  });

  it("el caso real de producción: espacios en vez de guion bajo", () => {
    expect(emparejarConRuta("Resolución de problemas", RUTA)).toBe("resolucion_problemas");
  });

  it("un fragmento del nombre empareja si es inequívoco", () => {
    expect(emparejarConRuta("problemas", RUTA)).toBe("resolucion_problemas");
  });

  it("un tema fuera de la ruta se conserva normalizado, no se descarta", () => {
    expect(emparejarConRuta("Sistema Solar", RUTA)).toBe("sistema_solar");
  });

  it("no adivina cuando hay más de una candidata", () => {
    const rutaAmbigua = ["numeros_pares", "numeros_impares"];
    // "numeros" calza con las dos → se queda como está, sin inventar
    expect(emparejarConRuta("numeros", rutaAmbigua)).toBe("numeros");
  });

  it("ruta vacía: devuelve la clave normalizada sin reventar", () => {
    expect(emparejarConRuta("Fracciones", [])).toBe("fracciones");
  });
});

describe("pareceEnunciado", () => {
  it("detecta los enunciados que ensuciaron producción", () => {
    expect(pareceEnunciado("une cada órgano con su función")).toBe(true);
    expect(pareceEnunciado("clasifica las palabras según corresponda")).toBe(true);
    expect(pareceEnunciado("¿Cuál no es múltiplo de 3?")).toBe(true);
  });

  it("no confunde un tema normal con un enunciado", () => {
    expect(pareceEnunciado("fracciones")).toBe(false);
    expect(pareceEnunciado("resolucion_problemas")).toBe(false);
    expect(pareceEnunciado("Sistema Solar")).toBe(false);
  });
});
