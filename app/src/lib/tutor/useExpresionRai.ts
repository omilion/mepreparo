"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EstadoRai } from "./expresion";

// EL SECUENCIADOR DE REACCIONES DE RAI
//
// Hay dos capas en lo que expresa la esfera:
//
//   FLUJO BASE  → lo que Rai está HACIENDO ahora (pensando, hablando,
//                 escuchando). Lo deduce la conversación, no se agenda.
//   REACCIÓN    → lo que Rai SIENTE o RESPONDE en un momento puntual (asiente,
//                 celebra, anima, tiene una idea). Tiene principio y fin.
//
// La reacción manda mientras dura; al terminar, la esfera vuelve sola al flujo
// base. Este hook existe porque encadenar `setTimeout` sueltos se rompía: un
// temporizador viejo apagaba una emoción nueva (celebrar 2.6s y a mitad de
// camino recibir otra reacción dejaba a Rai en blanco). Aquí cada llamada
// CANCELA lo anterior, así la última emoción siempre gana.
//
// Uso: reaccionar(["si", 800], ["celebracion", 2600]) → asiente y luego celebra.

export type Paso = [EstadoRai, number];

export function useExpresionRai() {
  const [reaccion, setReaccion] = useState<EstadoRai | undefined>(undefined);
  const timers = useRef<number[]>([]);

  const cancelar = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  const reaccionar = useCallback(
    (...pasos: Paso[]) => {
      cancelar();
      if (pasos.length === 0) return;
      setReaccion(pasos[0][0]);
      let acumulado = 0;
      pasos.forEach(([, ms], i) => {
        acumulado += ms;
        const siguiente = pasos[i + 1]?.[0]; // el último deja undefined → flujo base
        timers.current.push(
          window.setTimeout(() => setReaccion(siguiente), acumulado)
        );
      });
    },
    [cancelar]
  );

  useEffect(() => cancelar, [cancelar]);

  return { reaccion, reaccionar };
}
