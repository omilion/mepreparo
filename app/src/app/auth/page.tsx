"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/app/AppProvider";
import { AuthForm } from "@/components/AuthForm";

// El enlace de verificación de correo redirige acá con ?error=CODE cuando el
// token venció o ya se usó (better-auth solo manda el código, no un mensaje).
const MENSAJES_ERROR: Record<string, string> = {
  TOKEN_EXPIRED: "Ese enlace de confirmación ya venció. Inicia sesión y te mandamos uno nuevo.",
  INVALID_TOKEN: "Ese enlace de confirmación no es válido. Inicia sesión y te mandamos uno nuevo.",
};

function AuthContenido() {
  const { modoAuth } = useApp();
  const searchParams = useSearchParams();
  const codigoError = searchParams.get("error");

  return (
    <AuthForm
      modoInicial={modoAuth}
      errorInicial={codigoError ? MENSAJES_ERROR[codigoError] : undefined}
      onSuccess={() => {
        // Tras login/registro, la sesión ya está activa pero el arranque de
        // AppProvider no vuelve a rutear (ya corrió). Navegamos a "/" con carga
        // completa para que el arranque corra de nuevo, sincronice la cuenta y
        // rutee a /panel o /registro. Antes esto solo hacía console.log → la
        // pantalla quedaba en blanco hasta recargar a mano.
        window.location.href = "/panel";
      }}
    />
  );
}

export default function AuthRuta() {
  // useSearchParams exige un boundary de Suspense o el build de producción
  // falla al pre-renderizar esta página (bail-out a client-only sin esto).
  return (
    <main className="min-h-screen">
      <Suspense fallback={null}>
        <AuthContenido />
      </Suspense>
    </main>
  );
}
