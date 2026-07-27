import { describe, it, expect } from "vitest";
import { recordarContenidos, MAX_VISTOS, type AcuerdoTutoria } from "./acuerdo";

// "El agente volvió a usar el mismo juego de una sesión anterior."
// La memoria de lo entregado vivía en un useRef y moría con la clase. Ahora va
// en el perfil del niño, que es lo que sobrevive y viaja con el sync.

const base: AcuerdoTutoria = {
  creadoEn: new Date().toISOString(),
  horario: {},
  notasNino: "",
  sesiones: [],
};

describe("contenidos ya vistos por el niño", () => {
  it("recuerda lo entregado en una clase", () => {
    const a = recordarContenidos(base, ["sopa-1", "secuencia-2"]);
    expect(a.contenidosVistos).toEqual(["sopa-1", "secuencia-2"]);
  });

  it("acumula entre sesiones sin duplicar", () => {
    const semana1 = recordarContenidos(base, ["sopa-1"]);
    const semana2 = recordarContenidos(semana1, ["intruso-9"]);
    const semana3 = recordarContenidos(semana2, ["sopa-1"]); // ya lo vio
    expect(semana3.contenidosVistos).toEqual(["intruso-9", "sopa-1"]);
  });

  it("no crece sin límite: conserva los más recientes", () => {
    let a = base;
    for (let i = 0; i < MAX_VISTOS + 25; i++) {
      a = recordarContenidos(a, [`juego-${i}`]);
    }
    expect(a.contenidosVistos).toHaveLength(MAX_VISTOS);
    // lo más viejo se soltó; lo último entregado sigue ahí
    expect(a.contenidosVistos).not.toContain("juego-0");
    expect(a.contenidosVistos).toContain(`juego-${MAX_VISTOS + 24}`);
  });

  it("ignora ids vacíos sin tocar el acuerdo", () => {
    expect(recordarContenidos(base, [])).toBe(base);
    expect(recordarContenidos(base, [""]).contenidosVistos).toBeUndefined();
  });
});
