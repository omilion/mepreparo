// ¿Puede el ARRANQUE de la app rutear esta pantalla, o debe dejarla en paz?
//
// El arranque (ver AppProvider) decide a dónde mandar a alguien según su
// sesión. Eso está bien para el flujo del niño, pero hay pantallas que existen
// justamente para quien todavía NO tiene sesión, y a varias se llega desde un
// enlace EXTERNO: un correo, un resultado de Google, el pie de página.
//
// Vive aparte de AppProvider para poder testearlo: el bug que motivó esto
// (todas estas rutas rebotaban al landing al abrirlas en frío) era invisible
// navegando dentro de la app, porque el efecto de arranque solo corre una vez.

// Rutas exactas que el arranque no debe tocar.
// - /rai, /admin: herramientas internas que se abren escribiendo la URL.
// - /suscripcion: es a donde el arranque manda si el acceso está bloqueado;
//   volver a rutearla desde ahí formaría un loop.
// - /alumno/login: valida el token del QR y avisa por su cuenta
//   (entrarComoAlumno). Si el arranque la ruteara, la mandaría a /landing en
//   mitad de la validación y de paso quemaría `arranqueHecho`.
const RUTAS_EXACTAS = ["/rai", "/admin", "/suscripcion", "/alumno/login"];

// Secciones públicas completas (la ruta y todo lo que cuelga de ella).
// - /blog: todo el contenido que se indexa en buscadores. Si rebota, quien
//   llega desde Google nunca ve el artículo que buscaba.
// - /demo: el CTA "prueba una clase con Rai" de la propia landing.
// - /terminos, /privacidad: los enlaces legales que el registro obliga a
//   aceptar. Nadie debería aceptar algo que no puede abrir.
// - /auth: incluye /auth/nueva-clave, que es el enlace del correo de
//   "restablece tu contraseña". Rebotándolo, quien olvidaba su clave no podía
//   recuperarla NUNCA. También /auth/verificado, el enlace de confirmar correo.
const PREFIJOS_PUBLICOS = ["/blog", "/demo", "/terminos", "/privacidad", "/auth"];

export function esRutaLibre(pathname: string): boolean {
  if (RUTAS_EXACTAS.includes(pathname)) return true;
  return PREFIJOS_PUBLICOS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
