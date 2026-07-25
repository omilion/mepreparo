"use client";

import { useState } from "react";
import { AuraOrb } from "@/components/AuraOrb";
import { EXPRESIONES, type EstadoRai } from "@/lib/tutor/expresion";
import { MATERIAS, type Materia } from "@/lib/profile";

// TALLER DE EXPRESIONES DE RAI (interno, no es parte del flujo del niño).
// Sirve para VER las emociones una al lado de la otra y para probar la
// transición entre dos estados, que es lo que de verdad hay que afinar.

const ESTADOS = Object.keys(EXPRESIONES) as EstadoRai[];

// Dónde ocurre cada uno en la clase real (para poder juzgar la coreografía,
// no solo la forma). Si algo se ve raro, el problema suele ser el MOMENTO.
const CUANDO: Record<EstadoRai, string> = {
  reposo: "antes del primer mensaje",
  pensando: "esperando la respuesta de Rai",
  hablando: "mientras su texto se revela",
  escuchando: "terminó de hablar, le toca al niño",
  saludo: "al entrar a la clase y al despedirse",
  celebracion: "el niño acertó (justo después del sí)",
  animo: "el niño falló (justo después del no): acompaña",
  idea: "aparece una actividad",
  duda: "Rai terminó preguntando",
  si: "“sí” / “es esa”: respuesta correcta o afirmación",
  no: "“no” / “esa no era”: respuesta incorrecta o negación",
  ausente: "sin conexión: Rai no está",
};

export default function TallerRai() {
  const [estado, setEstado] = useState<EstadoRai>("reposo");
  const [materia, setMateria] = useState<Materia>("matematica");

  // Los gestos (sí/no) y los ripples se disparan AL ENTRAR a un estado. Si ya
  // estás en él, pasamos un instante por reposo para poder verlo de nuevo.
  function elegir(e: EstadoRai) {
    if (e !== estado) return setEstado(e);
    setEstado("reposo");
    setTimeout(() => setEstado(e), 40);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[900px] flex-col items-center gap-8 px-6 py-10">
      <div className="flex h-[240px] items-center">
        <AuraOrb materia={materia} size={200} estado={estado} />
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-[15px] text-ink">
          <strong>{estado}</strong> — {CUANDO[estado]}
        </p>
        <p className="text-[12px] text-ink-soft">
          vuelve a tocar el mismo botón para repetir el gesto
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {ESTADOS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => elegir(e)}
            className={
              "rounded-full border px-4 py-1.5 text-[13px] transition-colors " +
              (estado === e
                ? "border-sage-deep text-sage-deep"
                : "border-ink-soft/25 text-ink-soft hover:border-ink-soft/60")
            }
          >
            {e}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {MATERIAS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMateria(m.id)}
            className={
              "rounded-full px-3 py-1 text-[12px] transition-opacity " +
              (materia === m.id ? "text-ink" : "text-ink-soft opacity-60")
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Todos a la vez, en chico: así se compara si de verdad se distinguen */}
      <div className="grid grid-cols-3 gap-6 pt-6 sm:grid-cols-5">
        {ESTADOS.map((e) => (
          <div key={e} className="flex flex-col items-center gap-2">
            <AuraOrb materia={materia} size={72} estado={e} />
            <span className="text-[11px] text-ink-soft">{e}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
