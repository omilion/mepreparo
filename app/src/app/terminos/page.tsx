import Link from "next/link";

// Página estática (server component). Versión debe coincidir con
// CONSENTIMIENTO_VERSION en AuthForm.tsx si el contenido cambia.
export const metadata = {
  title: "Términos de Uso — mepreparo",
};

export default function TerminosPage() {
  return (
    <div className="zen-page flex flex-col gap-8 pb-24 pt-10">
      <header>
        <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
          Legal
        </div>
        <h1 className="text-[28px]">Términos de Uso</h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          Versión 2026-07-v1 · Última actualización: julio de 2026
        </p>
      </header>

      <div className="flex flex-col gap-6 text-[15px] leading-[1.6] text-ink">
        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">Qué es mepreparo</h2>
          <p>
            mepreparo es una herramienta de apoyo al estudio con un tutor de
            inteligencia artificial (Rai) para niños que preparan exámenes
            libres de educación básica en Chile. No reemplaza la matrícula
            formal ni garantiza la aprobación del examen: es un apoyo
            pedagógico basado en el currículum oficial.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">
            Quién puede usar la app
          </h2>
          <p>
            La cuenta la crea y administra un adulto responsable del menor
            (madre, padre o tutor legal), quien declara serlo al registrarse.
            El niño usa la app dentro del acceso que su apoderado le habilita
            (código QR y, opcionalmente, un PIN), sin crear una cuenta propia
            ni entregar sus propios datos de contacto.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">
            El tutor Rai (inteligencia artificial)
          </h2>
          <p>
            Rai genera sus respuestas con un modelo de lenguaje a partir del
            currículum oficial que le entregamos. Aunque está diseñado para
            explicar con cuidado y no inventar información fuera de ese
            contexto, puede cometer errores. Recomendamos que un adulto
            supervise el proceso de estudio y revise el progreso desde el
            panel del apoderado.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">
            Uso responsable
          </h2>
          <p>
            El apoderado se compromete a usar la app con fines de estudio, a
            no compartir su acceso con personas ajenas a la familia, y a
            supervisar el uso que hace el menor de la plataforma.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">
            Disponibilidad y cambios
          </h2>
          <p>
            mepreparo está en desarrollo activo. El servicio puede tener
            interrupciones y sus funciones pueden cambiar. Avisaremos con
            razonable anticipación cualquier cambio que afecte el
            almacenamiento o uso de los datos del menor.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">
            Tratamiento de datos
          </h2>
          <p>
            El detalle de qué datos guardamos y por qué está en la{" "}
            <Link
              href="/privacidad"
              className="text-sage-deep underline underline-offset-2"
            >
              Política de Privacidad
            </Link>
            , que forma parte de estos términos.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">Contacto</h2>
          <p>
            Consultas sobre estos términos:{" "}
            <a
              href="mailto:contacto@mepreparo.cl"
              className="text-sage-deep underline underline-offset-2"
            >
              contacto@mepreparo.cl
            </a>
            .
          </p>
        </section>
      </div>

      <Link
        href="/"
        className="mt-4 text-[13.5px] text-sage-deep underline underline-offset-4 hover:opacity-85"
      >
        ← Volver al inicio
      </Link>
    </div>
  );
}
