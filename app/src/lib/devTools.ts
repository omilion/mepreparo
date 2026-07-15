// ¿Deben mostrarse las herramientas de desarrollo (panel dev, botones de sopa/
// ejercicio on-demand)? True en desarrollo local SIEMPRE, y en producción SOLO
// si se prende la bandera NEXT_PUBLIC_DEV_TOOLS=1 (útil para probar en el VPS de
// staging sin tener que conversar con Rai hasta que lance la actividad).
//
// ⚠️ Al lanzar de verdad (usuarios reales), poner NEXT_PUBLIC_DEV_TOOLS=0 (o
// quitarla) para que estos controles no queden expuestos a los niños.
export function devToolsActivas(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEV_TOOLS === "1"
  );
}
