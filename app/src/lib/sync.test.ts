import { describe, expect, test, vi, beforeEach } from "vitest";
import { fusionarPerfilNino, fusionarDiagnostico, fusionarTemasDominio, fusionarSesiones } from "./tutor/fusion";
import type { PerfilNino, Cuenta } from "./profile";
import { sincronizarConServidor } from "./storage";

describe("Certificación de Sincronización y Persistencia de Avances", () => {
  const pupiloOriginal: PerfilNino = {
    id: "nino-100",
    nombre: "Gabriel",
    curso: "6basico",
    examen: { fecha: "2026-11-15", materias: ["matematica", "ciencias"] },
    disponibilidad: { horasSemana: 4 },
    contexto: { intereses: ["Videojuegos"], estilos: ["Paso a paso"], logrosVistos: ["primer_logro"] },
    diagnostico: {
      matematica: { nivel: 0.8, brechas: [] },
    },
    tutoria: {
      creadoEn: "2026-08-01T10:00:00Z",
      horario: { lun: ["matematica"] },
      notasNino: "Le gustan las fracciones",
      sesiones: [
        {
          fecha: "2026-08-10T10:00:00Z",
          duracionMin: 20,
          dia: "lun",
          materia: "matematica",
          titulo: "Fracciones I",
          resumen: "Buen avance",
          nMensajes: 12,
        },
      ],
      temas: [
        {
          tema: "fracciones",
          materia: "matematica",
          estado: "en_proceso",
          evidencias: [{ fecha: "2026-08-10T10:00:00Z", tipo: "ejercicios", nota: "3/5" }],
          actualizadoEn: "2026-08-10T10:00:00Z",
        },
      ],
    },
    creadoEn: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-10T10:00:00Z",
  };

  test("Cenáculo de Concurrencia: Dispositivo A y B avanzan materias distintas en paralelo", () => {
    // Dispositivo A aprueba Ciencias
    const dispA: PerfilNino = {
      ...pupiloOriginal,
      updatedAt: "2026-08-21T10:00:00Z",
      diagnostico: {
        ...pupiloOriginal.diagnostico,
        ciencias: { nivel: 0.9, brechas: [] },
      },
    };

    // Dispositivo B aprueba prueba de etapa de Fracciones en Matemática
    const dispB: PerfilNino = {
      ...pupiloOriginal,
      updatedAt: "2026-08-21T10:05:00Z",
      tutoria: {
        ...pupiloOriginal.tutoria!,
        temas: [
          {
            tema: "fracciones",
            materia: "matematica",
            estado: "superado",
            evidencias: [
              { fecha: "2026-08-10T10:00:00Z", tipo: "ejercicios", nota: "3/5" },
              { fecha: "2026-08-21T10:05:00Z", tipo: "prueba_etapa", nota: "8/8" },
            ],
            actualizadoEn: "2026-08-21T10:05:00Z",
          },
        ],
      },
    };

    const resultadoUnificado = fusionarPerfilNino(dispA, dispB);

    // Ambas materias deben estar preservadas
    expect(resultadoUnificado.diagnostico?.matematica?.nivel).toBe(0.8);
    expect(resultadoUnificado.diagnostico?.ciencias?.nivel).toBe(0.9);

    // El tema fracciones DEBE estar superado con las 2 evidencias
    const temaFracciones = resultadoUnificado.tutoria?.temas?.find((t) => t.tema === "fracciones");
    expect(temaFracciones?.estado).toBe("superado");
    expect(temaFracciones?.evidencias.length).toBe(2);
  });

  test("Idempotencia y deduplicación de sesiones", () => {
    const sesionDuplicada = {
      fecha: "2026-08-10T10:00:00Z",
      duracionMin: 20,
      dia: "lun" as const,
      materia: "matematica" as const,
      titulo: "Fracciones I",
      resumen: "Buen avance",
      nMensajes: 12,
    };

    const unificadas = fusionarSesiones([sesionDuplicada], [sesionDuplicada, sesionDuplicada]);
    expect(unificadas.length).toBe(1);
  });

  test("Modo Offline: fallos de red no corrompen ni vacían la cuenta", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network Error"));
    vi.stubGlobal("fetch", fetchMock);

    const cuentaBase: Cuenta = {
      id: "cuenta-1",
      pupilos: [pupiloOriginal],
      creadaEn: "2026-08-01T10:00:00Z",
    };

    const resultado = await sincronizarConServidor(cuentaBase);
    expect(resultado).toEqual(cuentaBase);
    expect(resultado.pupilos.length).toBe(1);

    vi.unstubAllGlobals();
  });
});
