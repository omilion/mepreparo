"use client";

import { authClient } from "@/lib/auth-client";
import { Reveal } from "@/components/Reveal";

// A donde better-auth redirige tras confirmar el correo. NO asume que hay
// sesión: si un escáner de seguridad del correo (Gmail, Outlook) abrió el
// enlace antes que la persona, la cookie de sesión quedó en ESE cliente, no
// en el navegador real — el correo igual quedó confirmado en la base, solo
// que esta visita no tiene con qué loguear. Por eso el mensaje se decide acá
// mirando la sesión, en vez de mandar a "/" y dejar que el arranque decida
// (que en el caso sin sesión termina en /landing, sin explicar nada).
export default function VerificadoRuta() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <main className="zen-page flex min-h-screen flex-col items-center justify-center gap-[20px] pb-24 pt-10 text-center">
      {isPending ? (
        <p className="text-ink-soft animate-pulse">Confirmando...</p>
      ) : session ? (
        <>
          <Reveal variant="lead" delay={80}>
            <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
              Listo
            </div>
          </Reveal>
          <Reveal variant="lead" delay={120}>
            <h1 className="text-[26px]">Tu correo quedó confirmado</h1>
          </Reveal>
          <Reveal delay={300}>
            <p className="max-w-[42ch] text-[15px] leading-[1.4] text-ink-soft">
              Ya puedes recibir el resumen semanal, avisos de logro y de inactividad.
            </p>
          </Reveal>
          <Reveal delay={450}>
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              className="cta mt-2"
            >
              Continuar
            </button>
          </Reveal>
        </>
      ) : (
        <>
          <Reveal variant="lead" delay={80}>
            <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
              Correo confirmado
            </div>
          </Reveal>
          <Reveal variant="lead" delay={120}>
            <h1 className="text-[26px]">Ya puedes iniciar sesión</h1>
          </Reveal>
          <Reveal delay={300}>
            <p className="max-w-[42ch] text-[15px] leading-[1.4] text-ink-soft">
              Tu correo quedó confirmado. Por seguridad, entra con tu contraseña para continuar.
            </p>
          </Reveal>
          <Reveal delay={450}>
            <a href="/auth" className="cta mt-2 inline-block">
              Iniciar sesión
            </a>
          </Reveal>
        </>
      )}
    </main>
  );
}
