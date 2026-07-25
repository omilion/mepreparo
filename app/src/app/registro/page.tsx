"use client";

import { useApp } from "@/lib/app/AppProvider";
import { Registro } from "@/components/Registro";
import { TopBar } from "@/components/TopBar";

export default function RegistroRuta() {
  const { alRegistrar } = useApp();

  return (
    <main className="min-h-screen">
      <TopBar mostrarHome={false} />
      <Registro onListo={alRegistrar} />
    </main>
  );
}
