import { describe, expect, it } from "vitest";
import { costoClp, costoUsd, CLP_POR_USD } from "./costoGemini";
import { MODELO_CHAT, MODELO_LITE } from "./tutor/gemini";

describe("costoGemini", () => {
  it("sin tokens: costo 0", () => {
    expect(costoUsd(0, 0, MODELO_CHAT)).toBe(0);
  });

  it("el modelo lite es más barato que el modelo completo para el mismo uso", () => {
    const chat = costoUsd(1000, 500, MODELO_CHAT);
    const lite = costoUsd(1000, 500, MODELO_LITE);
    expect(lite).toBeLessThan(chat);
  });

  it("más tokens de salida cuestan más (el output es más caro que el input)", () => {
    const soloIn = costoUsd(1_000_000, 0, MODELO_CHAT);
    const soloOut = costoUsd(0, 1_000_000, MODELO_CHAT);
    expect(soloOut).toBeGreaterThan(soloIn);
  });

  it("costoClp es costoUsd convertido con CLP_POR_USD", () => {
    const usd = costoUsd(2000, 800, MODELO_LITE);
    expect(costoClp(2000, 800, MODELO_LITE)).toBeCloseTo(usd * CLP_POR_USD, 6);
  });

  it("una llamada típica de sesión queda muy por debajo de CLP 20 (meta del plan)", () => {
    // una respuesta de chat típica: ~800 tokens de entrada, ~250 de salida
    const clp = costoClp(800, 250, MODELO_CHAT);
    expect(clp).toBeLessThan(20);
  });

  it("modelo desconocido usa el precio por defecto (conservador) sin reventar", () => {
    expect(() => costoUsd(1000, 1000, "modelo-inexistente")).not.toThrow();
    expect(costoUsd(1000, 1000, "modelo-inexistente")).toBeGreaterThan(0);
  });
});
