// ¿Dos preguntas son la misma con otra redacción?
//
// El generador de preguntas de prueba no sabía qué se había preguntado antes,
// así que para un tema angosto devolvía siempre lo mismo con otras palabras:
// una niña recibió 3 de 8 preguntas que eran la misma. Esto detecta esos casos
// para (a) pedirle a la IA algo distinto y (b) no cachear duplicados, que era
// lo que además ensuciaba la biblioteca para todos.

const VACIAS = new Set([
  "el","la","los","las","un","una","unos","unas","de","del","que","y","o","a","en",
  "es","son","con","por","para","se","su","al","lo","como","cual","cuales","cuanto",
  "cuantos","cuanta","cuantas","si","no","mas","menos","tiene","tienes","hay","cada",
]);

// minúsculas, sin tildes ni signos; devuelve las palabras con peso semántico.
//
// Dos detalles que importan en preguntas de matemática: se conserva la barra
// para que "1/4" siga siendo UN token (partirla en "1" y "4" pierde la
// fracción), y los números sobreviven aunque tengan un solo dígito — en
// "¿cuánto es 1/4 + 2/4?" el contenido son justamente los números, y un filtro
// por largo dejaba el enunciado entero sin tokens.
export function tokens(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ/\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^\/+|\/+$/g, "")) // barras sueltas de los bordes
    .filter((t) => t.length > 0 && !VACIAS.has(t))
    .filter((t) => t.length > 1 || /\d/.test(t));
}

// Jaccard sobre los tokens: 0 = nada en común, 1 = idénticas.
export function similitud(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let comunes = 0;
  for (const t of ta) if (tb.has(t)) comunes++;
  return comunes / (ta.size + tb.size - comunes);
}

// Umbral deliberadamente bajo: en una prueba de 8 preguntas es mucho peor
// repetir que descartar una buena. "¿Cuánto es 1/4 + 2/4?" y "¿Cuánto es
// 2/4 + 1/4?" comparten casi todos los tokens y deben caer como duplicadas.
export const UMBRAL_PARECIDA = 0.55;

export function esMuyParecida(
  enunciado: string,
  existentes: string[],
  umbral = UMBRAL_PARECIDA
): boolean {
  return existentes.some((e) => similitud(enunciado, e) >= umbral);
}
