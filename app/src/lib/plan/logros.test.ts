import { describe, expect, it } from "vitest";
import { logrosDesbloqueados, logrosNuevos } from "./logros";
import type { PerfilNino } from "@/lib/profile";
import type { AcuerdoTutoria, SesionTutoria, TemaDominio } from "@/lib/tutor/acuerdo";

const sesion = (): SesionTutoria => ({
  fecha: new Date().toISOString(),
  duracionMin: 20,
  dia: "lun",
  materia: "matematica",
  titulo: "x",
  resumen: "x",
  nMensajes: 5,
});

const perfilCon = (acuerdo?: AcuerdoTutoria): PerfilNino => ({
  id: "p1",
  nombre: "Emilia",
  curso: "5basico",
  examen: { fecha: "2026-09-01", materias: ["matematica"] },
  disponibilidad: { horasSemana: 6 },
  contexto: { intereses: [], estilos: [] },
  tutoria: acuerdo,
  creadoEn: "2026-07-01T00:00:00Z",
});

const tema = (t: string, estado: TemaDominio["estado"], evidencias: TemaDominio["evidencias"] = []): TemaDominio => ({
  tema: t,
  materia: "matematica",
  estado,
  evidencias,
  actualizadoEn: "2026-07-20",
});

describe("logrosDesbloqueados", () => {
  it("perfil sin tutoria: ningún logro", () => {
    expect(logrosDesbloqueados(perfilCon(undefined), "5basico", 0)).toEqual([]);
  });

  it("una sesión desbloquea 'primera_sesion'", () => {
    const acuerdo: AcuerdoTutoria = { creadoEn: "x", horario: {}, notasNino: "", sesiones: [sesion()] };
    expect(logrosDesbloqueados(perfilCon(acuerdo), "5basico", 1)).toContain("primera_sesion");
  });

  it("racha >= 3 desbloquea 'racha_3'; racha 2 no", () => {
    const acuerdo: AcuerdoTutoria = { creadoEn: "x", horario: {}, notasNino: "", sesiones: [] };
    expect(logrosDesbloqueados(perfilCon(acuerdo), "5basico", 3)).toContain("racha_3");
    expect(logrosDesbloqueados(perfilCon(acuerdo), "5basico", 2)).not.toContain("racha_3");
  });

  it("un tema superado desbloquea 'primera_etapa'", () => {
    const acuerdo: AcuerdoTutoria = { creadoEn: "x", horario: {}, notasNino: "", sesiones: [], temas: [tema("division", "superado")] };
    expect(logrosDesbloqueados(perfilCon(acuerdo), "5basico", 0)).toContain("primera_etapa");
  });

  it("evidencia tipo simulacro desbloquea 'primer_simulacro'", () => {
    const acuerdo: AcuerdoTutoria = {
      creadoEn: "x",
      horario: {},
      notasNino: "",
      sesiones: [],
      temas: [tema("division", "en_proceso", [{ fecha: "2026-07-20", tipo: "simulacro", nota: "3 de 5 correctos en simulacro" }])],
    };
    expect(logrosDesbloqueados(perfilCon(acuerdo), "5basico", 0)).toContain("primer_simulacro");
  });

  it("todas las etapas de una materia superadas desbloquea 'materia_completa'", () => {
    const ruta = ["division", "multiplicacion", "numeros", "decimales", "fracciones", "algebra", "geometria", "resolucion_problemas"];
    const acuerdo: AcuerdoTutoria = {
      creadoEn: "x",
      horario: {},
      notasNino: "",
      sesiones: [],
      temas: ruta.map((t) => tema(t, "superado")),
    };
    expect(logrosDesbloqueados(perfilCon(acuerdo), "5basico", 0)).toContain("materia_completa");
  });

  it("solo algunas etapas superadas NO desbloquea 'materia_completa'", () => {
    const acuerdo: AcuerdoTutoria = { creadoEn: "x", horario: {}, notasNino: "", sesiones: [], temas: [tema("division", "superado")] };
    expect(logrosDesbloqueados(perfilCon(acuerdo), "5basico", 0)).not.toContain("materia_completa");
  });
});

describe("logrosNuevos", () => {
  it("sin vistos previos, todos los desbloqueados son nuevos", () => {
    expect(logrosNuevos(["primera_sesion", "racha_3"], undefined)).toEqual(["primera_sesion", "racha_3"]);
  });

  it("filtra los que ya estaban en 'vistos'", () => {
    expect(logrosNuevos(["primera_sesion", "racha_3"], ["primera_sesion"])).toEqual(["racha_3"]);
  });

  it("si ya se vieron todos, no hay nuevos", () => {
    expect(logrosNuevos(["primera_sesion"], ["primera_sesion", "racha_3"])).toEqual([]);
  });
});
