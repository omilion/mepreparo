"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Fireworks } from "./Fireworks";
import { tocarLira } from "@/lib/audio/liraUI";
import { IconoZen } from "./IconoZen";
import { tieneIcono } from "@/lib/tutor/iconos";

// "El Clasificador": arrastrar cada tarjeta a su grupo (2 o 3 zonas). Con iconos
// se ve genial ("arrastra cada animal a su grupo"). Usa @dnd-kit (headless) con
// sensor táctil configurado (delay 250ms/tolerancia 10) para que el arrastre no
// choque con el scroll de la tablet.

export interface ItemClasificador {
  texto: string; // etiqueta o nombre de icono
  grupo: string; // a qué grupo pertenece (debe coincidir con uno de "grupos")
}

export interface DatosClasificador {
  enunciado: string;
  grupos: string[]; // 2 o 3 nombres de zona
  items: ItemClasificador[];
}

// contenido de una tarjeta: icono si el texto matchea, si no el texto
function Contenido({ texto, size = 30 }: { texto: string; size?: number }) {
  if (tieneIcono(texto)) {
    return (
      <span className="flex flex-col items-center gap-1">
        <IconoZen nombre={texto} size={size} />
        <span className="text-[11px] font-normal capitalize">{texto}</span>
      </span>
    );
  }
  return <span>{texto}</span>;
}

// Ficha arrastrable
function Ficha({ id, texto }: { id: string; texto: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: "none", opacity: isDragging ? 0.3 : 1 }}
      className="rounded-xl border-2 border-hair bg-surface/70 px-4 py-3 text-[15px] font-[600] text-ink transition-colors"
    >
      <Contenido texto={texto} />
    </button>
  );
}

// Zona donde soltar
function Zona({
  id,
  nombre,
  items,
  resuelto,
}: {
  id: string;
  nombre: string;
  items: { id: string; texto: string; ok: boolean }[];
  resuelto: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={
        "flex min-h-[110px] flex-1 flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-3 transition-colors " +
        (isOver ? "border-gold bg-gold-soft/40" : "border-hair bg-surface/30")
      }
    >
      <span className="text-[13px] font-[600] uppercase tracking-wide text-ink-soft">
        {nombre}
      </span>
      <div className="flex flex-wrap justify-center gap-1.5">
        {items.map((it) => (
          <span
            key={it.id}
            className={
              "rounded-lg border px-2.5 py-1.5 text-[13px] font-[600] " +
              (resuelto
                ? it.ok
                  ? "border-sage bg-sage/10 text-ink"
                  : "border-clay/50 text-clay"
                : "border-gold/50 bg-gold-soft/40 text-gold")
            }
          >
            <Contenido texto={it.texto} size={22} />
          </span>
        ))}
      </div>
    </div>
  );
}

export function Clasificador({
  datos,
  onResponder,
}: {
  datos: DatosClasificador;
  onResponder?: (acerto: boolean) => void;
}) {
  // id estable por item (índice), con su texto y grupo correcto
  const fichas = useMemo(
    () => datos.items.map((it, i) => ({ id: `f${i}`, texto: it.texto, grupo: it.grupo })),
    [datos.items]
  );
  const grupoDe = useMemo(() => {
    const m: Record<string, string> = {};
    for (const f of fichas) m[f.id] = f.grupo;
    return m;
  }, [fichas]);

  // ubicación actual de cada ficha: null = aún en el centro, o el nombre de grupo
  const [ubicacion, setUbicacion] = useState<Record<string, string | null>>(
    () => Object.fromEntries(fichas.map((f) => [f.id, null]))
  );
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [resuelto, setResuelto] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 10 } })
  );

  const pendientes = fichas.filter((f) => ubicacion[f.id] === null);

  function alSoltar(e: DragEndEvent) {
    setArrastrando(null);
    const fichaId = String(e.active.id);
    const zona = e.over ? String(e.over.id) : null;
    if (!zona || !datos.grupos.includes(zona)) return; // soltó fuera
    tocarLira();
    const nueva = { ...ubicacion, [fichaId]: zona };
    setUbicacion(nueva);
    // ¿terminó? (ninguna ficha en el centro)
    if (fichas.every((f) => nueva[f.id] !== null)) {
      const acerto = fichas.every((f) => nueva[f.id] === grupoDe[f.id]);
      setResuelto(true);
      onResponder?.(acerto);
    }
  }

  const acertoTodo =
    resuelto && fichas.every((f) => ubicacion[f.id] === grupoDe[f.id]);

  const fichaArrastrada = fichas.find((f) => f.id === arrastrando);

  return (
    <div className="relative flex flex-col items-center gap-4 text-center">
      {acertoTodo && <Fireworks />}

      <p className="font-serif text-[18px] leading-[1.3] text-ink">
        {datos.enunciado}
      </p>

      <DndContext
        sensors={sensors}
        onDragStart={(e: DragStartEvent) => setArrastrando(String(e.active.id))}
        onDragEnd={alSoltar}
        onDragCancel={() => setArrastrando(null)}
      >
        {/* FICHAS PENDIENTES (centro) */}
        <div className="flex min-h-[60px] flex-wrap justify-center gap-2">
          {pendientes.map((f) => (
            <Ficha key={f.id} id={f.id} texto={f.texto} />
          ))}
        </div>

        {/* ZONAS */}
        <div className="mt-3 flex w-full gap-3">
          {datos.grupos.map((g) => {
            const dentro = fichas
              .filter((f) => ubicacion[f.id] === g)
              .map((f) => ({ id: f.id, texto: f.texto, ok: grupoDe[f.id] === g }));
            return (
              <Zona key={g} id={g} nombre={g} items={dentro} resuelto={resuelto} />
            );
          })}
        </div>

        {/* preview de la ficha mientras se arrastra */}
        <DragOverlay>
          {fichaArrastrada ? (
            <div className="rounded-xl border-2 border-gold bg-gold-soft px-4 py-3 text-[15px] font-[600] text-gold shadow-lg">
              <Contenido texto={fichaArrastrada.texto} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {resuelto && (
        <p
          className={
            "relative text-[16px] font-[600] " +
            (acertoTodo ? "text-gold" : "text-clay")
          }
        >
          {acertoTodo ? "¡Todo en su lugar!" : "Algunas quedaron mal. ¡Casi!"}
        </p>
      )}
    </div>
  );
}
