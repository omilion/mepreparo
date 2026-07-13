"use client";

import { useApp } from "@/lib/app/AppProvider";
import { useRouter } from "next/navigation";
import { Demo } from "@/components/Demo";

export default function DemoRuta() {
  const { setModoAuth } = useApp();
  const router = useRouter();

  return (
    <main className="min-h-screen">
      <Demo
        onSalir={() => router.push("/landing")}
        onRegistrarse={() => {
          setModoAuth("registro");
          router.push("/auth");
        }}
      />
    </main>
  );
}
