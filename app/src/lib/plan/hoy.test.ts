import { describe, expect, it } from "vitest";
import { queHacerHoy, yaEstudioHoy } from "./hoy";
import type { PerfilNino } from "@/lib/profile";
import type { AcuerdoTutoria } from "@/lib/tutor/acuerdo";
import { diaDeHoy } from "@/lib/tutor/acuerdo";

const perfilBase = (acuerdo: AcuerdoTutoria | null): PerfilNino => ({
  id: "p1",
  nombre: "Emilia",
  curso: "5basico",
  examen: { fecha: "2026-09-01", materias: ["matematica", "lenguaje"] },
  disponibilidad: { horasSemana: 6 },
  contexto: { intereses: [], estilos: [] },
  tutoria: acuerdo ?? undefined,
  creadoEn: "2026-07-01T00:00:00Z",
});

const acuerdoCon = (opts: Partial<AcuerdoTutoria> = {}): AcuerdoTutoria => ({
  creadoEn: "2026-07-01T00:00:00Z",
  horario: {},
  notasNino: "",
  sesiones: [],
  ...opts,
});

describe("queHacerHoy", () => {
  it("sin tutoria (nunca habló con Rai): no hay plan de hoy", () => {
    expect(queHacerHoy(perfilBase(null), "5basico")).toBeNull();
  });

  it("elige la materia agendada para el día de hoy", () => {
    const hoy = diaDeHoy();
    const acuerdo = acuerdoCon({ horario: { [hoy]: ["lenguaje"] } });
    const plan = queHacerHoy(perfilBase(acuerdo), "5basico");
    expect(plan?.materia).toBe("lenguaje");
  });

  it("sin nada agendado hoy, cae a la primera materia del examen", () => {
    const acuerdo = acuerdoCon({ horario: {} });
    const plan = queHacerHoy(perfilBase(acuerdo), "5basico");
    expect(plan?.materia).toBe("matematica");
  });

  it("la etapa elegida es la 'actual' del camino de esa materia", () => {
    const acuerdo = acuerdoCon({ horario: {} });
    const plan = queHacerHoy(perfilBase(acuerdo), "5basico");
    expect(plan?.etapa.estado).toBe("actual");
  });

  it("reparte las horas/semana entre los días agendados (3 días, 6h → 120min/día, tope 60)", () => {
    const acuerdo = acuerdoCon({
      horario: { lun: ["matematica"], mie: ["matematica"], vie: ["matematica"] },
    });
    const plan = queHacerHoy(perfilBase(acuerdo), "5basico");
    expect(plan?.minutos).toBe(60); // 6h/3días = 120min, tope 60
  });

  it("sin horario agendado usa el default de 20 minutos", () => {
    const acuerdo = acuerdoCon({ horario: {} });
    const plan = queHacerHoy(perfilBase(acuerdo), "5basico");
    expect(plan?.minutos).toBe(20);
  });
});

describe("yaEstudioHoy", () => {
  it("sin sesiones: false", () => {
    expect(yaEstudioHoy(perfilBase(acuerdoCon()))).toBe(false);
  });

  it("con una sesión de hoy: true", () => {
    const acuerdo = acuerdoCon({
      sesiones: [
        {
          fecha: new Date().toISOString(),
          duracionMin: 20,
          dia: diaDeHoy(),
          materia: "matematica",
          titulo: "x",
          resumen: "x",
          nMensajes: 5,
        },
      ],
    });
    expect(yaEstudioHoy(perfilBase(acuerdo))).toBe(true);
  });

  it("con una sesión de ayer: false", () => {
    const ayer = new Date(Date.now() - 86_400_000).toISOString();
    const acuerdo = acuerdoCon({
      sesiones: [
        { fecha: ayer, duracionMin: 20, dia: diaDeHoy(), materia: "matematica", titulo: "x", resumen: "x", nMensajes: 5 },
      ],
    });
    expect(yaEstudioHoy(perfilBase(acuerdo))).toBe(false);
  });
});
