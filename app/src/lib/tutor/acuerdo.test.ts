import { describe, expect, it } from "vitest";
import { diaDeHoy, materiasDeHoy, ultimaSesion, type AcuerdoTutoria } from "./acuerdo";

const mockAcuerdo: AcuerdoTutoria = {
  creadoEn: "2026-07-09T00:00:00Z",
  horario: {
    lun: ["matematica"],
    mar: ["lenguaje", "ciencias"],
    mie: [],
    jue: ["ingles"],
    vie: [],
    sab: [],
    dom: [],
  },
  notasNino: "Le gustan los videojuegos y es visual.",
  sesiones: [
    {
      fecha: "2026-07-09T10:00:00Z",
      duracionMin: 20,
      dia: "jue",
      materia: "matematica",
      titulo: "Suma de fracciones",
      resumen: "Vimos suma de fracciones con igual denominador.",
      nMensajes: 12,
    },
    {
      fecha: "2026-07-10T11:00:00Z",
      duracionMin: 30,
      dia: "vie",
      materia: "lenguaje",
      titulo: "Comprensión lectora",
      resumen: "Trabajamos en lectura de mitos griegos.",
      nMensajes: 15,
    },
  ],
};

describe("Manejador de Acuerdo de Tutoría", () => {
  it("debe retornar la última sesión correctamente", () => {
    const ult = ultimaSesion(mockAcuerdo);
    expect(ult).not.toBeNull();
    expect(ult?.titulo).toBe("Comprensión lectora");
    expect(ult?.materia).toBe("lenguaje");
  });

  it("debe retornar arreglo vacío si no hay sesiones para la última sesión", () => {
    const acuerdoVacio: AcuerdoTutoria = {
      ...mockAcuerdo,
      sesiones: [],
    };
    expect(ultimaSesion(acuerdoVacio)).toBeNull();
  });

  it("debe retornar las materias correctas para el día de hoy", () => {
    const materiasLun = materiasDeHoy(mockAcuerdo, "lun");
    expect(materiasLun).toEqual(["matematica"]);

    const materiasMar = materiasDeHoy(mockAcuerdo, "mar");
    expect(materiasMar).toEqual(["lenguaje", "ciencias"]);

    const materiasMie = materiasDeHoy(mockAcuerdo, "mie");
    expect(materiasMie).toEqual([]);
  });

  it("debe mapear el diaDeHoy a partir de un objeto Date", () => {
    // 2026-07-09 es Jueves (getDay = 4)
    const fechaJue = new Date("2026-07-09T12:00:00");
    expect(diaDeHoy(fechaJue)).toBe("jue");

    // 2026-07-12 es Domingo (getDay = 0)
    const fechaDom = new Date("2026-07-12T12:00:00");
    expect(diaDeHoy(fechaDom)).toBe("dom");
  });
});
