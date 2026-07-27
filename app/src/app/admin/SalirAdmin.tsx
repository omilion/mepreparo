"use client";

import { authClient } from "@/lib/auth-client";

// Cerrar sesión del admin. Va a la landing, no al panel de apoderado: son dos
// mundos distintos aunque compartan el sistema de login.
export function SalirAdmin() {
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        window.location.href = "/landing";
      }}
      className="flex-none text-[13px] text-sage-deep underline underline-offset-4 hover:opacity-80"
    >
      Cerrar sesión
    </button>
  );
}
