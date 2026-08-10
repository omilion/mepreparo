import { describe, expect, it } from "vitest";
import { generateStudentLoginToken, generateStudentToken, verifyStudentToken } from "./auth-student";

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
});
