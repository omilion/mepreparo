import crypto from "crypto";

export function getHmacSecret(): string {
  const secret = process.env.DIAG_HMAC_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("ALERTA DE SEGURIDAD: DIAG_HMAC_SECRET no está configurada en producción.");
    }
    return "mepreparo_dev_secret_key_12345";
  }
  return secret;
}

export interface StudentTokenPayload {
  cuentaId: string;
  pupiloId: string;
  exp: number;
  tipo?: "login" | "sesion";
}

export function generateStudentToken(cuentaId: string, pupiloId: string): string {
  const payload: StudentTokenPayload = {
    cuentaId,
    pupiloId,
    tipo: "sesion",
    // Válido por 5 años
    exp: Date.now() + 1000 * 60 * 60 * 24 * 365 * 5,
  };
  return firmarToken(payload);
}

// El QR es solo un enlace de emparejamiento de corta duración. Al usarlo se
// intercambia por el token de sesión persistente de la tablet.
export function generateStudentLoginToken(cuentaId: string, pupiloId: string): string {
  return firmarToken({
    cuentaId,
    pupiloId,
    tipo: "login",
    exp: Date.now() + 1000 * 60 * 10,
  });
}

function firmarToken(payload: StudentTokenPayload): string {
  const str = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getHmacSecret()).update(str).digest("base64url");
  return `${str}.${signature}`;
}

export function verifyStudentToken(token: string): StudentTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [str, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", getHmacSecret()).update(str).digest("base64url");
    const recibido = Buffer.from(signature);
    const esperado = Buffer.from(expectedSignature);
    if (recibido.length !== esperado.length || !crypto.timingSafeEqual(recibido, esperado)) return null;
    const payload = JSON.parse(Buffer.from(str, "base64url").toString("utf-8")) as StudentTokenPayload;
    if (
      !payload.cuentaId ||
      !payload.pupiloId ||
      !Number.isFinite(payload.exp) ||
      payload.exp < Date.now() ||
      (payload.tipo !== undefined && payload.tipo !== "login" && payload.tipo !== "sesion")
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- PIN del alumno: hash + comparación en TIEMPO CONSTANTE (solo servidor) ---
// El PIN NUNCA se guarda ni se compara en texto plano. Guardamos un HMAC del PIN
// ligado al pupilo (evita que el mismo PIN dé el mismo hash entre niños).
export function hashPin(pin: string, pupiloId: string): string {
  return crypto.createHmac("sha256", getHmacSecret()).update(`${pupiloId}:${pin}`).digest("base64url");
}

// Comparación resistente a timing attacks.
export function verificarPin(pin: string, pupiloId: string, hashGuardado: string): boolean {
  if (!hashGuardado) return false;
  const calculado = hashPin(pin, pupiloId);
  const a = Buffer.from(calculado);
  const b = Buffer.from(hashGuardado);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
