// El indicador "listo para tu examen": combina EN UN SOLO % la cobertura del
// camino (cuántas etapas superadas) con el desempeño reciente (cómo le está
// yendo en lo que aún no supera), y lo traduce a lenguaje humano. La fecha del
// examen ya se pedía en el onboarding y casi no se usaba: acá se conecta.

import { MATERIAS, diasHastaExamen, type Curso, type Materia } from "@/lib/profile";
import type { AcuerdoTutoria } from "@/lib/tutor/acuerdo";
import { etapasDeMateria, tituloDeTema, type Etapa } from "./etapas";

export interface IndicadorExamen {
  porcentaje: number; // 0-100: cobertura ponderada por desempeño
  texto: string; // frase humana, lista para mostrar
  dias: number | null; // días hasta el examen (null si no hay fecha)
  temaFlojo: string | null; // título humano del tema a reforzar, si aplica
}

// Puntaje por etapa: superada pesa completo; la actual y las en refuerzo dan
// crédito parcial (están en curso, no en cero); pendiente no aporta aún.
function puntajeEtapa(e: Etapa): number {
  if (e.estado === "superada") return 1;
  if (e.estado === "actual") return 0.4;
  if (e.estado === "refuerzo") return 0.2;
  return 0;
}

// El tema a mencionar como "lo próximo a reforzar": prioriza uno ya marcado
// difícil (refuerzo), luego el que está en curso (actual), luego el siguiente
// pendiente. Si todo está superado, no hay nada que mencionar.
function temaAMencionar(etapas: Etapa[]): Etapa | null {
  return (
    etapas.find((e) => e.estado === "refuerzo") ??
    etapas.find((e) => e.estado === "actual") ??
    etapas.find((e) => e.estado === "pendiente") ??
    null
  );
}

function textoIndicador(porcentaje: number, materiaLabel: string, temaFlojo: Etapa | null): string {
  const flojo = temaFlojo ? tituloDeTema(temaFlojo.tema) : null;
  if (porcentaje >= 85) {
    return flojo
      ? `Vas muy bien encaminada en ${materiaLabel}. Repasa un poco ${flojo} y estarás lista.`
      : `Vas muy bien encaminada en ${materiaLabel}: superaste todo tu camino.`;
  }
  if (porcentaje >= 60) {
    return flojo
      ? `Vas bien encaminada en ${materiaLabel}, te falta afirmar ${flojo}.`
      : `Vas bien encaminada en ${materiaLabel}.`;
  }
  if (porcentaje >= 35) {
    return flojo
      ? `Vas avanzando en ${materiaLabel}. Conviene reforzar ${flojo} pronto.`
      : `Vas avanzando en ${materiaLabel}.`;
  }
  return flojo
    ? `Recién estás empezando ${materiaLabel}. Lo importante es ir paso a paso: sigue con ${flojo}.`
    : `Recién estás empezando ${materiaLabel}.`;
}

export function indicadorExamen(
  materia: Materia,
  curso: Curso,
  acuerdo: AcuerdoTutoria | null | undefined,
  examenFecha: string | null | undefined
): IndicadorExamen {
  const etapas = etapasDeMateria(materia, curso, acuerdo);
  const materiaLabel = MATERIAS.find((m) => m.id === materia)?.label ?? materia;
  const dias = examenFecha ? diasHastaExamen(examenFecha) : null;

  if (etapas.length === 0) {
    return { porcentaje: 0, texto: `Aún no armamos el camino de ${materiaLabel}.`, dias, temaFlojo: null };
  }

  const suma = etapas.reduce((acc, e) => acc + puntajeEtapa(e), 0);
  const porcentaje = Math.round((suma / etapas.length) * 100);
  const flojo = temaAMencionar(etapas);

  return {
    porcentaje,
    texto: textoIndicador(porcentaje, materiaLabel, flojo),
    dias,
    temaFlojo: flojo ? tituloDeTema(flojo.tema) : null,
  };
}
