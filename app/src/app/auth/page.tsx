"use client";

import { useApp } from "@/lib/app/AppProvider";
import { AuthForm } from "@/components/AuthForm";

export default function AuthRuta() {
  const { modoAuth } = useApp();

  return (
    <main className="min-h-screen">
      <AuthForm
        modoInicial={modoAuth}
        onSuccess={() => {
          // Tras login/registro, la sesión ya está activa pero el arranque de
          // AppProvider no vuelve a rutear (ya corrió). Navegamos a "/" con carga
          // completa para que el arranque corra de nuevo, sincronice la cuenta y
          // rutee a /panel o /registro. Antes esto solo hacía console.log → la
          // pantalla quedaba en blanco hasta recargar a mano.
          window.location.href = "/";
        }}
      />
    </main>
  );
}
