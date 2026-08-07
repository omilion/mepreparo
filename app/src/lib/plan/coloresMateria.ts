// Los colores por materia, en UN solo lugar (vivían dentro de MapaEtapas y el
// panel del apoderado no los usaba, así que el niño y su mamá veían la misma
// materia de colores distintos).
//
// OJO — validada como paleta categórica, FALLA: matemática y lenguaje quedan a
// ΔE 3.7 en protanopia (para un daltónico rojo-verde son el mismo color) y son
// justamente las dos materias más frecuentes; historia e inglés quedan a 12.3
// incluso con visión normal. Es consecuencia de que la paleta es desaturada a
// propósito, que es lo que la hace zen.
//
// Por eso la regla es: EL COLOR ACOMPAÑA, EL NOMBRE IDENTIFICA. Nunca dejar que
// el color sea lo único que distingue una materia de otra — cada bloque lleva
// su nombre escrito.

import type { Materia } from "@/lib/profile";

export interface ColorMateria {
  /** trazo y texto de acento */
  color: string;
  /** fondo muy suave para tarjetas */
  fondo: string;
}

export const COLOR_MATERIA: Record<Materia, ColorMateria> = {
  matematica: {
    color: "var(--sage-deep)",
    fondo: "color-mix(in srgb, var(--sage) 8%, transparent)",
  },
  lenguaje: {
    color: "var(--clay)",
    fondo: "color-mix(in srgb, var(--clay) 8%, transparent)",
  },
  ciencias: {
    color: "var(--color-ciencias-deep)",
    fondo: "color-mix(in srgb, var(--color-ciencias) 8%, transparent)",
  },
  historia: {
    color: "var(--color-historia-deep)",
    fondo: "color-mix(in srgb, var(--color-historia) 8%, transparent)",
  },
  ingles: {
    color: "var(--color-ingles-deep)",
    fondo: "color-mix(in srgb, var(--color-ingles) 8%, transparent)",
  },
};

export function colorDeMateria(m: Materia): ColorMateria {
  return COLOR_MATERIA[m] ?? COLOR_MATERIA.matematica;
}
