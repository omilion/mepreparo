import { describe, expect, it } from "vitest";
import { calcularRacha } from "./racha";
import type { SesionTutoria } from "@/lib/tutor/acuerdo";

const sesion = (diasAtras: number): SesionTutoria => {
  const f = new Date();
  f.setDate(f.getDate() - diasAtras);
  return {
    fecha: f.toISOString(),
    duracionMin: 20,
    dia: "lun",
    materia: "matematica",
    titulo: "x",
    resumen: "x",
    nMensajes: 5,
  };
};

describe("calcularRacha", () => {
  it("sin sesiones: 0", () => {
    expect(calcularRacha([])).toBe(0);
  });

  it("una sesión hoy: racha de 1", () => {
    expect(calcularRacha([sesion(0)])).toBe(1);
  });

  it("3 días seguidos (hoy, ayer, antier): racha de 3", () => {
    expect(calcularRacha([sesion(0), sesion(1), sesion(2)])).toBe(3);
  });

  it("se saltó un día: la racha se corta ahí", () => {
    // hoy, ayer, y luego un salto a hace 5 días
    expect(calcularRacha([sesion(0), sesion(1), sesion(5)])).toBe(2);
  });

  it("última sesión hace más de 1 día: racha rota (0)", () => {
    expect(calcularRacha([sesion(3)])).toBe(0);
  });

  it("no estudió hoy pero sí ayer: la racha sigue viva", () => {
    expect(calcularRacha([sesion(1), sesion(2)])).toBe(2);
  });

  it("varias sesiones el mismo día cuentan como un solo día", () => {
    expect(calcularRacha([sesion(0), sesion(0), sesion(1)])).toBe(2);
  });
});
