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
  function playLyreNote(frequency: number, duration: number) {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;

    // bus de la nota: filtro que se cierra con el tiempo (los armónicos altos
    // de una cuerda se apagan antes que el fundamental) + envolvente global.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2600, t);
    filter.frequency.exponentialRampToValueAtTime(320, t + duration * 0.6);
    filter.Q.value = 0.7;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.13, t + 0.006); // pulsación: ataque muy rápido
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration); // cola larga

    filter.connect(env);
    env.connect(ctx.destination);

    // parciales: fundamental + armónicos 2 y 3, cada uno más suave y con
    // decaimiento propio (los altos mueren antes). Un leve detune da cuerpo.
    const parciales = [
      { mult: 1, amp: 1.0, decay: 1.0, detune: 0 },
      { mult: 2, amp: 0.42, decay: 0.7, detune: 2 },
      { mult: 3, amp: 0.2, decay: 0.5, detune: -3 },
      { mult: 4.01, amp: 0.09, decay: 0.4, detune: 4 }, // inarmónico leve = cuerda real
    ];

    for (const p of parciales) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency * p.mult, t);
      osc.detune.setValueAtTime(p.detune, t);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(p.amp, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration * p.decay);

      osc.connect(g);
      g.connect(filter);
      osc.start(t);
      osc.stop(t + duration * p.decay + 0.05);
    }
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
