// Emparejar lo que dice el LLM con las claves REALES del camino.
//
// El cierre de sesión le pide a Gemini los temas trabajados como texto libre y
// se guardaban con un simple .toLowerCase().trim(). Pero las claves del banco
// son `resolucion_problemas`, `comprension_lectora`: cualquier variante
// ("Comprensión Lectora", "comprension lectora", "problemas") creaba un tema
// fantasma que ninguna etapa del mapa lee. En producción convivían
// `articulos` y `artículos`, y `tiempos_verbales` con `verbos_tiempos`.
//
// Regla: se normaliza siempre; se empareja con la ruta si se puede. Si no
// empareja, se CONSERVA la clave normalizada — un tema fuera del camino sigue
// siendo memoria válida del niño, solo que no es una etapa. No inventamos.

// minúsculas, sin tildes, espacios y guiones a "_", sin puntuación suelta.
export function normalizarClaveTema(bruto: string): string {
  return bruto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tildes
    .replace(/[^a-z0-9ñ\s_-]/g, "") // signos (¿?, ., etc.)
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// Palabras que no distinguen un tema de otro al comparar por contenido.
const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "y", "en", "con", "para"]);

function fragmentos(clave: string): string[] {
  return clave.split("_").filter((p) => p.length > 2 && !VACIAS.has(p));
}

// Devuelve la clave canónica de la ruta que corresponde, o la normalizada si
// ninguna calza. Orden: exacta → contención de fragmentos (en un solo sentido
// y sin ambigüedad).
export function emparejarConRuta(bruto: string, ruta: string[]): string {
  const clave = normalizarClaveTema(bruto);
  if (!clave) return "";
  if (ruta.includes(clave)) return clave;

  const partes = fragmentos(clave);
  if (partes.length === 0) return clave;

  // candidatas: comparten TODOS los fragmentos significativos en algún sentido
  const candidatas = ruta.filter((r) => {
    const partesRuta = fragmentos(r);
    if (partesRuta.length === 0) return false;
    const claveCubreRuta = partesRuta.every((p) => partes.includes(p));
    const rutaCubreClave = partes.every((p) => partesRuta.includes(p));
    return claveCubreRuta || rutaCubreClave;
  });

  // solo si es INEQUÍVOCA: con dos candidatas estaríamos adivinando
  return candidatas.length === 1 ? candidatas[0] : clave;
}

// ¿Esto parece el enunciado de una actividad y no un tema? Los interactivos
// llegaron a guardar "une cada órgano con su función" como clave. Sirve de red
// para no volver a ensuciar el camino si algo se escapa.
export function pareceEnunciado(bruto: string): boolean {
  const limpio = bruto.trim();
  if (limpio.length > 38) return true;
  if (/[¿?¡!]/.test(limpio)) return true;
  // frases imperativas típicas de una instrucción
  return /^(une|clasifica|arrastra|ordena|selecciona|marca|estudia|elige|completa)\b/i.test(limpio);
}
