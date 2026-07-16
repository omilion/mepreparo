// Lista oficial de iconos de línea (Tabler Icons) disponibles en el proyecto.
// Guardados en la carpeta pública del servidor en `/public/iconos/{nombre}.svg`.
// IMPORTANTE: cada nombre de aquí DEBE tener su archivo .svg correspondiente
// (si no, Rai lo ofrecería y no existiría). Nombres en minúsculas SIN tildes.

export const ICONOS_VALIDOS = [
  // Emociones / estados de Rai
  "cerebro", "saludo", "celebracion", "hablando", "idea", "pregunta",
  "correcto", "incorrecto", "trofeo", "premio", "sonrisa", "triste",
  "sorpresa", "guino", "pulgar",

  // Animales
  "perro", "gato", "caballo", "pez", "mariposa", "arana", "hueso", "huevo",

  // Naturaleza / plantas / clima
  "planta", "flor", "arbol", "hoja", "cactus", "hongo", "zanahoria", "manzana",
  "sol", "luna", "estrella", "nube", "agua", "fuego", "rayo", "copo", "gota",
  "viento", "arcoiris", "montana", "tierra", "cometa",

  // Ciencia / instrumentos
  "atomo", "adn", "planeta", "microscopio", "telescopio", "iman", "termometro",
  "bateria", "bombilla", "engranaje", "cohete", "corazon", "diente", "ojo",
  "oido", "mano",

  // Matemática / formas
  "calculadora", "numero", "mas", "menos", "division", "porcentaje", "infinito",
  "funcion", "angulo", "triangulo", "circulo", "cuadrado", "rombo", "hexagono",
  "pentagono", "diamante", "balanza", "regla", "brujula", "mapa", "reloj",

  // Lenguaje / escuela / útiles
  "libro", "libros", "letra", "comillas", "lapiz", "lupa", "pincel", "paleta",
  "tijeras", "musica", "escuela", "persona", "grupo",

  // Objetos / lugares / transporte
  "casa", "banco", "hospital", "iglesia", "castillo", "carpa", "llave",
  "candado", "campana", "bandera", "regalo", "moneda", "globo", "dado",
  "pelota", "bicicleta", "auto", "avion", "barco", "tren",
];

// Normaliza un nombre a la forma canónica de los archivos: minúsculas, sin
// tildes ni diacríticos, solo letras/números/guiones. Así "círculo" → "circulo"
// y "Átomo" → "atomo" también encuentran su icono.
export function normalizarIcono(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/[^a-z0-9_-]/g, ""); // deja solo caracteres de nombre de archivo
}

// Conjunto para lookups O(1) tras normalizar.
const SET_ICONOS = new Set(ICONOS_VALIDOS);

// ¿Existe un icono para este texto? (tolerante a tildes/mayúsculas).
export function tieneIcono(texto: string): boolean {
  return SET_ICONOS.has(normalizarIcono(texto));
}
