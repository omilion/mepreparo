import { describe, expect, it } from "vitest";
import { evaluarAcceso, type DatosSuscripcion } from "./suscripcion";

const ahora = new Date("2026-08-04T12:00:00Z");
const enDias = (n: number) => new Date(ahora.getTime() + n * 86_400_000);

describe("evaluarAcceso", () => {
  it("prueba vigente: no bloquea", () => {
    const sub: DatosSuscripcion = { estado: "prueba", pruebaHasta: enDias(5), periodoHasta: null };
    const r = evaluarAcceso(sub, ahora);
    expect(r.bloqueado).toBe(false);
    expect(r.motivo).toBe("prueba_vigente");
    expect(r.diasRestantes).toBe(5);
  });

  it("prueba vencida: bloquea", () => {
    const sub: DatosSuscripcion = { estado: "prueba", pruebaHasta: enDias(-1), periodoHasta: null };
    const r = evaluarAcceso(sub, ahora);
    expect(r.bloqueado).toBe(true);
    expect(r.motivo).toBe("vencida");
  });

  it("activa con período vigente: no bloquea", () => {
    const sub: DatosSuscripcion = { estado: "activa", pruebaHasta: null, periodoHasta: enDias(20) };
    expect(evaluarAcceso(sub, ahora).bloqueado).toBe(false);
  });

  it("activa con período vencido: bloquea (el cron aún no la marcó 'vencida')", () => {
    const sub: DatosSuscripcion = { estado: "activa", pruebaHasta: null, periodoHasta: enDias(-1) };
    const r = evaluarAcceso(sub, ahora);
    expect(r.bloqueado).toBe(true);
    expect(r.motivo).toBe("vencida");
  });

  it("cancelada pero con período pagado vigente: mantiene acceso (CA explícito)", () => {
    const sub: DatosSuscripcion = { estado: "cancelada", pruebaHasta: null, periodoHasta: enDias(10) };
    const r = evaluarAcceso(sub, ahora);
    expect(r.bloqueado).toBe(false);
    expect(r.motivo).toBe("cancelada_con_acceso");
  });

  it("cancelada y el período ya terminó: bloquea", () => {
    const sub: DatosSuscripcion = { estado: "cancelada", pruebaHasta: null, periodoHasta: enDias(-1) };
    const r = evaluarAcceso(sub, ahora);
    expect(r.bloqueado).toBe(true);
    expect(r.motivo).toBe("vencida");
  });

  it("cancelada sin periodoHasta (nunca pagó): bloquea", () => {
    const sub: DatosSuscripcion = { estado: "cancelada", pruebaHasta: null, periodoHasta: null };
    expect(evaluarAcceso(sub, ahora).bloqueado).toBe(true);
  });

  it("estado 'vencida': siempre bloquea", () => {
    const sub: DatosSuscripcion = { estado: "vencida", pruebaHasta: null, periodoHasta: enDias(30) };
    expect(evaluarAcceso(sub, ahora).bloqueado).toBe(true);
  });

  it("prueba sin fecha límite (dato corrupto/legado): no bloquea por seguridad, no castiga al usuario", () => {
    const sub: DatosSuscripcion = { estado: "prueba", pruebaHasta: null, periodoHasta: null };
    expect(evaluarAcceso(sub, ahora).bloqueado).toBe(false);
  });
});
