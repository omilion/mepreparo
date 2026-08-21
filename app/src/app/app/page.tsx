"use client";

import { useApp } from "@/lib/app/AppProvider";

// Entrada privada de la aplicacion. AppProvider recupera sesion, cuenta y
// progreso, y decide si corresponde ir a registro, panel o recorrido del nino.
// La portada publica vive en "/" y nunca realiza esta redireccion automatica.
export default function EntradaAplicacion() {
  const { cargando } = useApp();

  if (cargando) {
    return (
      <div className="mx-auto flex min-h-screen items-center justify-center bg-paper">
        <p className="animate-pulse text-ink-soft">Cargando...</p>
      </div>
    );
  }

  return null;
}
