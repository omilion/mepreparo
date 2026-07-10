import crypto from "crypto";

const SECRET = process.env.DIAG_HMAC_SECRET || "mepreparo_dev_secret_key_12345";

export interface StudentTokenPayload {
  cuentaId: string;
  pupiloId: string;
  exp: number;
}

export function generateStudentToken(cuentaId: string, pupiloId: string): string {
  const payload: StudentTokenPayload = {
    cuentaId,
    pupiloId,
    // Válido por 5 años
    exp: Date.now() + 1000 * 60 * 60 * 24 * 365 * 5,
  };
  const str = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(str).digest("base64url");
  return `${str}.${signature}`;
}

export function verifyStudentToken(token: string): StudentTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [str, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", SECRET).update(str).digest("base64url");
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(Buffer.from(str, "base64url").toString("utf-8")) as StudentTokenPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
