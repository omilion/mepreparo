import crypto from "crypto";

export const MAX_LARGO_CUPON = 80;

export function normalizarCupon(valor: string): string {
  return valor.trim().toLowerCase();
}

export function hashCupon(valor: string): string {
  return crypto.createHash("sha256").update(normalizarCupon(valor)).digest("hex");
}
