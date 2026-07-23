// Catálogo de iconos de línea (Tabler Icons) del proyecto, organizado por
// CATEGORÍA. Guardados en `/public/iconos/{nombre}.svg`.
//
// IMPORTANTE: cada nombre DEBE tener su archivo .svg (si no, Rai lo ofrecería y
// no existiría). Nombres en minúsculas SIN tildes.
//
// Las categorías sirven para que el generador de interactivos le pida a Gemini
// elementos DE UNA categoría concreta → así el juego sale 100% con iconos
// consistentes, en vez de mezclar tarjetas con y sin dibujo.

export const ICONOS_POR_CATEGORIA = {
  animales: [
    "perro", "gato", "caballo", "cerdo", "pez", "pescado", "mariposa", "arana",
    "hueso", "huevo",
  ],
  comida: [
    "manzana", "zanahoria", "pan", "queso", "pizza", "hamburguesa", "helado",
    "torta", "cafe", "leche", "carne", "sal", "huevo", "hongo",
  ],
  deportes: [
    "futbol", "basketball", "tenis", "voley", "beisbol", "bowling", "pesa",
    "patineta", "medalla", "trofeo", "pelota", "bicicleta",
  ],
  edificios: [
    "casa", "banco", "hospital", "iglesia", "castillo", "escuela", "tienda",
    "fabrica", "rascacielos", "estadio", "torre", "carpa",
  ],
  transporte: [
    "auto", "avion", "barco", "tren", "bus", "camion", "moto", "bicicleta",
    "helicoptero", "cohete", "submarino", "ambulancia",
  ],
  objetos: [
    "libro", "libros", "lapiz", "regla", "tijeras", "pincel", "paleta", "globo",
    "dado", "llave", "candado", "campana", "bandera", "regalo", "moneda",
    "reloj", "brujula", "mapa", "lampara", "telefono", "computador", "camara",
    "television", "maleta", "mochila", "paraguas", "silla", "sofa", "cama",
    "camiseta", "zapato",
  ],
  naturaleza: [
    "arbol", "flor", "hoja", "planta", "cactus", "montana", "sol", "luna",
    "estrella", "nube", "agua", "gota", "fuego", "rayo", "copo", "viento",
    "arcoiris", "cometa", "tierra", "planeta",
  ],
  ciencia: [
    "atomo", "adn", "microscopio", "telescopio", "iman", "termometro",
    "bateria", "bombilla", "engranaje", "corazon", "cerebro", "diente", "ojo",
    "oido", "mano",
  ],
  matematica: [
    "calculadora", "numero", "mas", "menos", "division", "porcentaje",
    "infinito", "funcion", "angulo", "triangulo", "circulo", "cuadrado",
    "rombo", "hexagono", "pentagono", "diamante", "balanza",
  ],
  escuela: [
    "libro", "lapiz", "escuela", "persona", "grupo", "letra", "comillas",
    "musica", "lupa", "premio", "diamante",
  ],
  // Estados/emociones de Rai (no para poblar interactivos, sí para el orbe y el
  // texto). Se dejan aparte a propósito.
  emociones: [
    "cerebro", "saludo", "celebracion", "hablando", "idea", "pregunta",
    "correcto", "incorrecto", "trofeo", "premio", "sonrisa", "triste",
    "sorpresa", "guino", "pulgar", "corazon", "estrella",
  ],
} as const;

export type CategoriaIcono = keyof typeof ICONOS_POR_CATEGORIA;

// Categorías aptas para POBLAR interactivos (excluye emociones, que son de Rai).
export const CATEGORIAS_INTERACTIVO: CategoriaIcono[] = [
  "animales", "comida", "deportes", "edificios", "transporte", "objetos",
  "naturaleza", "ciencia", "matematica", "escuela",
];

// Lista plana de todos los nombres válidos (unión de categorías, sin repetir).
export const ICONOS_VALIDOS: string[] = Array.from(
  new Set(Object.values(ICONOS_POR_CATEGORIA).flat())
);

// Normaliza a la forma canónica de los archivos: minúsculas, sin tildes, solo
// caracteres de nombre de archivo. Así "círculo" → "circulo", "Átomo" → "atomo".
export function normalizarIcono(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/[^a-z0-9_-]/g, "");
}

const SET_ICONOS = new Set(ICONOS_VALIDOS);

// ¿Existe un icono para este texto? (tolerante a tildes/mayúsculas).
export function tieneIcono(texto: string): boolean {
  return SET_ICONOS.has(normalizarIcono(texto));
}

// Devuelve los iconos de una categoría (o [] si no existe).
export function iconosDe(categoria: string): readonly string[] {
  return ICONOS_POR_CATEGORIA[categoria as CategoriaIcono] ?? [];
}

// Normaliza los iconos inline del texto de Rai: a veces Gemini escribe "[pizza]"
// en vez de "[icono:pizza]" y el icono no se renderiza (sale el texto literal).
// Convertimos cualquier "[nombre]" suelto (sin ":") a "[icono:nombre]" SOLO si
// es un icono válido. No toca los "[icono:x]" ya correctos (tienen ":").
export function normalizarIconosInline(texto: string): string {
  return texto.replace(/\[([^\[\]:]+)\]/g, (completo, nombre) =>
    tieneIcono(nombre) ? `[icono:${normalizarIcono(nombre)}]` : completo
  );
}

// Arma el texto de los catálogos por categoría para inyectar en el prompt de
// Gemini (solo las categorías que sirven para poblar interactivos).
export function catalogoParaPrompt(): string {
  return CATEGORIAS_INTERACTIVO.map(
    (cat) => `- ${cat}: ${ICONOS_POR_CATEGORIA[cat].join(", ")}`
  ).join("\n");
}
