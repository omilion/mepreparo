// Sonidos puntuales de lira para los interactivos (sopa, rueda, selección…).
// Reusa el MISMO timbre y la MISMA escala pentatónica que el motor ambiente
// (motorAmbiente.ts), pero como notas CORTAS a demanda, con su propio
// AudioContext ligero: así suenan aunque el ambiente esté en silencio.
//
// Uso: tocarLira() para una nota (rota por la escala), o tocarLira(i) para la
// nota i de la escala (sirve para que "cada tecla suene distinto").

// Escala pentatónica cálida de la lira (Hz), igual que en motorAmbiente.
const ESCALA = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wave: PeriodicWave | null = null;
let rota = 0; // para tocarLira() sin índice: recorre la escala

function asegurar(): boolean {
  if (typeof window === "undefined") return false;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    // timbre cálido con armónicos decrecientes (idéntico a notaLira del ambiente)
    const real = new Float32Array([0, 1.0, 0.35, 0.15, 0.07, 0.03, 0.01, 0.005]);
    const imag = new Float32Array(real.length);
    wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }
  // el contexto suele nacer suspended (autoplay); un gesto del usuario lo despierta
  if (ctx.state === "suspended") void ctx.resume();
  return ctx.state !== "closed";
}

// Toca una nota corta de lira. `indice` elige la nota de la escala (se envuelve
// con módulo); sin índice, avanza por la escala en cada llamada. `octava`
// multiplica la frecuencia (1 = normal, 2 = una octava arriba).
export function tocarLira(indice?: number, octava = 1): void {
  if (!asegurar() || !ctx || !master || !wave) return;
  const i =
    indice === undefined
      ? rota++ % ESCALA.length
      : ((indice % ESCALA.length) + ESCALA.length) % ESCALA.length;
  const frequency = ESCALA[i] * octava;
  const t = ctx.currentTime;
  const duration = 0.5; // corta: es un "tin", no la nota larga del ambiente

  const osc = ctx.createOscillator();
  osc.setPeriodicWave(wave);
  osc.frequency.setValueAtTime(frequency, t);
  osc.detune.setValueAtTime((Math.random() * 2 - 1) * 3, t);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1600, t);
  filter.frequency.exponentialRampToValueAtTime(300, t + duration * 0.5);
  filter.Q.setValueAtTime(0.8, t);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.5, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(filter);
  filter.connect(env);
  env.connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.05);
  osc.onended = () => {
    try {
      osc.disconnect();
      filter.disconnect();
      env.disconnect();
    } catch {
      /* ya limpio */
    }
  };
}

// Número de notas de la escala (por si un componente quiere mapear posiciones).
export const NOTAS_LIRA = ESCALA.length;
