import { describe, expect, it } from "vitest";
import { estadoDelAlumno, avanceGeneral, diasDesdeUltimaSesion } from "./estadoAlumno";
import type { PerfilNino } from "@/lib/profile";
import type { AcuerdoTutoria, SesionTutoria, TemaDominio } from "@/lib/tutor/acuerdo";

const AHORA = new Date("2026-08-06T12:00:00Z");
const haceDias = (n: number) => new Date(AHORA.getTime() - n * 86_400_000).toISOString();

const sesion = (diasAtras: number): SesionTutoria => ({
  fecha: haceDias(diasAtras),
  duracionMin: 25,
  dia: "lun",
  materia: "matematica",
  titulo: "x",
  resumen: "x",
  nMensajes: 10,
});

const tema = (t: string, estado: TemaDominio["estado"]): TemaDominio => ({
  tema: t,
  materia: "matematica",
  estado,
  evidencias: [],
  actualizadoEn: "2026-08-01",
});

const perfil = (acuerdo?: AcuerdoTutoria, examenFecha = "2026-12-01"): PerfilNino => ({
  id: "p1",
  nombre: "Emilia",
  curso: "5basico",
  examen: { fecha: examenFecha, materias: ["matematica"] },
  disponibilidad: { horasSemana: 10 },
  contexto: { intereses: [], estilos: [] },
  tutoria: acuerdo,
  creadoEn: "2026-07-01T00:00:00Z",
});

const acuerdo = (opts: Partial<AcuerdoTutoria> = {}): AcuerdoTutoria => ({
  creadoEn: "2026-07-01T00:00:00Z",
  horario: {},
  notasNino: "",
  sesiones: [sesion(1)],
  ...opts,
});

describe("diasDesdeUltimaSesion", () => {
  it("cuenta desde la última sesión", () => {
    expect(diasDesdeUltimaSesion(perfil(acuerdo({ sesiones: [sesion(3)] })), AHORA)).toBe(3);
  });

  it("sin sesiones devuelve null, no cero", () => {
    expect(diasDesdeUltimaSesion(perfil(acuerdo({ sesiones: [] })), AHORA)).toBeNull();
  });
});

describe("estadoDelAlumno", () => {
  it("quien no ha empezado no aparece como alerta", () => {
    const e = estadoDelAlumno(perfil(undefined), AHORA);
    expect(e.nivel).toBe("sin_datos");
    expect(e.titulo).toBe("Aún no comienza");
  });

  it("5 días sin estudiar es alerta, y lo dice con el número", () => {
    const e = estadoDelAlumno(perfil(acuerdo({ sesiones: [sesion(5)] })), AHORA);
    expect(e.nivel).toBe("alerta");
    expect(e.titulo).toContain("5 días");
  });

  it("4 días todavía no lo es (el umbral es el mismo del correo)", () => {
    expect(estadoDelAlumno(perfil(acuerdo({ sesiones: [sesion(4)] })), AHORA).nivel).not.toBe("alerta");
  });

  it("la inactividad manda sobre lo demás: sin estudiar, nada más importa", () => {
    const a = acuerdo({
      sesiones: [sesion(9)],
      temas: [tema("fracciones", "le_cuesta"), tema("algebra", "le_cuesta"), tema("numeros", "le_cuesta")],
    });
    expect(estadoDelAlumno(perfil(a), AHORA).titulo).toContain("9 días");
  });

  it("3 temas en rojo es atención, no alerta", () => {
    const a = acuerdo({
      temas: [tema("fracciones", "le_cuesta"), tema("algebra", "le_cuesta"), tema("numeros", "le_cuesta")],
    });
    const e = estadoDelAlumno(perfil(a), AHORA);
    expect(e.nivel).toBe("atencion");
    expect(e.titulo).toContain("3 temas");
  });

  it("2 temas en rojo todavía es ritmo normal", () => {
    const a = acuerdo({ temas: [tema("fracciones", "le_cuesta"), tema("algebra", "le_cuesta")] });
    expect(estadoDelAlumno(perfil(a), AHORA).nivel).toBe("normal");
  });

  it("cuando no hay nada que reportar lo DICE, no se queda callado", () => {
    const e = estadoDelAlumno(perfil(acuerdo()), AHORA);
    expect(e.nivel).toBe("normal");
    expect(e.titulo).toBe("Ritmo normal");
  });

  it("un examen encima con poco avance sale como alerta de plan apretado", () => {
    // 3 días para el examen y 10 h/semana: no alcanza
    const e = estadoDelAlumno(perfil(acuerdo(), "2026-08-09"), AHORA);
    expect(e.nivel).toBe("alerta");
    expect(e.titulo).toContain("apretado");
  });
});

describe("avanceGeneral", () => {
  it("sin materias no revienta", () => {
    const p = { ...perfil(acuerdo()), examen: { fecha: "2026-12-01", materias: [] } };
    expect(avanceGeneral(p)).toBe(0);
  });

  it("devuelve un porcentaje entre 0 y 100", () => {
    const a = avanceGeneral(perfil(acuerdo()));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(100);
  });
});
