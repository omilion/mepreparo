"use client";

import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { Landing } from "@/components/Landing";

export default function LandingRuta() {
  const { setModoAuth } = useApp();
  const router = useRouter();

  return (
    <main className="min-h-screen">
      {/* barra mínima de la landing: marca + acceso a login */}
      <div className="mx-auto flex h-[58px] max-w-zen items-center justify-between px-[22px]">
        <span className="font-serif text-[19px]">mepreparo</span>
        <button
          type="button"
          onClick={() => {
            setModoAuth("login");
            router.push("/auth");
          }}
          className="text-[13.5px] text-sage-deep hover:opacity-80"
        >
          Ingresar
        </button>
      </div>
      <Landing
        onComenzar={() => {
          setModoAuth("registro");
          router.push("/auth");
        }}
        onProbar={() => router.push("/demo")}
      />
    </main>
  );
}
