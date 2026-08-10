import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/db";
import * as schema from "./db/schema";
import { enviarEmail, plantillaZen } from "./email";

// URL pública de la app (en producción: https://tu-dominio). En dev cae a :3008.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
// ¿Estamos sirviendo sobre HTTP (deploy de prueba por IP, sin dominio)? Entonces
// las cookies no pueden ser "Secure" o el navegador las descarta y el login no
// persiste. Detectamos por la URL. SOLO para staging: en producción real la URL
// es https y las cookies vuelven a ser Secure automáticamente.
const esHttp = APP_URL.startsWith("http://");

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  // Secreto de firma de sesiones: OBLIGATORIO en producción (si falta, better-auth
  // usa uno inseguro/efímero y las sesiones se invalidan al reiniciar).
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || APP_URL,
  // El dominio de producción debe estar permitido para las cookies/CSRF.
  trustedOrigins: [APP_URL],
  emailAndPassword: {
    enabled: true,
    // El enlace vence en 1 hora; better-auth ya invalida el token al usarlo.
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      // better-auth arma `url` apuntando a su propio endpoint de verificación,
      // que redirige a /auth/nueva-clave?token=... si el token es válido.
      const html = plantillaZen({
        titulo: `Hola, ${user.name || "apoderado"}`,
        cuerpoHtml:
          "<p>Pediste restablecer tu contraseña de mepreparo.</p>" +
          "<p>Este enlace es válido por 1 hora. Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.</p>",
        cta: { texto: "Elegir nueva contraseña", url },
      });
      await enviarEmail({
        para: user.email,
        asunto: "Restablece tu contraseña — mepreparo",
        html,
      });
    },
    // Sin correo verificado no hay lista de contactos válida para avisos de
    // progreso/logros — y sin eso, el resumen semanal (ya implementado en
    // /api/cron/alertas) le llega a nadie o a una dirección mal escrita.
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    // Al hacer clic en el enlace queda con sesión iniciada de una: sin esto,
    // tendría que volver a /auth y loguearse a mano después de verificar.
    autoSignInAfterVerification: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) => {
      const html = plantillaZen({
        titulo: `Hola, ${user.name || "apoderado"}`,
        cuerpoHtml:
          "<p>Confirma tu correo para activar los avisos de progreso de tus hijos (resumen semanal, logros, alertas de inactividad) y para poder recuperar tu cuenta si alguna vez olvidas la contraseña.</p>" +
          "<p>Este enlace es válido por 1 hora.</p>",
        cta: { texto: "Confirmar mi correo", url },
      });
      await enviarEmail({
        para: user.email,
        asunto: "Confirma tu correo — mepreparo",
        html,
      });
    },
  },
  user: {
    additionalFields: {
      // El rol viaja en la sesión SOLO para decidir a qué pantalla mandar a
      // quien entra. La autorización de verdad NO se apoya en esto: cada
      // pantalla de admin lo vuelve a verificar contra la base (ver lib/admin).
      // input:false es la parte importante: impide que alguien se registre
      // mandando {"rol":"admin"} en el cuerpo del signup.
      rol: {
        type: "string",
        defaultValue: "apoderado",
        input: false,
      },
    },
  },
  advanced: {
    // en http (staging por IP) las cookies no llevan Secure para poder probar
    // el login; con dominio+https esto es false y vuelven a ser seguras.
    useSecureCookies: !esHttp,
  },
});
