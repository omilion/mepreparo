// El cierre de la ceremonia de "preparando tus mundos": una frase honesta
// sobre la carga que el niño tiene por delante, según CUÁNTAS materias
// prepara. No la genera la IA — es fija a propósito: cuesta cero, no falla, y
// nunca va a salir con tono de presión de examen.
//
// Reemplaza al `objetivo` por materia que generaba /api/plan/generar, que se
// guardaba en el perfil y no lo leía ninguna pantalla ni ningún prompt.

export function mensajeDeMundos(cantidadMaterias: number): string {
  switch (Math.max(0, cantidadMaterias)) {
    case 0:
    case 1:
      return "Un solo mundo, toda tu atención en él.";
    case 2:
      return "Dos mundos. Alcanzas a darle tiempo de verdad a cada uno.";
    case 3:
      return "Tres mundos. Con tu horario, cada uno tiene su día.";
    case 4:
      return "Cuatro mundos. Vamos de a uno; nadie los recorre todos el mismo día.";
    default:
      return "Cinco mundos. Es harto, así que iremos con calma y sin apurar ninguno.";
  }
}
