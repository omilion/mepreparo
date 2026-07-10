import { describe, it, expect } from "vitest";
import { etapasDeMateria, rutaDeTemas, progresoDeMateria, tituloDeTema } from "./etapas";
import type { AcuerdoTutoria } from "@/lib/tutor/acuerdo";

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
