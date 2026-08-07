import { describe, expect, it } from "vitest";
import { sanearTemas } from "./sanearMemoria";
import type { TemaDominio } from "./acuerdo";

const tema = (t: string, materia: TemaDominio["materia"], estado: TemaDominio["estado"] = "en_proceso"): TemaDominio => ({
  tema: t,
  materia,
  estado,
  evidencias: [{ fecha: "2026-07-20", tipo: "ejercicios", nota: "1 de 1 correctos" }],
  actualizadoEn: "2026-07-20",
});

describe("sanearTemas", () => {
  it("bota los enunciados de actividad que ensuciaban el camino", () => {
    const sucios = [
      tema("une cada órgano con su función", "ciencias"),
      tema("clasifica las palabras según corresponda", "lenguaje"),
      tema("¿cuál no es múltiplo de 3?", "matematica"),
      tema("fracciones", "matematica"),
    ];
    const r = sanearTemas(sucios, "5basico");
    expect(r.map((t) => t.tema)).toEqual(["fracciones"]);
  });

  it("CONSERVA temas reales aunque no sean etapas del banco", () => {
    // aprendizaje genuino: no son etapas, pero el apoderado los ve y Rai los recuerda
    const r = sanearTemas([tema("sustantivos", "lenguaje", "superado"), tema("balanza", "matematica")], "5basico");
    expect(r.map((t) => t.tema).sort()).toEqual(["balanza", "sustantivos"]);
  });

  it("fusiona las variantes por tilde conservando el mejor estado", () => {
    const r = sanearTemas(
      [tema("articulos", "lenguaje", "en_proceso"), tema("artículos", "lenguaje", "superado")],
      "5basico"
    );
    expect(r).toHaveLength(1);
    expect(r[0].tema).toBe("articulos");
    expect(r[0].estado).toBe("superado");
  });

  it("no mezcla el mismo tema de materias distintas", () => {
    const r = sanearTemas([tema("ortografia", "lenguaje"), tema("ortografia", "matematica")], "5basico");
    expect(r).toHaveLength(2);
  });

  it("las etapas canónicas pasan intactas", () => {
    const r = sanearTemas([tema("fracciones", "matematica", "superado")], "5basico");
    expect(r[0]).toMatchObject({ tema: "fracciones", estado: "superado" });
    expect(r[0].evidencias).toHaveLength(1);
  });

  it("aguanta entradas corruptas sin reventar", () => {
    const r = sanearTemas(
      [{ tema: "", materia: "matematica" } as TemaDominio, tema("fracciones", "matematica")],
      "5basico"
    );
    expect(r.map((t) => t.tema)).toEqual(["fracciones"]);
  });
});
