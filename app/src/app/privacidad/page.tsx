import Link from "next/link";

// Página estática (server component): no necesita sesión ni JS del cliente.
// Enlazada desde el checkbox de registro y desde Mi Cuenta. Versión debe
// coincidir con CONSENTIMIENTO_VERSION en AuthForm.tsx si el contenido cambia.
export const metadata = {
  title: "Política de Privacidad — mepreparo",
};

export default function PrivacidadPage() {
  return (
    <div className="zen-page flex flex-col gap-8 pb-24 pt-10">
      <header>
        <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
          Legal
        </div>
        <h1 className="text-[28px]">Política de Privacidad</h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          Versión 2026-07-v1 · Última actualización: julio de 2026
        </p>
      </header>

      <div className="flex flex-col gap-6 text-[15px] leading-[1.6] text-ink">
        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">Quiénes somos</h2>
          <p>
            mepreparo es una aplicación de apoyo al estudio para niños que
            preparan exámenes libres de educación básica en Chile. La cuenta
            la crea y administra el apoderado; el niño usa la app dentro de esa
            cuenta, sin crear una cuenta propia.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">
            Qué datos guardamos
          </h2>
          <ul className="flex flex-col gap-1.5 pl-5 list-disc">
            <li>
              <strong>Del apoderado:</strong> nombre, correo, teléfono, RUT,
              comuna y región (para verificar que es un adulto responsable del
              menor).
            </li>
            <li>
              <strong>Del niño:</strong> nombre, curso, materias y fecha del
              examen que prepara, sus respuestas a diagnósticos y ejercicios,
              el resumen de cada sesión de estudio, y observaciones breves que
              el tutor Rai registra sobre su avance (por ejemplo, qué tema le
              costó o qué le gusta).
            </li>
            <li>
              <strong>Frases del niño:</strong> cuando resulta pedagógicamente
              útil, guardamos frases textuales cortas que el niño le dice a
              Rai sobre el estudio (qué le gusta, qué le cuesta, cómo se
              siente). Nunca guardamos datos de salud, familia o ubicación
              precisa que el niño mencione — el tutor tiene instrucción
              explícita de no registrarlos.
            </li>
            <li>
              <strong>Técnicos:</strong> registros de errores y uso (sin
              contenido de las conversaciones) para poder corregir fallas.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">
            Para qué los usamos
          </h2>
          <p>
            Exclusivamente para operar el servicio: generar el plan de
            estudio, adaptar las explicaciones del tutor, mostrarle al
            apoderado el progreso de su hijo, y mejorar la calidad pedagógica
            de la app. No vendemos datos a terceros ni los usamos para
            publicidad dirigida a menores.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">
            Con quién los compartimos
          </h2>
          <p>
            Usamos proveedores externos únicamente como infraestructura
            técnica (por ejemplo, el modelo de lenguaje que responde las
            preguntas del niño, y el servidor donde vive la aplicación).
            Estos proveedores procesan la información bajo contrato y no la
            usan para entrenar sus propios modelos con nuestros datos ni la
            revenden.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">
            Cuánto tiempo los guardamos
          </h2>
          <p>
            Mientras la cuenta esté activa. Si el apoderado elimina su cuenta
            desde Mi Cuenta, se borra de inmediato y de forma permanente toda
            la información asociada: su perfil, el de sus hijos, el historial
            de sesiones y los registros técnicos.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">
            Tus derechos (Ley 21.719 de Chile)
          </h2>
          <p>
            Como titular de los datos (el apoderado, en representación del
            menor), puedes en cualquier momento:
          </p>
          <ul className="flex flex-col gap-1.5 pl-5 list-disc">
            <li>
              <strong>Acceder</strong> a los datos guardados: descárgalos
              desde Mi Cuenta → &quot;Exportar mis datos&quot;.
            </li>
            <li>
              <strong>Rectificar</strong> datos incorrectos: edítalos desde
              Mi Cuenta o el perfil del niño.
            </li>
            <li>
              <strong>Cancelar/eliminar</strong> tu cuenta y toda la
              información asociada desde Mi Cuenta → &quot;Eliminar mi
              cuenta&quot;.
            </li>
            <li>
              <strong>Oponerte</strong> al tratamiento escribiéndonos al
              correo de contacto.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-serif text-[19px] text-ink">Contacto</h2>
          <p>
            Para cualquier consulta sobre tus datos o los de tu hijo, escribe
            a{" "}
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
