// Estimador de costo real de Gemini, para medir contra la meta declarada
// (PLAN-siguiente-nivel C3: < CLP 20 por sesión). Los eventos "sesion_costo"
// (ver telemetria.ts) guardan tokensIn/tokensOut/modelo por llamada; esto
// convierte esos tokens a CLP.
//
// OJO: los precios de acá son una lista de referencia (USD por 1M tokens de
// los modelos "flash"), NO la tarifa exacta de la cuenta — actualízalos con
// la boleta real de Google Cloud cuando esté disponible. Por eso el admin
// muestra esto como "estimado", nunca como cifra exacta.

import { MODELO_CHAT, MODELO_LITE } from "./tutor/gemini";

interface PrecioPorMillon {
  usdIn: number;
  usdOut: number;
}

const PRECIOS: Record<string, PrecioPorMillon> = {
  [MODELO_CHAT]: { usdIn: 0.3, usdOut: 2.5 },
  [MODELO_LITE]: { usdIn: 0.1, usdOut: 0.4 },
};

// Fallback conservador si algún día se usa un modelo sin precio listado
// (mejor sobrestimar el costo que esconder un gasto real).
const PRECIO_DEFECTO: PrecioPorMillon = { usdIn: 0.3, usdOut: 2.5 };

// CLP por USD: ajustar cuando el tipo de cambio se mueva significativamente.
export const CLP_POR_USD = 950;

export function costoUsd(tokensIn: number, tokensOut: number, modelo: string): number {
  const precio = PRECIOS[modelo] ?? PRECIO_DEFECTO;
  return (tokensIn / 1_000_000) * precio.usdIn + (tokensOut / 1_000_000) * precio.usdOut;
}

export function costoClp(tokensIn: number, tokensOut: number, modelo: string): number {
  return costoUsd(tokensIn, tokensOut, modelo) * CLP_POR_USD;
}
