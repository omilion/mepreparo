// Motor de audio ambiente para concentración (Web Audio API, sin archivos).
// Tres capas superpuestas, calibradas con valores de investigación y proyectos
// de referencia (Noisehack para el ruido, Sequoia/foros para la mezcla del
// binaural, Brain.fm para marrón>rosado en público TDAH):
//
//   1) Ruido MARRÓN de fondo (colchón continuo, resonancia estocástica).
//      Grave y suave; funciona con parlantes; enmascara distracciones.
//   2) Binaural SUTIL (casi subliminal, ~12% del mix) con el carrier afinado a
//      NUESTRA escala (no un tono arbitrario) para que se funda con la lira.
//      Requiere audífonos para hacer efecto; sin ellos no molesta.
//   3) LIRA pulsada encima (la melodía que el niño oye), comprimida para
//      eliminar los sobresaltos (startle reflex).
//
// Cada capa se puede apagar. Todo pasa por un DynamicsCompressor + master gain,
// así la suma nunca clipea ni sobresalta.

export type Ambiente = "concentracion" | "calma" | "silencio";

// Escala pentatónica cálida de la lira (Hz). El carrier del binaural sale de
// aquí para no chocar armónicamente con las notas.
const ESCALA = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

interface ConfigAmbiente {
  ruido: boolean; // colchón marrón
  ruidoGain: number;
  binaural: boolean;
  beatHz: number; // 40 = Gamma (foco); 16 = Beta (déficit atencional)
  binauralGain: number; // muy bajo: casi subliminal
  lira: boolean;
  liraGain: number;
  // cada cuánto suena una nota de lira (ms) — tempo lento
  liraMinMs: number;
  liraMaxMs: number;
}

const PRESETS: Record<Exclude<Ambiente, "silencio">, ConfigAmbiente> = {
  // Concentración: foco de alta demanda (ejercicios). Gamma 40Hz, lira presente.
  // Valores de fondo audibles pero no invasivos (pendiente de calibración fina
  // con el usuario: se ajustan sin tocar nada más, solo estos números).
  concentracion: {
    ruido: true,
    ruidoGain: 0.015,
    binaural: true,
    beatHz: 40,
    binauralGain: 0.08,
    lira: true,
    liraGain: 0.16,
    liraMinMs: 2600,
    liraMaxMs: 4200,
  },
  // Calma: lectura/repaso relajado. Beta 16Hz (útil en déficit atencional),
  // colchón un poco más presente, lira más espaciada.
  calma: {
    ruido: true,
    ruidoGain: 0.02,
    binaural: true,
    beatHz: 16,
    binauralGain: 0.07,
    lira: true,
    liraGain: 0.12,
    liraMinMs: 4000,
    liraMaxMs: 6500,
  },
};

// La nota de escala más cercana a un objetivo grave, como carrier del binaural.
function carrierParaBinaural(): number {
  // usamos la más grave (220Hz) como base: grave = no fatiga, se funde bien
  return ESCALA[0];
}

export class MotorAmbiente {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private compresor: DynamicsCompressorNode | null = null;

  // capa ruido
  private ruidoNode: AudioBufferSourceNode | null = null;
  private ruidoGain: GainNode | null = null;

  // capa binaural (dos osciladores, uno por oído)
  private oscL: OscillatorNode | null = null;
  private oscR: OscillatorNode | null = null;
  private binauralGain: GainNode | null = null;

  // capa lira
  private liraGain: GainNode | null = null;
  private liraTimer: ReturnType<typeof setTimeout> | null = null;

  private ambienteActual: Ambiente = "silencio";

  get ambiente(): Ambiente {
    return this.ambienteActual;
  }
  get activo(): boolean {
    return this.ambienteActual !== "silencio";
  }

  // Cambia de ambiente. "silencio" apaga todo. Es async porque el AudioContext
  // suele nacer "suspended" (política de autoplay) y hay que ESPERAR a que esté
  // running antes de armar las capas continuas (ruido/binaural), o arrancan en
  // el vacío y no suenan. Devuelve el ambiente aplicado.
  async setAmbiente(a: Ambiente): Promise<Ambiente> {
    if (a === "silencio") {
      this.detener();
      this.ambienteActual = "silencio";
      return a;
    }
    await this.asegurarContexto();
    this.detenerCapas(); // limpia lo previo antes de rearmar
    const cfg = PRESETS[a];
    if (cfg.ruido) this.iniciarRuido(cfg.ruidoGain);
    if (cfg.binaural) this.iniciarBinaural(cfg.beatHz, cfg.binauralGain);
    if (cfg.lira) this.iniciarLira(cfg.liraGain, cfg.liraMinMs, cfg.liraMaxMs);
    this.ambienteActual = a;
    return a;
  }

  detener(): void {
    this.detenerCapas();
    this.ambienteActual = "silencio";
  }

  // --- infraestructura ---
  private async asegurarContexto(): Promise<void> {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      // cadena: capas → compresor → master → destino
      this.compresor = this.ctx.createDynamicsCompressor();
      // compresión suave anti-sobresalto (rango dinámico contenido)
      this.compresor.threshold.value = -28;
      this.compresor.knee.value = 24;
      this.compresor.ratio.value = 4;
      this.compresor.attack.value = 0.05;
      this.compresor.release.value = 0.4;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.compresor.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    // ESPERAR a que el contexto esté corriendo antes de seguir (resume es async).
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* si el navegador aún lo bloquea, las capas igual se conectan */
      }
    }
  }

  private detenerCapas(): void {
    if (this.liraTimer) {
      clearTimeout(this.liraTimer);
      this.liraTimer = null;
    }
    const t = this.ctx?.currentTime ?? 0;

    // CAPTURAR las fuentes ACTUALES ahora, y limpiar las referencias del motor
    // enseguida. Así el motor queda "vacío" para que las capas NUEVAS que se
    // creen justo después no sean apagadas por el setTimeout diferido de abajo.
    const ruidoViejo = this.ruidoNode;
    const oscLViejo = this.oscL;
    const oscRViejo = this.oscR;
    const gainsViejos = [this.ruidoGain, this.binauralGain, this.liraGain];
    this.ruidoNode = null;
    this.oscL = null;
    this.oscR = null;
    this.ruidoGain = null;
    this.binauralGain = null;
    this.liraGain = null;

    // fade-out corto de los gains viejos (evita clicks)
    for (const g of gainsViejos) {
      if (g && this.ctx) {
        try {
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(g.gain.value, t);
          g.gain.linearRampToValueAtTime(0.0001, t + 0.25);
        } catch {
          /* nodo ya desconectado */
        }
      }
    }

    // parar SOLO las fuentes viejas capturadas, tras el fade
    const parar = () => {
      for (const src of [ruidoViejo, oscLViejo, oscRViejo]) {
        try {
          src?.stop();
        } catch {
          /* ya parado */
        }
      }
    };
    if (this.ctx) setTimeout(parar, 300);
    else parar();
  }

  // --- capa 1: ruido marrón (Noisehack: out = (last + 0.02*white)/1.02, ×3.5) ---
  private iniciarRuido(gain: number): void {
    if (!this.ctx || !this.compresor) return;
    const dur = 4; // 4s de buffer en loop (suficiente para sonar continuo)
    const n = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    // filtro paso-bajo BAJO (~500Hz): quita lo áspero/estridente y deja solo el
    // rumor grave → colchón tipo "lluvia lejana", no "estática pegada al oído".
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 500;
    lp.Q.value = 0.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, this.ctx.currentTime + 2.5); // fade-in lento
    src.connect(lp);
    lp.connect(g);
    g.connect(this.compresor);
    src.start();
    this.ruidoNode = src;
    this.ruidoGain = g;
  }

  // --- capa 2: binaural (dos sines, carrier±beat/2, panneados L/R) ---
  private iniciarBinaural(beatHz: number, gain: number): void {
    if (!this.ctx || !this.compresor) return;
    const carrier = carrierParaBinaural();
    const half = beatHz / 2;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, this.ctx.currentTime + 1.5); // fade-in aún más lento

    const mk = (freq: number, pan: number): OscillatorNode => {
      const osc = this.ctx!.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const p = this.ctx!.createStereoPanner();
      p.pan.value = pan;
      osc.connect(p);
      p.connect(g);
      osc.start();
      return osc;
    };
    this.oscL = mk(carrier - half, -1);
    this.oscR = mk(carrier + half, 1);
    g.connect(this.compresor);
    this.binauralGain = g;
  }

  // --- capa 3: lira pulsada (nota cálida cada X ms, comprimida) ---
  private iniciarLira(gain: number, minMs: number, maxMs: number): void {
    if (!this.ctx || !this.compresor) return;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.connect(this.compresor);
    this.liraGain = g;

    const tocar = () => {
      if (Math.random() < 0.7) {
        const nota = ESCALA[Math.floor(Math.random() * ESCALA.length)];
        const octava = Math.random() < 0.25 ? 2 : 1;
        this.notaLira(nota * octava, 5.0, g);
      }
      const delay = minMs + Math.random() * (maxMs - minMs);
      this.liraTimer = setTimeout(tocar, delay);
    };
    tocar();
  }

  // Una nota de lira (cuerda pulsada) hacia el gain de la capa lira.
  private notaLira(frequency: number, duration: number, destino: GainNode): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;

    // timbre cálido con armónicos decrecientes
    const real = new Float32Array([0, 1.0, 0.35, 0.15, 0.07, 0.03, 0.01, 0.005]);
    const imag = new Float32Array(real.length);
    const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave);
    osc.frequency.setValueAtTime(frequency, t);
    osc.detune.setValueAtTime((Math.random() * 2 - 1) * 3, t);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000 + Math.random() * 200, t);
    filter.frequency.exponentialRampToValueAtTime(160 + Math.random() * 40, t + duration * 0.45);
    filter.Q.setValueAtTime(0.8, t);

    const env = ctx.createGain();
    const vf = 0.85 + Math.random() * 0.3;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vf, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(filter);
    filter.connect(env);
    env.connect(destino);
    osc.start(t);
    osc.stop(t + duration + 0.1);
    setTimeout(() => {
      try {
        osc.disconnect();
        filter.disconnect();
        env.disconnect();
      } catch {
        /* ya limpio */
      }
    }, duration * 1000 + 200);
  }
}
