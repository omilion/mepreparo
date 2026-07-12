import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/db";
import * as schema from "./db/schema";

// URL pública de la app (en producción: https://tu-dominio). En dev cae a :3008.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";

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
});
