"use client";

import { AppProvider, useApp } from "@/lib/app/AppProvider";
import { PinScreen } from "@/components/PinScreen";
import { DevPanel } from "@/components/DevPanel";
import { devToolsActivas } from "@/lib/devTools";
import { useRouter } from "next/navigation";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    sesionAlumno,
    pinBloqueado,
    setPinBloqueado,
    alSalirModoAlumno,
    cuenta,
    setEnfocado,
    cargarPrueba,
    limpiarTodo,
  } = useApp();

  if (sesionAlumno && pinBloqueado) {
    return (
      <PinScreen
        nombre={sesionAlumno.nombre}
        token={sesionAlumno.token}
        onUnlock={() => setPinBloqueado(false)}
        onSalir={alSalirModoAlumno}
      />
    );
  }

  return (
    <>
      {children}
      {devToolsActivas() && (
        <DevPanel
          cuenta={cuenta}
          onCargarPrueba={cargarPrueba}
          onLimpiar={limpiarTodo}
          onSaltar={(idx, etapa) => {
            setEnfocado(idx);
            router.push("/" + etapa);
          }}
        />
      )}
    </>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <LayoutContent>{children}</LayoutContent>
    </AppProvider>
  );
}
