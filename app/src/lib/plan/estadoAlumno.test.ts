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

  // Reportado con cuentas reales: 4 niñas que sí habían estudiado esa semana
  // (rindiendo pruebas de etapa, sin necesariamente una charla completa)
  // aparecían todas con 8+ días de inactividad — porque esto solo miraba
  // `sesiones`, y una prueba de etapa no genera una entrada ahí.
  it("una prueba de etapa reciente cuenta como actividad, aunque la última SESIÓN sea vieja", () => {
    const a = acuerdo({
      sesiones: [sesion(9)],
      temas: [
        {
          tema: "numeros",
          materia: "matematica",
          estado: "superado",
          evidencias: [{ fecha: "2026-08-06", tipo: "prueba_etapa", nota: "5 de 5 — aprobada", correctos: 5, total: 5 }],
          actualizadoEn: "2026-08-06",
        },
      ],
    });
    expect(diasDesdeUltimaSesion(perfil(a), AHORA)).toBe(0);
  });

  it("un ejercicio suelto (sin sesión cerrada ese día) también cuenta", () => {
    const a = acuerdo({
      sesiones: [sesion(9)],
      temas: [
        {
          tema: "ortografia",
          materia: "matematica",
          estado: "en_proceso",
          evidencias: [{ fecha: "2026-08-04", tipo: "ejercicios", nota: "1 de 1 correctos", correctos: 1, total: 1 }],
          actualizadoEn: "2026-08-04",
        },
      ],
    });
    // AHORA es 2026-08-06T12:00Z; el ejercicio se ancla al final del
    // 2026-08-04 (UTC) → ~1.5 días de diferencia, floor = 1.
    expect(diasDesdeUltimaSesion(perfil(a), AHORA)).toBe(1);
  });

  it("sin sesiones pero con evidencia reciente: NO es null", () => {
    const a = acuerdo({
      sesiones: [],
      temas: [
        {
          tema: "numeros",
          materia: "matematica",
          estado: "en_proceso",
          evidencias: [{ fecha: "2026-08-06", tipo: "ejercicios", nota: "1 de 1 correctos", correctos: 1, total: 1 }],
          actualizadoEn: "2026-08-06",
        },
      ],
    });
    expect(diasDesdeUltimaSesion(perfil(a), AHORA)).toBe(0);
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

  it("prueba de etapa reciente evita la falsa alerta de inactividad, aunque la última sesión sea vieja", () => {
    const a = acuerdo({
      sesiones: [sesion(9)],
      temas: [
        {
          tema: "numeros",
          materia: "matematica",
          estado: "superado",
          evidencias: [{ fecha: "2026-08-06", tipo: "prueba_etapa", nota: "5 de 5 — aprobada", correctos: 5, total: 5 }],
          actualizadoEn: "2026-08-06",
        },
      ],
    });
    expect(estadoDelAlumno(perfil(a), AHORA).nivel).not.toBe("alerta");
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
