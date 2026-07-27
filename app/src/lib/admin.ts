// LA PUERTA DEL ADMIN
//
// Un admin ve datos de familias y de niños que no son suyos. Por eso la
// autorización se decide en UN solo lugar, en el servidor, y siempre releyendo
// el rol desde la base de datos.
//
// Por qué no confiar en el rol que viene en la sesión: better-auth lo incluye
// para que el cliente sepa a qué pantalla ir, pero es un dato que se emitió
// cuando se inició sesión. Si mañana le quitamos el rol a alguien, su sesión
// vieja seguiría diciendo "admin" hasta que expire. Releer la fila cuesta una
// consulta por id (clave primaria) y elimina esa ventana.

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db/db";
import { user } from "./db/schema";

export interface Admin {
  id: string;
  nombre: string;
  email: string;
}

// Devuelve el admin de la sesión actual, o null si no hay o no lo es.
// No redirige ni lanza: quien llama decide qué hacer (normalmente, hacer como
// si la página no existiera).
export async function adminActual(): Promise<Admin | null> {
  try {
    const sesion = await auth.api.getSession({ headers: await headers() });
    if (!sesion) return null;

    const filas = await db
      .select({ id: user.id, nombre: user.name, email: user.email, rol: user.rol })
      .from(user)
      .where(eq(user.id, sesion.user.id))
      .limit(1);

    const fila = filas[0];
    if (!fila || fila.rol !== "admin") return null;
    return { id: fila.id, nombre: fila.nombre, email: fila.email };
  } catch {
    // Ante cualquier duda (base caída, sesión rara), NO es admin.
    return null;
  }
}
