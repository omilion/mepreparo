"use client";

import { useApp } from "@/lib/app/AppProvider";
import { AuthForm } from "@/components/AuthForm";

export default function AuthRuta() {
  const { modoAuth } = useApp();

  return (
    <main className="min-h-screen">
      <AuthForm
        modoInicial={modoAuth}
        onSuccess={(nombre, email) => {
          console.log("Autenticación exitosa:", nombre, email);
        }}
      />
    </main>
  );
}
