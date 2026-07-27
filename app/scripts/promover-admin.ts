// Otorga (o quita) el rol de admin a una cuenta YA registrada.
//
// El rol no se puede pedir al registrarse: better-auth lo declara con
// input:false, así que la única forma de tenerlo es esta — a mano, con acceso
// al servidor y a la base. Es a propósito: un admin ve datos de familias.
//
// Uso, dentro del contenedor de la app (o en local con DATABASE_URL apuntando
// a la base correcta):
//   npx tsx scripts/promover-admin.ts correo@ejemplo.cl
//   npx tsx scripts/promover-admin.ts correo@ejemplo.cl --quitar
//
// La cuenta debe existir: primero regístrate por la app como cualquiera, y
// después te promueves.

import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/db";
import { user } from "../src/lib/db/schema";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const quitar = process.argv.includes("--quitar");

  if (!email || !email.includes("@")) {
    console.error("Falta el correo. Ej: npx tsx scripts/promover-admin.ts tu@correo.cl");
    process.exit(1);
  }

  const filas = await db
    .select({ id: user.id, email: user.email, rol: user.rol })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  const cuenta = filas[0];
  if (!cuenta) {
    console.error(
      `No existe ninguna cuenta con ${email}. Regístrate primero en la app y vuelve a correr esto.`
    );
    process.exit(1);
  }

  const nuevoRol = quitar ? "apoderado" : "admin";
  if (cuenta.rol === nuevoRol) {
    console.log(`${email} ya es ${nuevoRol}. Nada que hacer.`);
    process.exit(0);
  }

  await db.update(user).set({ rol: nuevoRol }).where(eq(user.id, cuenta.id));
  console.log(`${email}: ${cuenta.rol} → ${nuevoRol}`);
  console.log("Debe cerrar sesión y volver a entrar para que le tome el cambio.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Falló:", e);
  process.exit(1);
});
