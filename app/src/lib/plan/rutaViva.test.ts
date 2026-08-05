// PRUEBA DE REGRESIÓN DE LA CADENA COMPLETA
//
// El bug que originó todo esto no vivía en ninguna función: vivía en el cable
// entre ellas. Cada pieza estaba bien y el mapa igual no se movía, porque la
// evidencia aterrizaba con la materia equivocada o con una clave que ninguna
// etapa lee. Por eso esta prueba recorre el camino entero —lo que responde el
// LLM → emparejar → aplicarCierre → etapasDeMateria— en vez de una unidad.

import { describe, expect, it } from "vitest";
import { emparejarConRuta } from "./claveTema";
import { etapasDeMateria, rutaDeTemas } from "./etapas";
import { materiaDeClase } from "@/lib/tutor/clase";
import { aplicarCierre, registrarEjercicios, type AcuerdoTutoria } from "@/lib/tutor/acuerdo";

const acuerdoBase = (): AcuerdoTutoria => ({
  creadoEn: "2026-07-01T00:00:00Z",
  horario: { lun: ["lenguaje"] }, // el horario dice LENGUAJE
  notasNino: "",
  sesiones: [],
});

const RUTA_MAT = rutaDeTemas("matematica", "5basico");

// Lo que Gemini devuelve de verdad al cerrar (verificado en vivo contra la API).
function cerrarSesionComoElLlm(tema: string) {
  return {
    temasTrabajados: [
      { tema: emparejarConRuta(tema, RUTA_MAT), materia: "matematica" as const, resultado: "supero" as const },
    ],
  };
}

describe("una clase con Rai mueve el camino del niño", () => {
  it("el niño elige una etapa de OTRA materia que la agendada y la evidencia igual aterriza bien", () => {
    // hoy tocaba lenguaje; el niño abrió la etapa de fracciones (matemática)
    const materia = materiaDeClase("matematica", ["lenguaje"], ["matematica", "lenguaje"]);
    expect(materia).toBe("matematica");

    // trabaja fracciones: primero evidencia dura, después el juicio de Rai
    let a = registrarEjercicios(acuerdoBase(), "fracciones", materia, 5, 6, "2026-07-10");
    a = aplicarCierre(a, cerrarSesionComoElLlm("fracciones"), "2026-07-10");

    const guardado = a.temas!.find((t) => t.tema === "fracciones");
    expect(guardado?.materia).toBe("matematica"); // NO lenguaje
    expect(guardado?.estado).toBe("superado");

    // y el mapa de matemática lo refleja
    const etapa = etapasDeMateria("matematica", "5basico", a).find((e) => e.tema === "fracciones");
    expect(etapa?.estado).toBe("superada");
  });

  it("la variante con tildes y espacios del LLM llega a la etapa correcta", () => {
    let a = registrarEjercicios(acuerdoBase(), "resolucion_problemas", "matematica", 5, 6, "2026-07-10");
    a = aplicarCierre(a, cerrarSesionComoElLlm("Resolución de problemas"), "2026-07-11");

    const etapa = etapasDeMateria("matematica", "5basico", a).find(
      (e) => e.tema === "resolucion_problemas"
    );
    expect(etapa?.estado).toBe("superada");
  });

  it("sin el arreglo, la evidencia habría quedado en un tema que el mapa no lee", () => {
    // así se guardaba antes: clave cruda del LLM, sin emparejar
    const a = aplicarCierre(
      acuerdoBase(),
      {
        temasTrabajados: [
          { tema: "resolución de problemas", materia: "matematica", resultado: "supero" },
        ],
      },
      "2026-07-11"
    );
    // el tema existe en la memoria…
    expect(a.temas!.some((t) => t.tema === "resolución de problemas")).toBe(true);
    // …pero ninguna etapa del camino lo reconoce
    const etapas = etapasDeMateria("matematica", "5basico", a);
    expect(etapas.every((e) => e.estado !== "superada")).toBe(true);
  });
});
