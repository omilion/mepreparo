import { describe, expect, it } from "vitest";
import { indicadorExamen } from "./indicador";
import type { AcuerdoTutoria } from "@/lib/tutor/acuerdo";

const acuerdoCon = (temas: AcuerdoTutoria["temas"]): AcuerdoTutoria => ({
  creadoEn: "2026-07-01T00:00:00Z",
  horario: {},
  notasNino: "",
  sesiones: [],
  temas,
});

describe("indicadorExamen", () => {
  it("sin camino armado (materia/curso sin ruta): 0% y sin reventar", () => {
    const r = indicadorExamen("ingles", "1basico", null, "2026-09-01");
    expect(r.porcentaje).toBe(0);
    expect(r.temaFlojo).toBeNull();
  });

  it("perfil avanzado da un % claramente mayor que uno atrasado, con textos distintos", () => {
    const ruta = ["division", "multiplicacion", "numeros", "decimales", "fracciones", "algebra", "geometria", "resolucion_problemas"];
    const avanzado = acuerdoCon(
      ruta.slice(0, 6).map((tema) => ({
        tema,
        materia: "matematica" as const,
        estado: "superado" as const,
        evidencias: [],
        actualizadoEn: "2026-07-10",
      }))
    );
    const atrasado = acuerdoCon([
      { tema: "division", materia: "matematica", estado: "le_cuesta", evidencias: [], actualizadoEn: "2026-07-10" },
    ]);

    const rAv = indicadorExamen("matematica", "5basico", avanzado, "2026-09-01");
    const rAt = indicadorExamen("matematica", "5basico", atrasado, "2026-09-01");

    expect(rAv.porcentaje).toBeGreaterThan(rAt.porcentaje);
    expect(rAv.texto).not.toBe(rAt.texto);
    expect(rAt.temaFlojo).toBe("División");
  });

  it("todo superado: 100% y sin tema flojo que mencionar", () => {
    const ruta = ["division", "multiplicacion", "numeros", "decimales", "fracciones", "algebra", "geometria", "resolucion_problemas"];
    const completo = acuerdoCon(
      ruta.map((tema) => ({
        tema,
        materia: "matematica" as const,
        estado: "superado" as const,
        evidencias: [],
        actualizadoEn: "2026-07-10",
      }))
    );
    const r = indicadorExamen("matematica", "5basico", completo, "2026-09-01");
    expect(r.porcentaje).toBe(100);
    expect(r.temaFlojo).toBeNull();
  });

  it("calcula los días al examen a partir de la fecha", () => {
    const hoy = new Date();
    const enUnaSemana = new Date(hoy);
    enUnaSemana.setDate(hoy.getDate() + 7);
    // OJO: toISOString() da la fecha en UTC, que puede caer en otro día
    // calendario que el local (diasHastaExamen compara en hora LOCAL). Se arma
    // el ISO a mano con los componentes locales para no desfasar el test.
    const y = enUnaSemana.getFullYear();
    const m = String(enUnaSemana.getMonth() + 1).padStart(2, "0");
    const d = String(enUnaSemana.getDate()).padStart(2, "0");
    const iso = `${y}-${m}-${d}`;
    const r = indicadorExamen("matematica", "5basico", null, iso);
    expect(r.dias).toBe(7);
  });

  it("sin fecha de examen: dias es null", () => {
    const r = indicadorExamen("matematica", "5basico", null, null);
    expect(r.dias).toBeNull();
  });
});
