import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SECRET = process.env.DIAG_HMAC_SECRET || "mepreparo_dev_secret_key_12345";

export async function POST(req: NextRequest) {
  let body: { preguntaId: string; indice: number; token: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { preguntaId, indice, token } = body;
  if (!preguntaId || typeof indice !== "number" || !token) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  // Encontrar el índice correcto de forma stateless probando todas las opciones posibles (0 a 3)
  let indexCorrecto = -1;
  for (let i = 0; i < 4; i++) {
    const expectedHmac = crypto
      .createHmac("sha256", SECRET)
      .update(`${preguntaId}:${i}`)
      .digest("hex");

    if (token === expectedHmac) {
      indexCorrecto = i;
      break;
    }
  }

  if (indexCorrecto === -1) {
    return NextResponse.json({ error: "Token de validación inválido o corrupto" }, { status: 400 });
  }

  const acierto = (indice === indexCorrecto);

  return NextResponse.json({
    acierto,
    indiceCorrecto: indexCorrecto,
  });
}
