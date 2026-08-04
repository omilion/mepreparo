import { describe, expect, it } from "vitest";
import { diaDeHoy, materiasDeHoy, registrarSimulacro, ultimaSesion, type AcuerdoTutoria } from "./acuerdo";

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

describe("registrarSimulacro", () => {
  const acuerdoBase: AcuerdoTutoria = {
    creadoEn: "2026-07-01T00:00:00Z",
    horario: {},
    notasNino: "",
    sesiones: [],
  };

  it("marca superado un tema con ≥4 preguntas y ≥80% de aciertos", () => {
    const r = registrarSimulacro(
      acuerdoBase,
      "matematica",
      [{ tema: "fracciones", correctos: 4, total: 5 }],
      "2026-07-20"
    );
    const t = r.temas?.find((x) => x.tema === "fracciones");
    expect(t?.estado).toBe("superado");
    expect(t?.evidencias.at(-1)).toMatchObject({ tipo: "simulacro", nota: "4 de 5 correctos en simulacro" });
  });

  it("marca le_cuesta un tema con ≤40% de aciertos", () => {
    const r = registrarSimulacro(
      acuerdoBase,
      "matematica",
      [{ tema: "algebra", correctos: 1, total: 5 }],
      "2026-07-20"
    );
    expect(r.temas?.find((x) => x.tema === "algebra")?.estado).toBe("le_cuesta");
  });

  it("ignora temas con total 0 (no se tocaron en el simulacro)", () => {
    const r = registrarSimulacro(acuerdoBase, "matematica", [{ tema: "geometria", correctos: 0, total: 0 }]);
    expect(r.temas?.find((x) => x.tema === "geometria")).toBeUndefined();
  });

  it("recorre varios temas del desglose en un solo llamado", () => {
    const r = registrarSimulacro(acuerdoBase, "matematica", [
      { tema: "fracciones", correctos: 5, total: 5 },
      { tema: "algebra", correctos: 0, total: 3 },
      { tema: "numeros", correctos: 2, total: 3 },
    ]);
    expect(r.temas).toHaveLength(3);
    expect(r.temas?.find((x) => x.tema === "numeros")?.estado).toBe("en_proceso");
  });

  it("nunca degrada un tema ya superado si el simulacro solo trae 1-3 preguntas de él", () => {
    const previo: AcuerdoTutoria = {
      ...acuerdoBase,
      temas: [
        { tema: "division", materia: "matematica", estado: "superado", evidencias: [], actualizadoEn: "2026-07-01" },
      ],
    };
    // 1 de 2 correctas: no llega al mínimo de 4 preguntas para bajar de estado
    const r = registrarSimulacro(previo, "matematica", [{ tema: "division", correctos: 1, total: 2 }]);
    expect(r.temas?.find((x) => x.tema === "division")?.estado).toBe("superado");
  });
});
