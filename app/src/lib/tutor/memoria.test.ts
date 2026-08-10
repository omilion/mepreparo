import { describe, it, expect } from "vitest";
import {
  aplicarCierre,
  sembrarTemasDesdeDiagnostico,
  registrarEjercicios,
  memoriaParaHoy,
  textoMemoria,
  type AcuerdoTutoria,
} from "./acuerdo";

const base = (): AcuerdoTutoria => ({
  creadoEn: "2026-07-01T10:00:00.000Z",
  horario: { lun: ["matematica"] },
  notasNino: "",
  sesiones: [],
});

describe("aplicarCierre (capa 2 + 3)", () => {
  it("crea un tema nuevo con el estado según el resultado", () => {
    const a = aplicarCierre(
      base(),
      { temasTrabajados: [{ tema: "Fracciones", materia: "matematica", resultado: "le_costo" }] },
      "2026-07-02"
    );
    expect(a.temas).toHaveLength(1);
    expect(a.temas![0].tema).toBe("fracciones"); // normalizado a minúsculas
    expect(a.temas![0].estado).toBe("le_cuesta");
    expect(a.temas![0].evidencias[0].tipo).toBe("juicio_rai");
  });

  // El juicio de Rai por sí solo NO da un tema por superado: registrarEjercicios
  // exige ≥4 ejercicios y ≥80%, y aceptar la impresión del tutor sin umbral
  // inflaba el indicador "listo para tu examen" y el logro "materia completa".
  it("un solo 'supero' sin respaldo reconoce el avance, pero no da el tema por superado", () => {
    const a = aplicarCierre(
      base(),
      { temasTrabajados: [{ tema: "fracciones", materia: "matematica", resultado: "supero" }] },
      "2026-07-02"
    );
    expect(a.temas![0].estado).toBe("en_proceso");
  });

  it("'supero' sostenido en DOS sesiones distintas sí llega a superado", () => {
    let a = aplicarCierre(
      base(),
      { temasTrabajados: [{ tema: "fracciones", materia: "matematica", resultado: "supero" }] },
      "2026-07-02"
    );
    a = aplicarCierre(
      a,
      { temasTrabajados: [{ tema: "fracciones", materia: "matematica", resultado: "supero" }] },
      "2026-07-04"
    );
    expect(a.temas![0].estado).toBe("superado");
  });

  it("'supero' respaldado por evidencia dura previa llega a superado de una", () => {
    let a = registrarEjercicios(base(), "fracciones", "matematica", 5, 6, "2026-07-02");
    a = aplicarCierre(
      a,
      { temasTrabajados: [{ tema: "fracciones", materia: "matematica", resultado: "supero" }] },
      "2026-07-03"
    );
    expect(a.temas![0].estado).toBe("superado");
  });

  it("'avanzo' posterior NO degrada un tema ya superado", () => {
    let a = registrarEjercicios(base(), "fracciones", "matematica", 5, 6, "2026-07-02");
    expect(a.temas![0].estado).toBe("superado");
    a = aplicarCierre(
      a,
      { temasTrabajados: [{ tema: "fracciones", materia: "matematica", resultado: "avanzo" }] },
      "2026-07-03"
    );
    expect(a.temas![0].estado).toBe("superado");
  });

  it("si vuelve a costar, sí baja de superado (señal real)", () => {
    let a = aplicarCierre(
      base(),
      { temasTrabajados: [{ tema: "fracciones", materia: "matematica", resultado: "supero" }] },
      "2026-07-02"
    );
    a = aplicarCierre(
      a,
      { temasTrabajados: [{ tema: "fracciones", materia: "matematica", resultado: "le_costo" }] },
      "2026-07-04"
    );
    expect(a.temas![0].estado).toBe("le_cuesta");
  });

  it("guarda la frase del niño como evidencia 'dijo' y los recuerdos con fecha", () => {
    const a = aplicarCierre(
      base(),
      {
        temasTrabajados: [
          { tema: "fracciones", materia: "matematica", resultado: "le_costo", fraseDelNino: "no las entiendo" },
        ],
        recuerdos: [{ tipo: "dificultad", texto: "dijo 'no las entiendo'", tema: "fracciones" }],
      },
      "2026-07-02"
    );
    const dijo = a.temas![0].evidencias.find((e) => e.tipo === "dijo");
    expect(dijo?.nota).toContain("no las entiendo");
    expect(a.recuerdos![0].fecha).toBe("2026-07-02");
  });
});

describe("sembrarTemasDesdeDiagnostico", () => {
  it("convierte brechas en temas le_cuesta sin duplicar", () => {
    let a = sembrarTemasDesdeDiagnostico(
      base(),
      { matematica: { nivel: 0.4, brechas: ["fracciones", "multiplicacion"] } },
      "2026-07-01"
    );
    a = sembrarTemasDesdeDiagnostico(a, { matematica: { nivel: 0.4, brechas: ["fracciones"] } });
    expect(a.temas).toHaveLength(2);
    expect(a.temas!.every((t) => t.estado === "le_cuesta")).toBe(true);
    expect(a.temas![0].evidencias[0].tipo).toBe("diagnostico");
  });
});

describe("registrarEjercicios (evidencia dura)", () => {
  it("≥80% con 4+ ejercicios marca superado", () => {
    const a = registrarEjercicios(base(), "fracciones", "matematica", 5, 6, "2026-07-05");
    expect(a.temas![0].estado).toBe("superado");
    expect(a.temas![0].evidencias[0].nota).toBe("5 de 6 correctos");
  });

  it("≤40% marca le_cuesta; zona media conserva el estado previo", () => {
    let a = registrarEjercicios(base(), "fracciones", "matematica", 1, 5, "2026-07-05");
    expect(a.temas![0].estado).toBe("le_cuesta");
    a = registrarEjercicios(a, "fracciones", "matematica", 2, 4, "2026-07-06"); // 50%
    expect(a.temas![0].estado).toBe("le_cuesta"); // conserva
  });
  it("acumula actividades individuales de Rai para reconocer dominio", () => {
    let a = base();
    for (let i = 0; i < 4; i++) {
      a = registrarEjercicios(a, "fracciones", "matematica", 1, 1, `2026-07-0${i + 1}`);
    }
    expect(a.temas![0].estado).toBe("superado");
  });
});

describe("memoriaParaHoy + textoMemoria", () => {
  it("filtra por la materia de hoy y produce texto compacto", () => {
    // la evidencia dura primero, para que el 'supero' de Rai sí consolide
    let a = registrarEjercicios(base(), "fracciones", "matematica", 5, 6, "2026-07-04");
    a = aplicarCierre(
      a,
      {
        temasTrabajados: [
          { tema: "fracciones", materia: "matematica", resultado: "supero", fraseDelNino: "ya las entiendo" },
          { tema: "comprension lectora", materia: "lenguaje", resultado: "avanzo" },
        ],
        recuerdos: [{ tipo: "logro", texto: "dijo 'ya las entiendo'", tema: "fracciones" }],
      },
      "2026-07-05"
    );
    const m = memoriaParaHoy(a, ["matematica"]);
    expect(m.temas).toHaveLength(1);
    expect(m.temas[0].tema).toBe("fracciones");
    const texto = textoMemoria(m);
    expect(texto).toContain("fracciones (superado)");
    expect(texto).toContain("ya las entiendo");
  });

  it("el tema de la etapa en curso entra aunque no sea el más reciente", () => {
    // fracciones se trabajó ANTES que otros dos temas, así que por fecha
    // quedaría fuera del corte de 2 — pero es la etapa que el niño abrió
    let a = aplicarCierre(
      base(),
      { temasTrabajados: [{ tema: "fracciones", materia: "matematica", resultado: "le_costo" }] },
      "2026-07-01"
    );
    a = aplicarCierre(
      a,
      { temasTrabajados: [{ tema: "geometria", materia: "matematica", resultado: "avanzo" }] },
      "2026-07-08"
    );
    a = aplicarCierre(
      a,
      { temasTrabajados: [{ tema: "decimales", materia: "matematica", resultado: "avanzo" }] },
      "2026-07-09"
    );

    const sinFoco = memoriaParaHoy(a, ["matematica"], 2);
    expect(sinFoco.temas.map((t) => t.tema)).not.toContain("fracciones");

    const conFoco = memoriaParaHoy(a, ["matematica"], 2, 3, "fracciones");
    expect(conFoco.temas[0].tema).toBe("fracciones");
  });

  it("sin materia de hoy devuelve lo más reciente de todo", () => {
    const a = aplicarCierre(
      base(),
      { temasTrabajados: [{ tema: "fracciones", materia: "matematica", resultado: "avanzo" }] },
      "2026-07-05"
    );
    const m = memoriaParaHoy(a, []);
    expect(m.temas).toHaveLength(1);
  });
});
