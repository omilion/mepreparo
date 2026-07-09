import { describe, expect, it, vi } from "vitest";
import { calcularPlan } from "./motor";
import type { PerfilNino } from "@/lib/profile";

// Mock para diasHastaExamen
vi.mock("@/lib/profile", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/profile")>();
  return {
    ...mod,
    diasHastaExamen: (fecha: string) => {
      if (fecha === "2026-07-16") return 7; // 7 días = 1 semana
      if (fecha === "2026-07-23") return 14; // 14 días = 2 semanas
      return null;
    },
  };
});

const basePerfil: PerfilNino = {
  id: "test_nino",
  nombre: "Mateo",
  curso: "5basico",
  examen: {
    fecha: "2026-07-16", // 7 días (1 semana)
    materias: ["matematica", "lenguaje"],
  },
  disponibilidad: {
    horasSemana: 10,
  },
  contexto: {
    intereses: [],
    estilos: [],
  },
  diagnostico: {
    matematica: {
      nivel: 0.8, // bastante bien
      brechas: ["division"],
    },
    lenguaje: {
      nivel: 0.3, // necesita bastante ayuda
      brechas: ["comprension", "ortografia"],
    },
  },
  creadoEn: "2026-07-09T00:00:00Z",
};

describe("Motor de Plan de Estudio", () => {
  it("debe calcular el plan estimando prioridades según el nivel de diagnóstico", () => {
    const plan = calcularPlan(basePerfil);

    expect(plan.materias).toHaveLength(2);
    // Prioridad 1 para Lenguaje (nivel 0.3), Prioridad 2 para Matemática (nivel 0.8)
    const matPlan = plan.materias.find((m) => m.materia === "matematica");
    const lenPlan = plan.materias.find((m) => m.materia === "lenguaje");

    expect(lenPlan?.prioridad).toBe(1);
    expect(matPlan?.prioridad).toBe(2);
  });

  it("debe calcular el veredicto 'holgura' si las horas disponibles son superiores al 120%", () => {
    const perfilHolgado = {
      ...basePerfil,
      disponibilidad: {
        horasSemana: 40, // Mucho tiempo disponible
      },
    };

    const plan = calcularPlan(perfilHolgado);
    expect(plan.veredicto).toBe("holgura");
  });

  it("debe calcular el veredicto 'apretado' y sugerir horas adicionales si el tiempo es insuficiente", () => {
    const perfilApretado = {
      ...basePerfil,
      disponibilidad: {
        horasSemana: 1, // Insuficiente
      },
    };

    const plan = calcularPlan(perfilApretado);
    expect(plan.veredicto).toBe("apretado");
    expect(plan.horasSemanaSugeridas).toBeGreaterThan(1);
  });
});
