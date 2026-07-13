"use client";

import { useApp } from "@/lib/app/AppProvider";

export default function Home() {
  const { cargando } = useApp();

  if (cargando) {
    return (
      <div className="mx-auto flex min-h-screen items-center justify-center bg-paper">
        <p className="text-ink-soft animate-pulse">Cargando...</p>
      </div>
    );
  }

  return null;
}
