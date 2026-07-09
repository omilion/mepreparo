// Cliente mínimo de Gemini (REST). Solo servidor: usa la clave de .env.local.
// Sin dependencias externas (fetch nativo).

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function tieneClave(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function modelo(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
}

// Genera una respuesta con Gemini. Lanza si no hay clave o si la API falla,
// para que el llamador decida el fallback.
export async function generar(opts: {
  sistema: string;
  usuario: string;
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("SIN_CLAVE");

  const url = `${BASE}/${modelo()}:generateContent?key=${key}`;
  const body = {
    system_instruction: { parts: [{ text: opts.sistema }] },
    contents: [{ role: "user", parts: [{ text: opts.usuario }] }],
    generationConfig: {
      // respuestas concisas => menos tokens (cap del "middle")
      maxOutputTokens: opts.maxTokens ?? 300,
      temperature: 0.6,
      // gemini-2.5-flash es "thinking": sin límite, el razonamiento se come el
      // presupuesto y el texto sale truncado. Para un tutor breve no hace falta
      // pensar mucho: dejamos un presupuesto pequeño y fijo.
      thinkingConfig: { thinkingBudget: 128 },
    },
  };

  // Reintenta ante saturación temporal (503) o rate limit (429) antes de rendirse.
  let res: Response | null = null;
  for (let intento = 0; intento < 3; intento++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) break;
    if (res.status === 503 || res.status === 429) {
      await new Promise((r) => setTimeout(r, 500 * (intento + 1)));
      continue;
    }
    break; // otro error: no reintentar
  }

  if (!res || !res.ok) {
    const detalle = res ? await res.text().catch(() => "") : "sin respuesta";
    throw new Error(`GEMINI_${res?.status ?? "NA"}: ${detalle.slice(0, 200)}`);
  }

  const data = await res.json();
  const texto =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ??
    "";
  if (!texto) throw new Error("GEMINI_RESPUESTA_VACIA");
  return texto.trim();
}
