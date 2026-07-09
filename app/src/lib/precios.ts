// Modelo de precios de mepreparo (fuente única de verdad).
// La landing, "Mi cuenta" y la futura pasarela de pago calculan aquí, para que
// el número que ve el padre sea siempre el mismo.

export const PRECIO_BASE_MENSUAL = 9990; // CLP por estudiante / mes

// Descuento familiar ESCALONADO por posición del estudiante (1° = 0%).
// Premia progresivamente a familias más grandes, con tope de 20%.
export function descuentoFamiliarPorPosicion(posicion: number): number {
  if (posicion <= 1) return 0;
  if (posicion === 2) return 0.1; // 2° estudiante: 10%
  if (posicion === 3) return 0.15; // 3° estudiante: 15%
  return 0.2; // 4° en adelante: 20%
}

// Descuento adicional por pagar anual (se aplica sobre el total ya con familiar).
export const DESCUENTO_ANUAL = 0.2;

export interface DesglosePrecio {
  estudiantes: number;
  anual: boolean;
  // Suma mensual de los estudiantes con el descuento familiar aplicado.
  mensualConFamiliar: number;
  // Lo que efectivamente paga por mes (si es anual, el prorrateo mensual).
  mensualEfectivo: number;
  // Total a cobrar en el ciclo elegido (1 mes o 12 meses).
  totalCiclo: number;
  // Cuánto ahorra al año vs. pagar mensual sin ningún descuento.
  ahorroAnual: number;
}

// Calcula el precio para N estudiantes en ciclo mensual o anual.
export function calcularPrecio(estudiantes: number, anual: boolean): DesglosePrecio {
  const n = Math.max(1, Math.floor(estudiantes));

  // suma con descuento familiar escalonado
  let mensualConFamiliar = 0;
  for (let pos = 1; pos <= n; pos++) {
    mensualConFamiliar += PRECIO_BASE_MENSUAL * (1 - descuentoFamiliarPorPosicion(pos));
  }
  mensualConFamiliar = Math.round(mensualConFamiliar);

  const mensualEfectivo = anual
    ? Math.round(mensualConFamiliar * (1 - DESCUENTO_ANUAL))
    : mensualConFamiliar;

  const totalCiclo = anual ? mensualEfectivo * 12 : mensualEfectivo;

  const sinDescuentoAnual = PRECIO_BASE_MENSUAL * n * 12;
  const ahorroAnual = sinDescuentoAnual - mensualEfectivo * 12;

  return {
    estudiantes: n,
    anual,
    mensualConFamiliar,
    mensualEfectivo,
    totalCiclo,
    ahorroAnual,
  };
}

// Formato CLP sin decimales: 9990 -> "$9.990"
export function clp(monto: number): string {
  return "$" + Math.round(monto).toLocaleString("es-CL");
}
