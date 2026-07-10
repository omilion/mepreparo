"use client";

import { useState, useEffect, useRef } from "react";

// Conmutador de audio para concentración. Genera música ambiental infinita,
// relajante y orgánica al vuelo utilizando la API Web Audio nativa del navegador.
// Evita descargas de MP3 y no consume cuotas ni ancho de banda.
//
// Modelo de Cuerda Pulsada (Harp/Lyre):
// - Síntesis mediante Tabla de Ondas Periódicas (PeriodicWave) configurada con
//   los armónicos reales y cálidos de una lira.
// - Transitorio de ataque físico simulado con un golpe de ruido blanco filtrado
//   en paso banda de 15ms.
// - Filtro de paso bajo que decae rápido para simular la amortiguación natural.
// - Paneo estéreo aleatorio leve para dar espacialidad y profundidad.

export function SoundToggle() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scale = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

  function playLyreNote(frequency: number, duration: number) {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;

    // 1. Ola armónica personalizada (PeriodicWave) para timbre cálido (sin zumbidos de armónicos altos)
    const real = new Float32Array([0, 1.0, 0.35, 0.15, 0.07, 0.03, 0.01, 0.005]);
    const imag = new Float32Array(real.length);
    const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

    // 2. Generador armónico (Cuerpo de la cuerda)
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave);
    
    // Microdesafinación humana sutil para dar calidez natural
    const detune = (Math.random() * 2 - 1) * 3; // -3 a +3 cents
    osc.frequency.setValueAtTime(frequency, t);
    osc.detune.setValueAtTime(detune, t);

    // 3. Amortiguación acústica (Filtro paso bajo dinámico)
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    const startFreq = 1000 + Math.random() * 200; // ~1100 Hz inicial
    const endFreq = 160 + Math.random() * 40;     // ~180 Hz de sustain
    filter.frequency.setValueAtTime(startFreq, t);
    filter.frequency.exponentialRampToValueAtTime(endFreq, t + duration * 0.45);
    filter.Q.setValueAtTime(0.8, t);

    // Envolvente de decaimiento largo
    const ampEnv = ctx.createGain();
    const volumeFactor = 0.85 + Math.random() * 0.3; // pequeña variación de fuerza
    ampEnv.gain.setValueAtTime(0, t);
    ampEnv.gain.linearRampToValueAtTime(0.12 * volumeFactor, t + 0.005); // 5ms de ataque suave
    ampEnv.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(filter);
    filter.connect(ampEnv);

    // 4. Excitación del ataque (Simula el roce del dedo o uña)
    // Ruido blanco muy corto y filtrado
    const noiseBufferSize = ctx.sampleRate * 0.015; // 15ms
    const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBufferSize; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(550, t);
    noiseFilter.Q.setValueAtTime(1.8, t);

    const noiseEnv = ctx.createGain();
    noiseEnv.gain.setValueAtTime(0.07 * volumeFactor, t);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.012);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseEnv);

    // 5. Mezclador y Paneo Espacial
    const mixer = ctx.createGain();
    ampEnv.connect(mixer);
    noiseEnv.connect(mixer);

    let lastNode: AudioNode = mixer;
    let panner: StereoPannerNode | null = null;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      const panVal = (Math.random() * 2 - 1) * 0.16; // ligero paneo estéreo
      panner.pan.setValueAtTime(panVal, t);
      mixer.connect(panner);
      lastNode = panner;
    }

    lastNode.connect(ctx.destination);

    // Encendido
    osc.start(t);
    osc.stop(t + duration + 0.1);
    noiseSource.start(t);
    noiseSource.stop(t + 0.05);

    // Limpieza
    setTimeout(() => {
      try {
        osc.disconnect();
        filter.disconnect();
        ampEnv.disconnect();
        noiseSource.disconnect();
        noiseFilter.disconnect();
        noiseEnv.disconnect();
        mixer.disconnect();
        if (panner) panner.disconnect();
      } catch {
        // seguro
      }
    }, duration * 1000 + 100);
  }

  function playSparseMelody() {
    if (Math.random() < 0.6) {
      const note = scale[Math.floor(Math.random() * scale.length)];
      const octave = Math.random() < 0.25 ? 2 : 1;
      playLyreNote(note * octave, 5.0);
    }
  }

  // Reprograma la siguiente nota con una pausa aleatoria entre 2.2 y 3.4 s,
  // así el ritmo respira y nunca se siente mecánico.
  function scheduleNext() {
    const delay = 2200 + Math.random() * 1200; // 2.2 s .. 3.4 s
    timeoutIdRef.current = setTimeout(() => {
      playSparseMelody();
      scheduleNext();
    }, delay);
  }

  function ensureCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function start() {
    ensureCtx();
    setIsPlaying(true);
    playLyreNote(329.63, 5.0);
    scheduleNext();
  }

  function stop() {
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = null;
    setIsPlaying(false);
  }

  function toggle() {
    if (isPlaying) stop();
    else start();
  }

  // Activado de fábrica: intenta arrancar al montar. Muchos navegadores
  // bloquean el audio hasta un gesto del usuario; si es así, arranca en la
  // primera interacción (un solo intento).
  useEffect(() => {
    let armado = false;
    const intentar = () => {
      if (armado) return;
      const ctx = ensureCtx();
      if (ctx.state === "running") {
        armado = true;
        start();
        quitarListeners();
      }
    };
    const alGesto = () => {
      if (armado) return;
      armado = true;
      start();
      quitarListeners();
    };
    const quitarListeners = () => {
      window.removeEventListener("pointerdown", alGesto);
      window.removeEventListener("keydown", alGesto);
    };

    intentar(); // por si el navegador ya permite audio
    if (!armado) {
      window.addEventListener("pointerdown", alGesto, { once: false });
      window.addEventListener("keydown", alGesto, { once: false });
    }

    return () => {
      quitarListeners();
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      onClick={toggle}
      aria-pressed={isPlaying}
      aria-label={
        isPlaying ? "Silenciar sonido ambiente" : "Activar sonido ambiente"
      }
      title={isPlaying ? "Sonido ambiente activado" : "Sonido ambiente"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-hair text-ink-soft transition-colors hover:text-ink"
    >
      {isPlaying ? <IconSonido /> : <IconSonidoOff />}
    </button>
  );
}

function IconSonido() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a9 9 0 0 1 0 12" />
    </svg>
  );
}

function IconSonidoOff() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="m16 9 5 6M21 9l-5 6" />
    </svg>
  );
}
