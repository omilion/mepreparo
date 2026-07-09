// Recuperación RAG para el tutor (lado servidor). Lee los chunks del currículum
// oficial y devuelve los más relevantes para inyectar en el prompt.
//
// NOTA sobre embeddings: mientras chunks.jsonl tenga los embeddings del fallback
// (bag-of-words, sin valor semántico), recuperamos por solapamiento de términos
// filtrando por materia/curso. Cuando se regeneren con text-embedding-004, se
// puede cambiar `recuperar` por búsqueda vectorial sin tocar el resto.

import fs from "node:fs";
import path from "node:path";
import type { Curso, Materia } from "@/lib/profile";

interface Chunk {
  id: string;
  materia: string;
  curso: string;
  tipo: string;
  fuente_archivo: string;
  pagina: number;
  texto: string;
}

let CHUNKS: Chunk[] | null = null;

function rutaChunks(): string {
  // el cwd al correr Next es la carpeta app/
  return path.join(process.cwd(), "..", "base-documental", "_rag", "chunks.jsonl");
}

// Carga perezosa y cacheada. Ignora el campo embedding (no lo necesitamos aquí).
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

export interface FragmentoRag {
  texto: string;
  fuente: string; // p.ej. "Programa Matemática 5° · pág 12"
  materia: string;
  tipo: string;
}

// Devuelve hasta `k` fragmentos relevantes para la consulta, priorizando la
// materia/curso del niño y los temarios de examen (lo que se evalúa).
export function recuperar(
  consulta: string,
  opts: { materia?: Materia; curso?: Curso; k?: number } = {}
): FragmentoRag[] {
  const chunks = cargarChunks();
  if (chunks.length === 0) return [];

  const k = opts.k ?? 3;
  const q = new Set(terminos(consulta));
  if (q.size === 0) return [];

  const puntuados = chunks.map((c) => {
    // filtro suave: fuera de materia puntúa mucho menos, pero no se descarta
    let bonus = 0;
    if (opts.materia && c.materia === opts.materia) bonus += 3;
    if (opts.curso && c.curso === opts.curso) bonus += 2;
    if (c.tipo === "temario_examen_libre") bonus += 1; // lo evaluado pesa más

    const t = terminos(c.texto);
    let hits = 0;
    for (const term of t) if (q.has(term)) hits++;
    const score = hits + bonus;
    return { c, score, hits };
  });

  return puntuados
    .filter((p) => p.hits > 0) // debe compartir al menos un término real
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ c }) => ({
      texto: c.texto.replace(/\s+/g, " ").trim().slice(0, 600),
      fuente: `${c.fuente_archivo} · pág ${c.pagina}`,
      materia: c.materia,
      tipo: c.tipo,
    }));
}
