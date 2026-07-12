import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/db";
import * as schema from "./db/schema";

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
  },
  advanced: {
    // en http (staging por IP) las cookies no llevan Secure para poder probar
    // el login; con dominio+https esto es false y vuelven a ser seguras.
    useSecureCookies: !esHttp,
  },
});
