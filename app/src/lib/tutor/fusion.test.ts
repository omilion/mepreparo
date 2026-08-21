import { describe, expect, test } from "vitest";
import {
  fusionarDiagnostico,
  fusionarTemasDominio,
  fusionarSesiones,
  fusionarTutoria,
  fusionarPerfilNino,
} from "./fusion";
import type { PerfilNino } from "@/lib/profile";
import type { TemaDominio, SesionTutoria } from "./acuerdo";

describe("Fusión de PerfilNino y datos de tutoría", () => {
  test("fusionarDiagnostico unifica brechas y conserva avances", () => {
    const diagBase = {
      matematica: { nivel: 0.6, brechas: ["fracciones"] },
    };
    const diagEntrante = {
      lenguaje: { nivel: 0.8, brechas: ["comprension_lectora"] },
      matematica: { nivel: 0.7, brechas: ["geometria"] },
    };

    const res = fusionarDiagnostico(diagBase, diagEntrante);
    expect(res?.matematica?.nivel).toBe(0.7);
    expect(res?.matematica?.brechas).toEqual(["fracciones", "geometria"]);
    expect(res?.lenguaje?.nivel).toBe(0.8);
    expect(res?.lenguaje?.brechas).toEqual(["comprension_lectora"]);
  });

  test("fusionarTemasDominio promueve a superado y deduplica evidencias", () => {
    const temasBase: TemaDominio[] = [
      {
        tema: "fracciones",
        materia: "matematica",
        estado: "le_cuesta",
        evidencias: [
          { fecha: "2026-08-20T10:00:00Z", tipo: "ejercicios", nota: "2/5" },
        ],
        actualizadoEn: "2026-08-20T10:00:00Z",
      },
    ];

    const temasEntrante: TemaDominio[] = [
      {
        tema: "fracciones",
        materia: "matematica",
        estado: "superado",
        evidencias: [
          { fecha: "2026-08-20T10:00:00Z", tipo: "ejercicios", nota: "2/5" }, // duplicada
          { fecha: "2026-08-21T11:00:00Z", tipo: "prueba_etapa", nota: "8/8" },
        ],
        actualizadoEn: "2026-08-21T11:00:00Z",
      },
      {
        tema: "decimales",
        materia: "matematica",
        estado: "en_proceso",
        evidencias: [],
        actualizadoEn: "2026-08-21T11:00:00Z",
      },
    ];

    const res = fusionarTemasDominio(temasBase, temasEntrante);
    expect(res.length).toBe(2);

    const fracciones = res.find((t) => t.tema === "fracciones");
    expect(fracciones?.estado).toBe("superado");
    expect(fracciones?.evidencias.length).toBe(2);
    expect(fracciones?.actualizadoEn).toBe("2026-08-21T11:00:00Z");
  });

  test("fusionarSesiones unifica cronológicamente sin duplicados", () => {
    const s1: SesionTutoria = {
      fecha: "2026-08-20T10:00:00Z",
      duracionMin: 20,
      dia: "jue",
      materia: "matematica",
      titulo: "Fracciones",
      resumen: "Aprendió concepto básico",
      nMensajes: 15,
    };

    const s2: SesionTutoria = {
      fecha: "2026-08-21T10:00:00Z",
      duracionMin: 25,
      dia: "vie",
      materia: "ciencias",
      titulo: "Fotosíntesis",
      resumen: "Entendió clorofila",
      nMensajes: 18,
    };

    const res = fusionarSesiones([s1], [s1, s2]);
    expect(res.length).toBe(2);
    expect(res[0].titulo).toBe("Fracciones");
    expect(res[1].titulo).toBe("Fotosíntesis");
  });

  test("fusionarPerfilNino nunca pierde avances ni si el timestamp entrante es más antiguo", () => {
    const base: PerfilNino = {
      id: "pupilo-1",
      nombre: "Sofi",
      curso: "5basico",
      examen: { fecha: "2026-11-01", materias: ["matematica"] },
      disponibilidad: { horasSemana: 5 },
      contexto: { intereses: ["Deportes"], estilos: [], logrosVistos: ["primer_paso"] },
      tutoria: {
        creadoEn: "2026-08-01T00:00:00Z",
        horario: {},
        notasNino: "",
        sesiones: [],
        temas: [
          {
            tema: "geometria",
            materia: "matematica",
            estado: "superado",
            evidencias: [{ fecha: "2026-08-15T00:00:00Z", tipo: "prueba_etapa", nota: "8/8" }],
            actualizadoEn: "2026-08-15T00:00:00Z",
          },
        ],
      },
      creadoEn: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-20T10:00:00Z",
    };

    // Dispositivo B envía un update viejo donde geometría aún no estaba superado
    const entranteViejo: PerfilNino = {
      id: "pupilo-1",
      nombre: "Sofi",
      curso: "5basico",
      examen: { fecha: "2026-11-01", materias: ["matematica"] },
      disponibilidad: { horasSemana: 5 },
      contexto: { intereses: ["Deportes"], estilos: [], logrosVistos: ["explorador"] },
      tutoria: {
        creadoEn: "2026-08-01T00:00:00Z",
        horario: {},
        notasNino: "",
        sesiones: [],
        temas: [
          {
            tema: "geometria",
            materia: "matematica",
            estado: "le_cuesta",
            evidencias: [{ fecha: "2026-08-10T00:00:00Z", tipo: "ejercicios", nota: "1/5" }],
            actualizadoEn: "2026-08-10T00:00:00Z",
          },
        ],
      },
      creadoEn: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-10T00:00:00Z",
    };

    const fusionado = fusionarPerfilNino(base, entranteViejo);

    // Geometría DEBE seguir estando superado
    const geometria = fusionado.tutoria?.temas?.find((t) => t.tema === "geometria");
    expect(geometria?.estado).toBe("superado");
    expect(geometria?.evidencias.length).toBe(2);

    // Logros vistos deben unificarse
    expect(fusionado.contexto.logrosVistos).toEqual(["primer_paso", "explorador"]);
  });
});
