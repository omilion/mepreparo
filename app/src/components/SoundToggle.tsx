"use client";

import { useState, useEffect, useRef } from "react";

export function SoundToggle() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scale = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

  // Nota de cuerda pulsada (lira/arpa) sintetizada: en vez de un solo
  // oscilador "digital", sumamos varios parciales (armónicos) con amplitudes
  // decrecientes y un ataque casi instantáneo + decaimiento largo. Eso es lo
  // que hace que "suene" a una cuerda que se pulsa y se apaga, no a un pitido.
  // Algoritmo Karplus-Strong: modelado físico de cuerda pulsada (lira/arpa)
  // mediante un bucle de retardo filtrado que responde a un ataque de ruido.
  // Evita osciladores artificiales y logra timbre, resonancia y decay orgánicos.
  function playKarplusStrong(frequency: number, duration: number, isSympathetic = false) {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;

    // 1. Variaciones microscópicas de entrada (caos natural de pulsación)
    const factorVolumen = isSympathetic ? 0.08 : (0.85 + Math.random() * 0.3); // volumen variable
    const factorFiltro = 0.9 + Math.random() * 0.2; // rango de brillo
    const detuneCents = (Math.random() * 2 - 1) * 3; // desfinación muy leve (-3 a +3 cents)
    const freqAfinada = frequency * Math.pow(2, detuneCents / 1200);

    // Período de retardo para la frecuencia fundamental
    const period = 1 / freqAfinada;

    // 2. Creación de nodos del bucle de realimentación
    const delayNode = ctx.createDelay(1.0);
    delayNode.delayTime.setValueAtTime(period, t);

    const feedbackGain = ctx.createGain();
    // Coeficiente de feedback (decay). Las notas más graves resuenan más tiempo.
    const feedbackValue = Math.min(0.996, Math.pow(0.991, period * 100));
    feedbackGain.gain.setValueAtTime(feedbackValue, t);

    // Filtro de atenuación de armónicos dentro del bucle
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3200 * factorFiltro, t);
    filter.frequency.exponentialRampToValueAtTime(280 * factorFiltro, t + duration * 0.45);

    // Conexión del loop de realimentación: Delay -> Filter -> Feedback -> Delay
    delayNode.connect(filter);
    filter.connect(feedbackGain);
    feedbackGain.connect(delayNode);

    // 3. Excitación: Ruido de ataque muy corto (roce de dedo y uña)
    const bufferSize = ctx.sampleRate * 0.018; // ~18ms de ruido
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    noiseSource.connect(noiseGain);
    noiseGain.connect(delayNode);

    // 4. Vibrato natural tardío (inicia a los 250ms)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(4.2 + Math.random() * 0.8, t); // frecuencia LFO ~4.6Hz
    lfoGain.gain.setValueAtTime(0, t);
    lfoGain.gain.setValueAtTime(0, t + 0.25);
    lfoGain.gain.linearRampToValueAtTime(period * 0.008, t + 0.8); // modulación del 0.8% del periodo

    lfo.connect(lfoGain);
    lfoGain.connect(delayNode.delayTime);

    // 5. Ganancia global de la nota
    const globalGain = ctx.createGain();
    globalGain.gain.setValueAtTime(0, t);
    globalGain.gain.linearRampToValueAtTime(0.12 * factorVolumen, t + 0.004);
    globalGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    filter.connect(globalGain);

    // 6. Espacialización Estéreo (Paneo aleatorio)
    let lastNode: AudioNode = globalGain;
    let panner: StereoPannerNode | null = null;
    if (ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      const panVal = (Math.random() * 2 - 1) * 0.18; // paneo entre -0.18 y 0.18
      panner.pan.setValueAtTime(panVal, t);
      globalGain.connect(panner);
      lastNode = panner;
    }

    lastNode.connect(ctx.destination);

    // Iniciar osciladores y fuentes
    noiseSource.start(t);
    noiseSource.stop(t + 0.04);
    lfo.start(t);
    lfo.stop(t + duration);

    // Limpieza de nodos al finalizar
    setTimeout(() => {
      try {
        noiseSource.disconnect();
        noiseGain.disconnect();
        lfo.disconnect();
        lfoGain.disconnect();
        delayNode.disconnect();
        filter.disconnect();
        feedbackGain.disconnect();
        globalGain.disconnect();
        if (panner) panner.disconnect();
      } catch {
        // Ignorar si ya se desconectó
      }
    }, duration * 1000 + 100);

    // 7. Resonancia Simpática (12% de probabilidad, excepto si ya es una nota simpática)
    if (!isSympathetic && Math.random() < 0.12) {
      const freqSimpatica = frequency * (Math.random() < 0.5 ? 2 : 1.5); // octava o quinta justa
      playKarplusStrong(freqSimpatica, duration * 0.7, true);
    }
  }

  function playSparseMelody() {
    if (Math.random() < 0.6) {
      const note = scale[Math.floor(Math.random() * scale.length)];
      const octave = Math.random() < 0.25 ? 2 : 1;
      playKarplusStrong(note * octave, 5.0);
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
    playKarplusStrong(329.63, 5.0);
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
