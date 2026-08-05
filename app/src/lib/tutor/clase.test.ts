import { describe, expect, it } from "vitest";
import { materiaDeClase, seSalioDelHorario } from "./clase";

describe("materiaDeClase", () => {
  it("la etapa elegida en el mapa MANDA sobre el horario del día", () => {
    // el bug real: hoy tocaba lenguaje, el niño tocó una etapa de matemática
    expect(materiaDeClase("matematica", ["lenguaje"], ["matematica", "lenguaje"])).toBe("matematica");
  });

  it("sin foco, usa la materia agendada para hoy", () => {
    expect(materiaDeClase(null, ["lenguaje"], ["matematica", "lenguaje"])).toBe("lenguaje");
  });

  it("sin foco y sin nada agendado hoy, cae a la primera del examen", () => {
    expect(materiaDeClase(undefined, [], ["ciencias", "historia"])).toBe("ciencias");
  });

  it("con foco y sin horario (primera charla), respeta el foco igual", () => {
    expect(materiaDeClase("historia", [], ["matematica"])).toBe("historia");
  });
});

describe("seSalioDelHorario", () => {
  it("detecta cuando la clase no es la agendada", () => {
    expect(seSalioDelHorario("matematica", ["lenguaje"])).toBe(true);
  });

  it("no es 'salirse' si la materia sí está agendada hoy", () => {
    expect(seSalioDelHorario("lenguaje", ["lenguaje", "ciencias"])).toBe(false);
  });

  it("un día sin horario no cuenta como salirse", () => {
    expect(seSalioDelHorario("matematica", [])).toBe(false);
  });
});
