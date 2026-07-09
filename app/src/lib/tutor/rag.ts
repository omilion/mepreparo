// Recuperación RAG para el tutor (lado servidor). Lee los chunks del currículum
// oficial y devuelve los más relevantes para inyectar en el prompt.
//
// NOTA sobre embeddings: los chunks marcados con modelo_embedding =
// gemini-embedding-2 (migrados por upgrade_embeddings.py) se comparan por
// similitud coseno; los no migrados caen a solapamiento de términos. Así la
// migración puede ser parcial sin romper nada.

import fs from "node:fs";
import path from "node:path";
import type { Curso, Materia } from "@/lib/profile";
import { obtenerEmbedding } from "./gemini";

interface Chunk {
  id: string;
  materia: string;
  curso: string;
  tipo: string;
  fuente_archivo: string;
  pagina: number;
  texto: string;
  embedding?: number[];
  // Solo los chunks migrados por upgrade_embeddings.py traen este marcador.
  // Los antiguos (bag-of-words) tienen embedding pero NO sirven para coseno
  // contra text-embedding-004: son espacios vectoriales distintos.
  modeloEmbedding?: string;
}

// Debe coincidir con el marcador que escribe upgrade_embeddings.py.
const MODELO_REAL = "gemini-embedding-2";

let CHUNKS: Chunk[] | null = null;

function rutaChunks(): string {
  // el cwd al correr Next es la carpeta app/
  return path.join(process.cwd(), "..", "base-documental", "_rag", "chunks.jsonl");
}

// Carga perezosa y cacheada.
function cargarChunks(): Chunk[] {
  if (CHUNKS) return CHUNKS;
  const ruta = rutaChunks();
  const out: Chunk[] = [];
  try {
    const contenido = fs.readFileSync(ruta, "utf-8");
    for (const linea of contenido.split("\n")) {
      if (!linea.trim()) continue;
      try {
        const o = JSON.parse(linea);
        out.push({
          id: o.id,
          materia: o.materia,
          curso: o.curso,
          tipo: o.tipo,
          fuente_archivo: o.fuente_archivo,
          pagina: o.pagina,
          texto: o.texto,
          embedding: Array.isArray(o.embedding) ? o.embedding : undefined,
          modeloEmbedding: o.modelo_embedding,
        });
      } catch {
        /* línea corrupta: se ignora */
      }
    }
  } catch {
    // sin archivo → RAG vacío (el tutor seguirá funcionando, sin cita)
    return [];
  }
  CHUNKS = out;
  return out;
}

const STOP = new Set([
  "el","la","los","las","un","una","de","del","que","y","o","a","en","es","con",
  "por","para","se","su","al","lo","como","mas","más","cual","cuál","cuanto",
  "cuánto","como","qué","que","the","of","to","and","is","in","como",
]);

function terminos(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // sin tildes para emparejar mejor
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function similitudCoseno(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface FragmentoRag {
  texto: string;
  fuente: string; // p.ej. "Programa Matemática 5° · pág 12"
  materia: string;
  tipo: string;
}

// Devuelve hasta `k` fragmentos relevantes para la consulta, priorizando la
// materia/curso del niño y los temarios de examen (lo que se evalúa).
// Ahora es asíncrona porque realiza una consulta a la API de embeddings de Gemini.
export async function recuperar(
  consulta: string,
  opts: { materia?: Materia; curso?: Curso; k?: number } = {}
): Promise<FragmentoRag[]> {
  const chunks = cargarChunks();
  if (chunks.length === 0) return [];

  const k = opts.k ?? 3;
  const q = terminos(consulta);
  if (q.length === 0) return [];

  // Solo cuentan como vectoriales los chunks MIGRADOS al modelo real. Los
  // embeddings antiguos (bag-of-words) no son comparables con el vector de la
  // consulta: usarlos rompería el RAG (similitudes ≈ ruido → 0 resultados).
  const hayVectoresReales = chunks.some(
    (c) => c.modeloEmbedding === MODELO_REAL && c.embedding && c.embedding.length > 0
  );

  // No gastamos la llamada de embedding si aún no hay chunks migrados.
  let queryVector: number[] | null = null;
  if (hayVectoresReales) {
    try {
      queryVector = await obtenerEmbedding(consulta);
    } catch (e) {
      console.error("Fallo al obtener embedding para RAG, cayendo a búsqueda de texto:", e);
    }
  }

  const usarVectores = queryVector !== null;

  const puntuados = chunks.map((c) => {
    let score = 0;
    let hits = 0;

    // Filtros de materia/curso/temario (boosts)
    let bonus = 0;
    if (opts.materia && c.materia === opts.materia) bonus += 0.3;
    if (opts.curso && c.curso === opts.curso) bonus += 0.2;
    if (c.tipo === "temario_examen_libre") bonus += 0.1;

    if (usarVectores && c.modeloEmbedding === MODELO_REAL && c.embedding && c.embedding.length > 0) {
      const sim = similitudCoseno(queryVector!, c.embedding);
      score = sim + bonus;
      hits = sim > 0.35 ? 1 : 0;
    } else {
      // Fallback a solapamiento de términos
      const setQ = new Set(q);
      const t = terminos(c.texto);
      let localHits = 0;
      for (const term of t) if (setQ.has(term)) localHits++;
      const matchScore = localHits / Math.max(1, setQ.size);
      score = matchScore + bonus * 3;
      hits = localHits;
    }

    return { c, score, hits };
  });

  return puntuados
    .filter((p) => p.hits > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ c }) => ({
      texto: c.texto.replace(/\s+/g, " ").trim().slice(0, 600),
      fuente: `${c.fuente_archivo} · pág ${c.pagina}`,
      materia: c.materia,
      tipo: c.tipo,
    }));
}
