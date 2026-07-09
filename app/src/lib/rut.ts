// Validación y formato de RUT chileno. Verifica el dígito verificador real
// (módulo 11), no solo el formato. Fuente única para registro y "Mi cuenta".

// Limpia a solo dígitos + K: "12.345.678-5" -> "123456785"
function limpiar(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "").toUpperCase();
}

// Calcula el dígito verificador de un cuerpo numérico (sin DV).
function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

// ¿Es un RUT válido (con DV correcto)?
export function rutEsValido(rut: string): boolean {
  const limpio = limpiar(rut);
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  return digitoVerificador(cuerpo) === dv;
}

// Formatea a "12.345.678-5" (para mostrar y guardar canónico).
export function formatearRut(rut: string): string {
  const limpio = limpiar(rut);
  if (limpio.length < 2) return rut;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${conPuntos}-${dv}`;
}
