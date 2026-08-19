import { describe, it, expect } from "vitest";
import { etapasDeMateria, rutaDeTemas, progresoDeMateria, tituloDeTema, faseDeMateria, temasEnRepaso } from "./etapas";
import type { AcuerdoTutoria, SimulacroCierre, TemaDominio } from "@/lib/tutor/acuerdo";

const acuerdoCon = (temas: AcuerdoTutoria["temas"]): AcuerdoTutoria => ({
  creadoEn: "2026-07-01T10:00:00.000Z",
  horario: {},
  notasNino: "",
  sesiones: [],
  temas,
});

describe("rutaDeTemas", () => {
  it("devuelve la secuencia del banco para matematica 5basico", () => {
    const ruta = rutaDeTemas("matematica", "5basico");
    expect(ruta.length).toBeGreaterThanOrEqual(5);
    expect(ruta).toContain("fracciones");
  });

  it("combinación inexistente → vacío (no revienta)", () => {
    expect(rutaDeTemas("ingles", "1basico")).toEqual([]);
  });
});

describe("etapasDeMateria", () => {
  it("sin memoria: la primera etapa es la actual, el resto pendientes", () => {
    const etapas = etapasDeMateria("matematica", "5basico", null);
    expect(etapas[0].estado).toBe("actual");
    expect(etapas.slice(1).every((e) => e.estado === "pendiente")).toBe(true);
  });

  it("superados se marcan y la actual avanza a la primera no superada", () => {
    const ruta = rutaDeTemas("matematica", "5basico");
    const acuerdo = acuerdoCon([
      { tema: ruta[0], materia: "matematica", estado: "superado", evidencias: [], actualizadoEn: "2026-07-05" },
      { tema: ruta[1], materia: "matematica", estado: "superado", evidencias: [], actualizadoEn: "2026-07-06" },
    ]);
    const etapas = etapasDeMateria("matematica", "5basico", acuerdo);
    expect(etapas[0].estado).toBe("superada");
    expect(etapas[1].estado).toBe("superada");
    expect(etapas[2].estado).toBe("actual");
  });

  it("una etapa le_cuesta posterior a la actual queda en refuerzo", () => {
    const ruta = rutaDeTemas("matematica", "5basico");
    const acuerdo = acuerdoCon([
      // la 4ª etapa le cuesta (brecha del diagnóstico), pero la actual es la 1ª
      { tema: ruta[3], materia: "matematica", estado: "le_cuesta", evidencias: [], actualizadoEn: "2026-07-05" },
    ]);
    const etapas = etapasDeMateria("matematica", "5basico", acuerdo);
    expect(etapas[0].estado).toBe("actual");
    expect(etapas[3].estado).toBe("refuerzo");
  });

  it("progreso cuenta superadas/total", () => {
    const ruta = rutaDeTemas("matematica", "5basico");
    const acuerdo = acuerdoCon([
      { tema: ruta[0], materia: "matematica", estado: "superado", evidencias: [], actualizadoEn: "2026-07-05" },
    ]);
    const p = progresoDeMateria(etapasDeMateria("matematica", "5basico", acuerdo));
    expect(p.superadas).toBe(1);
    expect(p.total).toBe(ruta.length);
  });
});

describe("tituloDeTema", () => {
  it("usa el diccionario y capitaliza el fallback", () => {
    expect(tituloDeTema("resolucion_problemas")).toBe("Resolución de problemas");
    expect(tituloDeTema("sistema_solar")).toBe("Sistema solar");
  });
});

describe("faseDeMateria / temasEnRepaso (cierre de materia)", () => {
  const ruta = rutaDeTemas("matematica", "5basico"); // 8 temas
  const todosSuperados = (fecha = "2026-07-20"): TemaDominio[] =>
    ruta.map((tema) => ({ tema, materia: "matematica", estado: "superado" as const, evidencias: [], actualizadoEn: fecha }));
  const desglose100 = () => ruta.map((tema) => ({ tema, correctos: 5, total: 5 }));

  it("con camino sin terminar: aprendiendo", () => {
    expect(faseDeMateria("matematica", "5basico", acuerdoCon(todosSuperados().slice(0, -1)))).toBe("aprendiendo");
  });

  it("camino completo sin simulacro rendido: simulacro_1_pendiente", () => {
    expect(faseDeMateria("matematica", "5basico", acuerdoCon(todosSuperados()))).toBe("simulacro_1_pendiente");
  });

  it("simulacro 1 aprobado: materia_lista de una", () => {
    const s1: SimulacroCierre = {
      materia: "matematica",
      numero: 1,
      fecha: "2026-07-21",
      desglose: desglose100(),
      aprobado: true,
      temasDebiles: [],
    };
    const acuerdo = { ...acuerdoCon(todosSuperados()), simulacrosCierre: [s1] };
    expect(faseDeMateria("matematica", "5basico", acuerdo)).toBe("materia_lista");
  });

  it("simulacro 1 con temas débiles y SIN práctica nueva: repaso", () => {
    const s1: SimulacroCierre = {
      materia: "matematica",
      numero: 1,
      fecha: "2026-07-21",
      desglose: [{ tema: "fracciones", correctos: 1, total: 5 }, ...desglose100().slice(1)],
      aprobado: false,
      temasDebiles: ["fracciones"],
    };
    const acuerdo = { ...acuerdoCon(todosSuperados()), simulacrosCierre: [s1] };
    expect(faseDeMateria("matematica", "5basico", acuerdo)).toBe("repaso");
    expect(temasEnRepaso("matematica", "5basico", acuerdo)).toEqual(["fracciones"]);
  });

  it("con práctica NUEVA suficiente en el tema débil: simulacro_2_pendiente", () => {
    const s1: SimulacroCierre = {
      materia: "matematica",
      numero: 1,
      fecha: "2026-07-21",
      desglose: [{ tema: "fracciones", correctos: 1, total: 5 }, ...desglose100().slice(1)],
      aprobado: false,
      temasDebiles: ["fracciones"],
    };
    const temas = todosSuperados();
    // reemplaza "fracciones" agregando práctica NUEVA (posterior al simulacro 1)
    const idx = temas.findIndex((t) => t.tema === "fracciones");
    temas[idx] = {
      ...temas[idx],
      evidencias: [
        { fecha: "2026-07-23", tipo: "ejercicios", nota: "1 de 1 correctos", correctos: 1, total: 1 },
        { fecha: "2026-07-24", tipo: "ejercicios", nota: "1 de 1 correctos", correctos: 1, total: 1 },
      ],
    };
    const acuerdo = { ...acuerdoCon(temas), simulacrosCierre: [s1] };
    expect(faseDeMateria("matematica", "5basico", acuerdo)).toBe("simulacro_2_pendiente");
    expect(temasEnRepaso("matematica", "5basico", acuerdo)).toEqual([]);
  });

  it("práctica ANTERIOR al simulacro 1 no cuenta para salir de repaso", () => {
    const s1: SimulacroCierre = {
      materia: "matematica",
      numero: 1,
      fecha: "2026-07-21",
      desglose: [{ tema: "fracciones", correctos: 1, total: 5 }, ...desglose100().slice(1)],
      aprobado: false,
      temasDebiles: ["fracciones"],
    };
    const temas = todosSuperados();
    const idx = temas.findIndex((t) => t.tema === "fracciones");
    temas[idx] = {
      ...temas[idx],
      evidencias: [
        { fecha: "2026-07-10", tipo: "ejercicios", nota: "1 de 1 correctos", correctos: 1, total: 1 },
        { fecha: "2026-07-15", tipo: "ejercicios", nota: "1 de 1 correctos", correctos: 1, total: 1 },
      ],
    };
    const acuerdo = { ...acuerdoCon(temas), simulacrosCierre: [s1] };
    expect(faseDeMateria("matematica", "5basico", acuerdo)).toBe("repaso");
  });

  it("tope de 2 ciclos: tras el segundo simulacro, materia_lista aunque no haya aprobado", () => {
    const s1: SimulacroCierre = {
      materia: "matematica",
      numero: 1,
      fecha: "2026-07-21",
      desglose: desglose100(),
      aprobado: false,
      temasDebiles: ["fracciones"],
    };
    const s2: SimulacroCierre = {
      materia: "matematica",
      numero: 2,
      fecha: "2026-07-28",
      desglose: desglose100(),
      aprobado: false,
      temasDebiles: ["fracciones"],
    };
    const acuerdo = { ...acuerdoCon(todosSuperados()), simulacrosCierre: [s1, s2] };
    expect(faseDeMateria("matematica", "5basico", acuerdo)).toBe("materia_lista");
  });
});
