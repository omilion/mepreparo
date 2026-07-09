// Cliente mínimo de Gemini (REST). Solo servidor: usa la clave de .env.local.
// Sin dependencias externas (fetch nativo).

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Modelos vigentes (verificados contra la API 2026-07). gemini-2.5-flash-lite
// y text-embedding-004 fueron retirados; estos son los actuales elegidos.
export const MODELO_CHAT = "gemini-3.5-flash"; // explicaciones con RAG
export const MODELO_LITE = "gemini-3.1-flash-lite"; // saludos, resúmenes, demo, auditoría

export function tieneClave(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function modelo(): string {
  return process.env.GEMINI_MODEL || MODELO_CHAT;
}

// Genera una respuesta con Gemini. Lanza si no hay clave o si la API falla,
// para que el llamador decida el fallback.
export async function generar(opts: {
  sistema: string;
  usuario: string;
  maxTokens?: number;
  json?: boolean;
  model?: string;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("SIN_CLAVE");

  const chosenModel = opts.model || modelo();
  const url = `${BASE}/${chosenModel}:generateContent?key=${key}`;
  const body = {
    system_instruction: { parts: [{ text: opts.sistema }] },
    contents: [{ role: "user", parts: [{ text: opts.usuario }] }],
    generationConfig: {
      // respuestas concisas => menos tokens (cap del "middle")
      maxOutputTokens: opts.maxTokens ?? 300,
      temperature: 0.6,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
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

// Modelo de embeddings vigente (text-embedding-004 fue retirado de la API).
// Debe coincidir con el usado por upgrade_embeddings.py sobre los chunks.
export const MODELO_EMBEDDING = "gemini-embedding-2";
const EMBED_DIMS = 768;

// Obtiene el embedding vectorial de una CONSULTA (RETRIEVAL_QUERY; los chunks
// del índice se generan con RETRIEVAL_DOCUMENT — mejora la recuperación).
export async function obtenerEmbedding(texto: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("SIN_CLAVE");

  const url = `${BASE}/${MODELO_EMBEDDING}:embedContent?key=${key}`;
  const body = {
    content: {
      parts: [{ text: texto }]
    },
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: EMBED_DIMS,
  };

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
    break;
  }

  if (!res || !res.ok) {
    const detalle = res ? await res.text().catch(() => "") : "sin respuesta";
    throw new Error(`GEMINI_EMBEDDING_${res?.status ?? "NA"}: ${detalle.slice(0, 200)}`);
  }

  const data = await res.json();
  const values = data?.embedding?.values;
  if (!values || !Array.isArray(values)) {
    throw new Error("GEMINI_EMBEDDING_FORMAT_ERROR");
  }
  return values;
}
