"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Fireworks } from "./Fireworks";
import { tocarLira } from "@/lib/audio/liraUI";
import { IconoZen } from "./IconoZen";
import { ICONOS_VALIDOS } from "@/lib/tutor/iconos";

export interface DatosSecuencia {
  enunciado: string; // consigna (ej: "Ciclo de vida de la mariposa")
  pasosCorrectos: string[]; // orden correcto: ["Huevo", "Oruga", "Crisálida", "Mariposa"]
  pasosBarajados: string[]; // desordenado
}

// 1. Componente de Tarjeta Arrastrable
function TarjetaPaso({ texto, id, index }: { texto: string; id: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
  });

  const tieneIcono = ICONOS_VALIDOS.includes(texto.trim().toLowerCase());

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`touch-none flex flex-col items-center justify-center gap-1 border-2 border-dashed border-hair bg-surface rounded-xl p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md select-none min-w-[90px] min-h-[90px] max-w-[120px] flex-1 ${
        isDragging ? "opacity-40 border-gold" : ""
      }`}
    >
      {tieneIcono ? (
        <>
          <IconoZen nombre={texto} size={32} className="text-ink" />
          <span className="text-[12px] font-[600] capitalize text-ink-soft">{texto}</span>
        </>
      ) : (
        <span className="text-[14px] font-[600] text-ink">{texto}</span>
      )}
    </div>
  );
}

// 2. Componente de Casilla/Slot Destino
function CasillaDestino({
  id,
  numero,
  contenido,
  onClear,
}: {
  id: string;
  numero: number;
  contenido: string | null;
  onClear: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  const tieneIcono = contenido ? ICONOS_VALIDOS.includes(contenido.trim().toLowerCase()) : false;

  return (
    <div
      ref={setNodeRef}
      className={`relative flex flex-col items-center justify-center border-2 rounded-xl w-[90px] h-[95px] transition-all ${
        isOver
          ? "border-gold bg-gold-soft/30 scale-105"
          : contenido
            ? "border-sage bg-sage-soft/10"
            : "border-hair bg-surface-dark/20 border-dotted"
      }`}
    >
      {/* Indicador del número de paso */}
      <span className="absolute top-1 left-1.5 text-[11px] font-bold text-ink-soft/60">
        {numero}°
      </span>

      {contenido ? (
        <div
          onClick={onClear}
          title="Toca para quitar de este paso"
          className="flex flex-col items-center justify-center gap-0.5 cursor-pointer w-full h-full p-2"
        >
          {tieneIcono ? (
            <>
              <IconoZen nombre={contenido} size={28} className="text-sage-deep" />
              <span className="text-[11px] font-[600] capitalize text-sage-deep truncate max-w-full">
                {contenido}
              </span>
            </>
          ) : (
            <span className="text-[13px] font-[600] text-sage-deep text-center px-1 break-words leading-tight">
              {contenido}
            </span>
          )}
        </div>
      ) : (
        <span className="text-[11px] font-medium text-ink-soft/40">Arrastra aquí</span>
      )}
    </div>
  );
}

export function Secuencia({
  datos,
  onCompleta,
}: {
  datos: DatosSecuencia;
  onCompleta?: () => void;
}) {
  const n = datos.pasosCorrectos.length;

  // Estado del tablero: mapeo de slots a textos de pasos (ej: { 0: "Oruga", 1: null... })
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(n).fill(null));
  // Pasos disponibles en el pool inferior
  const [pool, setPool] = useState<string[]>(() => [...datos.pasosBarajados]);

  const [resuelto, setResuelto] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState(false);

  // Sensores de arrastre DND con tolerancia para clics comunes
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  // Si cambian los datos, reiniciamos el estado
  useEffect(() => {
    setSlots(Array(n).fill(null));
    setPool([...datos.pasosBarajados]);
    setResuelto(false);
    setErrorFeedback(false);
  }, [datos, n]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const dragId = String(active.id); // ej: "card-Oruga"
    const dropId = String(over.id);   // ej: "slot-1"

    const pasoTexto = dragId.replace("card-", "");
    const slotIndex = parseInt(dropId.replace("slot-", ""), 10);

    if (isNaN(slotIndex)) return;

    tocarLira(slotIndex);

    // 1. Quitar el paso del pool
    const nuevoPool = pool.filter((p) => p !== pasoTexto);

    // 2. Si el slot destino ya tenía una tarjeta, la devolvemos al pool
    const valorPrevio = slots[slotIndex];
    if (valorPrevio) {
      nuevoPool.push(valorPrevio);
    }

    // 3. Si la tarjeta ya estaba en OTRO slot, liberamos ese slot anterior
    const nuevosSlots = slots.map((s) => (s === pasoTexto ? null : s));
    nuevosSlots[slotIndex] = pasoTexto;

    setPool(nuevoPool);
    setSlots(nuevosSlots);
    setErrorFeedback(false);
  }

  // Quita una tarjeta de una casilla y la devuelve al pool
  function quitarPaso(index: number) {
    if (resuelto) return;
    const valor = slots[index];
    if (!valor) return;

    const nuevosSlots = [...slots];
    nuevosSlots[index] = null;

    setSlots(nuevosSlots);
    setPool((p) => [...p, valor]);
    setErrorFeedback(false);
    tocarLira(index);
  }

  function verificar() {
    const todoLleno = slots.every((s) => s !== null);
    if (!todoLleno) return;

    // Comparar uno a uno con el orden correcto
    const correcto = slots.every((s, i) => s === datos.pasosCorrectos[i]);

    if (correcto) {
      setResuelto(true);
      tocarLira(8); // nota alta de éxito
      onCompleta?.();
    } else {
      setErrorFeedback(true);
      tocarLira(0); // nota grave de error
      // Breve feedback visual de vibración, luego reiniciamos feedback
      setTimeout(() => setErrorFeedback(false), 800);
    }
  }

  const todoLleno = slots.every((s) => s !== null);

  return (
    <div className="relative flex flex-col items-center gap-5 text-center">
      {resuelto && <Fireworks />}

      <p className="font-serif text-[18px] leading-[1.3] text-ink px-2">
        {datos.enunciado}
      </p>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        {/* Contenedor de Casillas (Timeline) */}
        <div
          className={`flex flex-wrap justify-center gap-2.5 p-3 rounded-2xl bg-surface-dark/10 border-2 border-hair transition-all duration-300 ${
            errorFeedback ? "animate-[bounce_0.2s_ease-in-out_3] border-clay/40 bg-clay-soft/5" : ""
          }`}
        >
          {slots.map((s, i) => (
            <CasillaDestino
              key={i}
              id={`slot-${i}`}
              numero={i + 1}
              contenido={s}
              onClear={() => quitarPaso(i)}
            />
          ))}
        </div>

        {/* Piscina de Tarjetas Disponibles */}
        {!resuelto && pool.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 p-2 bg-surface rounded-xl border border-hair max-w-full min-h-[110px] items-center">
            {pool.map((txt, idx) => (
              <TarjetaPaso key={txt} id={`card-${txt}`} texto={txt} index={idx} />
            ))}
          </div>
        )}
      </DndContext>

      {/* Botón de Validación */}
      {!resuelto && todoLleno && (
        <button
          onClick={verificar}
          className="rounded-full bg-gold hover:bg-gold-deep text-ink-dark font-semibold px-6 py-2 text-[14px] transition-all hover:scale-105 shadow-sm active:scale-95"
        >
          Verificar secuencia
        </button>
      )}

      {/* Retroalimentación final */}
      {resuelto && (
        <span className="text-[16px] font-[600] text-gold animate-bounce">
          ¡Perfecto! Ciclo ordenado.
        </span>
      )}
    </div>
  );
}
