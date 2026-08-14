import { describe, expect, it } from "vitest";
import {
  generateStudentLoginToken,
  generateStudentToken,
  verifyStudentToken,
  hashPin,
  verificarPin,
  getHmacSecret,
} from "./auth-student";

describe("tokens de alumno", () => {
  it("distingue el enlace QR de corta duración de la sesión de la tablet", () => {
    const qr = verifyStudentToken(generateStudentLoginToken("cuenta-1", "pupilo-1"));
    const sesion = verifyStudentToken(generateStudentToken("cuenta-1", "pupilo-1"));

    expect(qr).toMatchObject({ cuentaId: "cuenta-1", pupiloId: "pupilo-1", tipo: "login" });
    expect(sesion).toMatchObject({ cuentaId: "cuenta-1", pupiloId: "pupilo-1", tipo: "sesion" });
    expect((sesion?.exp ?? 0) - (qr?.exp ?? 0)).toBeGreaterThan(1_000 * 60 * 60 * 24);
  });

  it("rechaza una firma alterada", () => {
    const token = generateStudentToken("cuenta-1", "pupilo-1");
    const alterado = `${token.slice(0, -1)}x`;
    expect(verifyStudentToken(alterado)).toBeNull();
  });

  it("genera hashes de PIN específicos por pupilo y los verifica correctamente", () => {
    const pin = "123";
    const hashPupilo1 = hashPin(pin, "pupilo-1");
    const hashPupilo2 = hashPin(pin, "pupilo-2");

    // El mismo PIN debe producir distinto hash para distintos pupilos (salting por pupilo)
    expect(hashPupilo1).not.toBe(hashPupilo2);
    expect(verificarPin("123", "pupilo-1", hashPupilo1)).toBe(true);
    expect(verificarPin("124", "pupilo-1", hashPupilo1)).toBe(false);
    expect(verificarPin("123", "pupilo-2", hashPupilo1)).toBe(false);
  });

  it("devuelve una clave secreta válida", () => {
    expect(typeof getHmacSecret()).toBe("string");
    expect(getHmacSecret().length).toBeGreaterThan(5);
  });
});
