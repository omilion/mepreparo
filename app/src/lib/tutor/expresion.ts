// EL LENGUAJE DE RAI: UN CONTORNO, NADA MÁS
//
// Rai no es una mancha de luz ni tiene iconos: es UN ANILLO. Nada de relleno,
// nada de brillo pulsante. Todo lo que siente lo dice deformando su contorno.
//
// Principio zen (aprendido a la mala): el reposo es el 95% del tiempo y debe ser
// CASI IMPERCEPTIBLE. La emoción no se dice subiendo el brillo, se dice cambiando
// el GROSOR, el RITMO y la FORMA DE LA ONDA. Si dudas, quítale amplitud.
//
// Los parámetros son cinco, todos sobre el mismo trazo:
//
//   GROSOR   → fino = discreto/pensativo · grueso = presente/atento
//   COLOR    → el de la materia, con un acento emocional muy tenue encima
//   ONDA     → cuántos lóbulos deforman el círculo y cuánto (siempre poco)
//   PULSO    → la respiración lenta del radio completo
//   HALO     → resplandor exterior difuso (se usa con MUCHA moderación)
//
// Y dos gestos puntuales, no permanentes:
//   RIPPLE   → un anillo que sale hacia afuera y se desvanece (acierto, saludo)
//   VOZ      → mientras habla, la onda respira al ritmo de las frases
//
// Escalas de referencia (para no volver a pasarse):
//   amplitud  0.005 = imperceptible · 0.02 = se nota · 0.05 = MUCHO, solo celebrar
//   velocidad 0.05  = deriva lenta   · 0.20 = notoria · 0.45 = agitada
//   ritmo     7s    = calma          · 3s   = atento  · 1.5s = excitado

export type EstadoRai =
  | "reposo" // en calma, esperando
  | "pensando" // procesando la respuesta
  | "hablando" // está diciendo algo
  | "escuchando" // el niño tiene la palabra
  | "saludo" // llega, se presenta
  | "celebracion" // el niño acertó
  | "animo" // el niño falló: Rai se acerca sin castigar
  | "idea" // "¡mira esto!" — anuncia una actividad
  | "duda" // pregunta, curiosidad
  | "si" // asiente: "sí" / "correcto"
  | "no" // niega: "no" / "esa respuesta no es"
  | "ausente"; // no hay conexión: Rai se aleja y se apaga

export type Expresion = {
  // GROSOR del trazo, en px a un orbe de 128 (se escala con el tamaño real)
  grosor: number;
  // TAMAÑO del anillo: fracción del espacio disponible
  radio: number;
  // COLOR: acento emocional que tiñe el trazo de la materia (peso 0..1, tenue)
  acento: string;
  peso: number;
  opacidad: number;
  // ONDA: lóbulos (puede ser decimal, se interpola) y cuánto deforman el radio
  lobulos: number;
  amplitud: number;
  velocidad: number; // rad/s a la que gira la onda alrededor del anillo
  // PULSO: respiración del radio completo
  pulso: number; // 0..1 fracción del radio
  ritmo: number; // segundos por respiración
  // HALO: resplandor exterior (0 = ninguno)
  halo: number;
  // VOZ: 0 salvo cuando habla; modula la onda al ritmo de las frases
  voz: number;
  // DESVANECE: 0..1 — cuánto se apaga la opacidad al respirar. Solo lo usa el
  // estado "ausente" (sin conexión): el gris va y viene, como una señal débil.
  desvanece: number;
};

export const EXPRESIONES: Record<EstadoRai, Expresion> = {
  // En calma. Un círculo que casi no se mueve: hay que MIRARLO para notar que
  // está vivo. Este es el estado base y define todo lo demás por contraste.
  reposo: {
    grosor: 1.6,
    radio: 0.8,
    acento: "#FFFFFF",
    peso: 0,
    opacidad: 0.55,
    lobulos: 3,
    amplitud: 0.008,
    velocidad: 0.05,
    pulso: 0.012,
    ritmo: 7,
    halo: 0.12,
    voz: 0,
    desvanece: 0,
  },

  // Pensando: se ADELGAZA y se recoge, la onda se vuelve más menuda y algo más
  // inquieta. Se lee como concentración, no como carga de sistema.
  pensando: {
    grosor: 1.1,
    radio: 0.74,
    acento: "#9AB8FF",
    peso: 0.25,
    opacidad: 0.5,
    lobulos: 5,
    amplitud: 0.02,
    velocidad: 0.26,
    pulso: 0.008,
    ritmo: 3.4,
    halo: 0.06,
    voz: 0,
    desvanece: 0,
  },

  // Hablando: ENGROSA (está presente) y la onda respira con las frases. El
  // movimiento viene de `voz`, no de la velocidad: no gira más rápido, ondula.
  hablando: {
    grosor: 2.2,
    radio: 0.8,
    acento: "#FFFFFF",
    peso: 0.1,
    opacidad: 0.7,
    lobulos: 4,
    // más marcada que el resto a propósito: es el único momento en que la onda
    // ES el mensaje (se le ve la voz). Aun así queda bajo la celebración.
    amplitud: 0.024,
    velocidad: 0.12,
    pulso: 0.01,
    ritmo: 3,
    halo: 0.14,
    voz: 1,
    desvanece: 0,
  },

  // Escuchando: el trazo más GRUESO y limpio de todos, onda casi plana, ritmo
  // largo. Atención total y silencio: la energía está en el niño.
  escuchando: {
    grosor: 2.6,
    radio: 0.84,
    acento: "#8FE0C6",
    peso: 0.16,
    opacidad: 0.72,
    lobulos: 2,
    amplitud: 0.005,
    velocidad: 0.03,
    pulso: 0.01,
    ritmo: 6.5,
    halo: 0.2,
    voz: 0,
    desvanece: 0,
  },

  // Saludo: se abre un poco y se define. Cálido, sin fuegos artificiales.
  saludo: {
    grosor: 2.4,
    radio: 0.86,
    acento: "#F5C77E",
    peso: 0.35,
    opacidad: 0.75,
    lobulos: 3,
    amplitud: 0.014,
    velocidad: 0.12,
    pulso: 0.018,
    ritmo: 4.5,
    halo: 0.24,
    voz: 0,
    desvanece: 0,
  },

  // Celebración: el único estado que se permite ser notorio — y aun así la
  // amplitud es 0.04, no 0.15. Lo que celebra de verdad son los ripples.
  celebracion: {
    grosor: 2.8,
    radio: 0.88,
    acento: "#FFD98A",
    peso: 0.45,
    opacidad: 0.85,
    lobulos: 6,
    amplitud: 0.04,
    velocidad: 0.42,
    pulso: 0.03,
    ritmo: 1.6,
    halo: 0.32,
    voz: 0,
    desvanece: 0,
  },

  // Ánimo (el niño falló): NO es castigo. Se adelgaza, se recoge y baja el
  // ritmo casi hasta detenerse. Presencia tibia y callada, sin juicio.
  animo: {
    grosor: 1.2,
    radio: 0.72,
    acento: "#9AB8FF",
    peso: 0.3,
    opacidad: 0.42,
    lobulos: 2,
    amplitud: 0.006,
    velocidad: 0.04,
    pulso: 0.008,
    ritmo: 8,
    halo: 0.05,
    voz: 0,
    desvanece: 0,
  },

  // Idea: un instante de nitidez. Trazo firme + un ripple. Dura poco.
  idea: {
    grosor: 2.5,
    radio: 0.82,
    acento: "#FFF3C4",
    peso: 0.4,
    opacidad: 0.8,
    lobulos: 4,
    amplitud: 0.01,
    velocidad: 0.16,
    pulso: 0.014,
    ritmo: 2.6,
    halo: 0.3,
    voz: 0,
    desvanece: 0,
  },

  // Duda: la onda gira al REVÉS y es asimétrica (3 lóbulos y medio). Se lee como
  // algo que no termina de cuadrar, sin necesidad de un signo de pregunta.
  duda: {
    grosor: 1.7,
    radio: 0.78,
    acento: "#C9A7F5",
    peso: 0.28,
    opacidad: 0.6,
    lobulos: 3.5,
    amplitud: 0.022,
    velocidad: -0.14,
    pulso: 0.01,
    ritmo: 3.8,
    halo: 0.1,
    voz: 0,
    desvanece: 0,
  },

  // Asentir. La expresión base es tranquila y algo gruesa (presencia amable);
  // lo que comunica es el GESTO, definido más abajo.
  si: {
    grosor: 2.4,
    radio: 0.8,
    acento: "#8FE0C6",
    peso: 0.22,
    opacidad: 0.72,
    lobulos: 3,
    amplitud: 0.007,
    velocidad: 0.06,
    pulso: 0.008,
    ritmo: 4,
    halo: 0.16,
    voz: 0,
    desvanece: 0,
  },

  // Negar. Mismo principio, algo más fino y con la onda girando al revés.
  no: {
    grosor: 2,
    radio: 0.78,
    acento: "#C9A7F5",
    peso: 0.22,
    opacidad: 0.62,
    lobulos: 3,
    amplitud: 0.007,
    velocidad: -0.06,
    pulso: 0.008,
    ritmo: 4.5,
    halo: 0.1,
    voz: 0,
    desvanece: 0,
  },

  // SIN CONEXIÓN. Rai no está: se va lejos (queda al 30% de su tamaño), pierde
  // el color de la materia — se vuelve gris plano, sin halo — y su opacidad va y
  // viene con la respiración, como una señal débil. Es el único estado que
  // abandona el color: cuando Rai vuelve, el color vuelve con él.
  ausente: {
    grosor: 1.4,
    radio: 0.24, // 30% del radio de reposo (0.8)
    acento: "#8A9098", // gris
    peso: 1, // tapa por completo el color de la materia
    opacidad: 0.5,
    lobulos: 2,
    amplitud: 0.004,
    velocidad: 0.02,
    pulso: 0.01,
    ritmo: 5,
    halo: 0,
    voz: 0,
    desvanece: 0.6, // el gris se va hasta ~0.2 y vuelve
  },
};

// GESTOS: movimientos con principio y fin (no son estados de ánimo, son actos).
//
// Cómo se construye un "sí": el anillo se desplaza hacia arriba MIENTRAS se
// comprime un poco en vertical. El resultado es exactamente lo que se ve al
// asentir — el borde de abajo entra hacia adentro y sube harto, y el de arriba
// se estira apenas hacia arriba. Al invertirse el desplazamiento (segunda mitad
// del ciclo) pasa lo contrario: el de arriba se curva hacia adentro y baja, y el
// de abajo se estira un poco hacia abajo. La compresión NO cambia de signo: es
// la que hace que un lado se hunda mucho y el opuesto se estire poco.
//
// El "no" es lo mismo sobre el eje horizontal, más rápido y con menos recorrido.
export type Gesto = {
  eje: "x" | "y";
  frecuencia: number; // oscilaciones por segundo
  amplitud: number; // desplazamiento, como fracción del radio
  compresion: number; // cuánto se aplasta en el eje del gesto (fracción)
  duracion: number; // ms que dura el gesto completo
};

export const GESTOS: Partial<Record<EstadoRai, Gesto>> = {
  si: { eje: "y", frecuencia: 1.15, amplitud: 0.13, compresion: 0.085, duracion: 1700 },
  no: { eje: "x", frecuencia: 1.7, amplitud: 0.1, compresion: 0.07, duracion: 1300 },
};

// Estados que además EMITEN un anillo hacia afuera al entrar en ellos. Es un
// gesto puntual (no un loop): por eso vive aquí y no en la expresión.
export const EMITE_RIPPLE: Partial<Record<EstadoRai, number>> = {
  celebracion: 3,
  saludo: 1,
  idea: 1,
  escuchando: 1,
};

// El resto de la app (y el vocabulario de iconos de Gemini) usa otros nombres.
// Los traducimos en vez de obligar a cambiar cada llamada.
const ALIAS: Record<string, EstadoRai> = {
  cerebro: "pensando",
  pensando: "pensando",
  hablando: "hablando",
  escuchando: "escuchando",
  saludo: "saludo",
  sonrisa: "saludo",
  guino: "saludo",
  correcto: "celebracion",
  celebracion: "celebracion",
  trofeo: "celebracion",
  premio: "celebracion",
  estrella: "celebracion",
  pulgar: "celebracion",
  corazon: "celebracion",
  incorrecto: "animo",
  triste: "animo",
  animo: "animo",
  idea: "idea",
  bombilla: "idea",
  sorpresa: "idea",
  pregunta: "duda",
  duda: "duda",
  si: "si",
  asentir: "si",
  no: "no",
  negar: "no",
  ausente: "ausente",
  desconectado: "ausente",
};

export function normalizarEstado(estado?: string): EstadoRai {
  if (!estado) return "reposo";
  return ALIAS[estado] ?? "reposo";
}

export function expresionDe(estado?: string): Expresion {
  return EXPRESIONES[normalizarEstado(estado)];
}
