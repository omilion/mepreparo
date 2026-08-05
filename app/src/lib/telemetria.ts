// TELEMETRÍA DE FALLOS
//
// Qué se rompe, cada cuánto y en qué materia. Nació de una constatación
// incómoda: los cuatro bugs de la prueba real con las hijas los supimos porque
// ellas los contaron. Nadie más los habría visto.
//
// TRES REGLAS, en orden de importancia:
//
// 1. NUNCA contenido. No entra lo que el niño escribe, ni lo que Rai responde,
//    ni resúmenes de clase, ni nombres. Solo qué ocurrió y a qué id le ocurrió.
//    `sanearMeta` lo garantiza mecánicamente: descarta cualquier string que
//    parezca una frase, así un descuido futuro no puede filtrar una confidencia.
// 2. NUNCA romper la clase. Registrar es best-effort: si la base no está o
//    falla, se traga el error. Un niño no se queda sin tutor por una métrica.
// 3. Catálogo CERRADO de tipos. Nada de strings libres como nombre de evento:
//    si no está en la lista, no se guarda.

import { db } from "./db/db";
import { eventos } from "./db/schema";
import { crearId } from "./profile";

export const TIPOS_EVENTO = [
  // --- fallos que el niño SÍ nota ---
  "tutor_sin_conexion", // el cliente no pudo hablar con /api/tutor
  "tutor_ia_fallo", // Gemini falló en el servidor y se cayó a simulado
  "tutor_modo_simulado", // respondió sin IA (falta la API key)
  "actividad_prometida_sin_llegar", // Rai anunció un juego y no se pudo armar
  "actividad_invalida", // llegó contenido que no pasó la validación
  "interactivo_ia_fallo", // el generador cayó a las semillas locales
  "plan_materia_fallo", // una materia no se pudo planificar en "los mundos"
  "plan_incompleto", // se llegó al tope de tiempo con materias sin plan
  // --- señales de calidad que el niño NO nota ---
  "actividad_suprimida", // el freno evitó repetir un juego (mide insistencia de la IA)
  "actividad_cambiada", // se entregó otro tipo para no repetirle la experiencia
  "tutor_latencia", // cuánto tardó una respuesta, en ms
  // --- uso, para leer los fallos como tasa y no como número suelto ---
  "sesion_iniciada",
  "simulacro_completado", // el niño rindió un simulacro de examen completo
  // costo real de una llamada a Gemini: {tokensIn, tokensOut, modelo} en meta
  // (modelo va como etiqueta corta, ej. "flash"/"flash_lite" — no el nombre
  // completo con puntos, que ETIQUETA no aceptaría)
  "sesion_costo",
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

const CATALOGO = new Set<string>(TIPOS_EVENTO);

export function esTipoValido(tipo: string): tipo is TipoEvento {
  return CATALOGO.has(tipo);
}

// Materias válidas; cualquier otra cosa se descarta (no vaya a colarse un tema
// escrito por el niño en un campo que después miramos en un panel).
const MATERIAS_VALIDAS = new Set([
  "matematica",
  "lenguaje",
  "ciencias",
  "historia",
  "ingles",
]);

// Solo etiquetas cortas tipo "sopa", "timeout", "5basico". Una frase NO pasa.
const ETIQUETA = /^[a-z0-9_.:-]{1,40}$/i;

// Deja pasar números, booleanos y etiquetas cortas. Todo lo demás se descarta.
// Es la garantía mecánica de que por acá no viaja algo que dijo un niño.
export function sanearMeta(meta: unknown): Record<string, number | boolean | string> | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const limpio: Record<string, number | boolean | string> = {};
  for (const [clave, valor] of Object.entries(meta as Record<string, unknown>)) {
    if (!ETIQUETA.test(clave)) continue;
    if (typeof valor === "number" && Number.isFinite(valor)) limpio[clave] = valor;
    else if (typeof valor === "boolean") limpio[clave] = valor;
    else if (typeof valor === "string" && ETIQUETA.test(valor)) limpio[clave] = valor;
    // strings largos, objetos, arrays y null: fuera
  }
  return Object.keys(limpio).length > 0 ? limpio : null;
}

export interface EventoNuevo {
  tipo: TipoEvento;
  origen: "servidor" | "cliente";
  cuentaId?: string | null;
  pupiloId?: string | null;
  materia?: string | null;
  meta?: unknown;
}

// Registra un evento. Best-effort a propósito: nunca lanza, nunca bloquea.
export async function registrarEvento(e: EventoNuevo): Promise<void> {
  try {
    if (!esTipoValido(e.tipo)) return;
    await db.insert(eventos).values({
      id: crearId(),
      cuentaId: e.cuentaId || null,
      pupiloId: e.pupiloId || null,
      tipo: e.tipo,
      origen: e.origen,
      materia: e.materia && MATERIAS_VALIDAS.has(e.materia) ? e.materia : null,
      meta: sanearMeta(e.meta),
    });
  } catch {
    // Si la telemetría falla, la clase sigue. Nunca al revés.
  }
}

// Igual que registrarEvento pero sin esperar: para no meter latencia en una
// ruta que le está respondiendo a un niño.
export function registrarEventoAsync(e: EventoNuevo): void {
  void registrarEvento(e);
}
