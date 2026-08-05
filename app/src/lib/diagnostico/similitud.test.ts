import { describe, expect, it } from "vitest";
import { similitud, esMuyParecida } from "./similitud";

describe("similitud entre enunciados", () => {
  it("la misma pregunta con los sumandos dados vuelta es un duplicado", () => {
    expect(similitud("¿Cuánto es 1/4 + 2/4?", "¿Cuánto es 2/4 + 1/4?")).toBeGreaterThan(0.55);
  });

  it("la misma pregunta cambiando solo el nombre del niño es un duplicado", () => {
    const a = "Sofía comió 3 de las 8 porciones de una pizza. ¿Qué fracción comió?";
    const b = "Juan comió 3 de las 8 porciones de una pizza. ¿Qué fracción comió?";
    expect(similitud(a, b)).toBeGreaterThan(0.55);
  });

  it("dos preguntas realmente distintas del mismo tema NO son duplicados", () => {
    const a = "¿Cuánto es 1/4 + 2/4?";
    const b = "¿Qué fracción es equivalente a 1/2?";
    expect(similitud(a, b)).toBeLessThan(0.55);
  });

  it("las tildes y mayúsculas no cambian el resultado", () => {
    expect(similitud("¿Cuánto es la MITAD de 10?", "cuanto es la mitad de 10")).toBe(1);
  });

  it("esMuyParecida detecta contra una lista", () => {
    const previas = ["¿Cuánto es 1/4 + 2/4?", "¿Qué fracción es equivalente a 1/2?"];
    expect(esMuyParecida("¿Cuánto es 2/4 + 1/4?", previas)).toBe(true);
    expect(esMuyParecida("Ordena de menor a mayor: 1/3, 1/2, 1/5", previas)).toBe(false);
  });

  it("lista vacía: nunca es parecida", () => {
    expect(esMuyParecida("¿Cuánto es 1/4 + 2/4?", [])).toBe(false);
  });
});
