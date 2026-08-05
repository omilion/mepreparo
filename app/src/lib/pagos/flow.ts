// Cliente mínimo de Flow.cl (REST + firma HMAC). Mismo patrón que gemini.ts
// y email.ts: si no hay credenciales, tieneClaveFlow() es false y el que
// llama decide el fallback (nunca revienta la app por falta de config).
//
// OJO — requiere una cuenta real de Flow para probarse de punta a punta
// (FLOW_API_KEY / FLOW_SECRET_KEY en .env.local, sandbox o producción). La
// firma sigue el esquema documentado de Flow: params ordenados
// alfabéticamente, concatenados como "clave1valor1clave2valor2..." (sin "="
// ni "&"), HMAC-SHA256 en hex con el secretKey, agregado como parámetro `s`.
// Verifica contra la documentación vigente de Flow antes de ir a producción:
// las pasarelas de pago cambian sin aviso.

import crypto from "crypto";

const BASE_SANDBOX = "https://sandbox.flow.cl/api";
const BASE_PROD = "https://www.flow.cl/api";

export function tieneClaveFlow(): boolean {
  return !!process.env.FLOW_API_KEY && !!process.env.FLOW_SECRET_KEY;
}

function base(): string {
  return process.env.FLOW_AMBIENTE === "produccion" ? BASE_PROD : BASE_SANDBOX;
}

function firmar(params: Record<string, string>): string {
  const secret = process.env.FLOW_SECRET_KEY;
  if (!secret) throw new Error("SIN_CLAVE");
  const claves = Object.keys(params).sort();
  const paraFirmar = claves.map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", secret).update(paraFirmar).digest("hex");
}

async function llamar(
  metodo: "GET" | "POST",
  ruta: string,
  params: Record<string, string>
): Promise<any> {
  const apiKey = process.env.FLOW_API_KEY;
  if (!apiKey) throw new Error("SIN_CLAVE");

  const completos = { ...params, apiKey };
  const s = firmar(completos);
  const url = `${base()}${ruta}`;

  let res: Response;
  if (metodo === "GET") {
    const qs = new URLSearchParams({ ...completos, s }).toString();
    res = await fetch(`${url}?${qs}`, { method: "GET" });
  } else {
    const body = new URLSearchParams({ ...completos, s });
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    throw new Error(`FLOW_${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}

export interface OrdenCreada {
  token: string;
  url: string; // url de pago (redirigir a `${url}?token=${token}`)
  flowOrder: number;
}

// Crea una orden de pago única (el cobro mensual se repite creando una orden
// nueva cada ciclo, vía el cron — ver /api/cron/facturacion). Simple y
// robusto: no depende de la API de "suscripciones recurrentes" de Flow, que
// tiene su propio contrato y requeriría verificación aparte.
export async function crearOrdenPago(opts: {
  commerceOrder: string;
  subject: string;
  amountClp: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
}): Promise<OrdenCreada> {
  const data = await llamar("POST", "/payment/create", {
    commerceOrder: opts.commerceOrder,
    subject: opts.subject,
    currency: "CLP",
    amount: String(Math.round(opts.amountClp)),
    email: opts.email,
    urlConfirmation: opts.urlConfirmation,
    urlReturn: opts.urlReturn,
  });
  return { token: data.token, url: data.url, flowOrder: data.flowOrder };
}

export type EstadoPagoFlow = 1 | 2 | 3 | 4; // 1 pendiente, 2 pagada, 3 rechazada, 4 anulada

export interface EstadoPago {
  status: EstadoPagoFlow;
  commerceOrder: string;
  flowOrder: number;
  amount: number;
}

// SIEMPRE confirmar el estado consultando a Flow (nunca confiar en el body
// que llega al webhook: solo trae el token, y cualquiera podría llamarlo).
export async function consultarEstadoPago(token: string): Promise<EstadoPago> {
  const data = await llamar("GET", "/payment/getStatus", { token });
  return {
    status: data.status,
    commerceOrder: data.commerceOrder,
    flowOrder: data.flowOrder,
    amount: data.amount,
  };
}
