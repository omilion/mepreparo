// El resumen de UN alumno para la tarjeta del panel: cuánto lleva y si hay
// algo que mirar.
//
// Nace de una observación de uso real: el apoderado veía cuatro tarjetas
// idénticas donde lo único distinto era el nombre. Para decidir a quién
// acompañar hoy eso no sirve — necesita ver de un vistazo quién va bien y
// quién necesita atención.
//
// Regla de la que no nos movemos: cuando NO hay nada que reportar, se dice
// "ritmo normal". El silencio se lee como "algo falta"; decirlo tranquiliza.

import { calcularPlan } from "./motor";
import { indicadorExamen } from "./indicador";
import { fechaUltimaActividad } from "@/lib/tutor/acuerdo";
import type { PerfilNino } from "@/lib/profile";

// Mismo umbral que la alerta por correo (lib cron/alertas): que la app y el
// mail no le digan cosas distintas al apoderado el mismo día.
const DIAS_INACTIVO = 5;
// Con 3 temas en rojo ya no es un tropiezo suelto, es un patrón.
const TEMAS_ROJOS_ATENCION = 3;

export type NivelEstado = "alerta" | "atencion" | "normal" | "sin_datos";

export interface EstadoAlumno {
  nivel: NivelEstado;
  /** frase corta para la tarjeta */
  titulo: string;
  /** 0-100, promedio de la preparación por materia */
  avance: number;
  /** días desde la última sesión, o null si nunca estudió */
  diasSinEstudiar: number | null;
}

export function diasDesdeUltimaSesion(perfil: PerfilNino, ahora = new Date()): number | null {
  const ultima = fechaUltimaActividad(perfil.tutoria);
  if (!ultima) return null;
  return Math.max(0, Math.floor((ahora.getTime() - ultima.getTime()) / 86_400_000));
}

// Promedio simple de la preparación de cada materia del examen. Simple a
// propósito: ponderar por horas sugeridas haría que el número se moviera al
// cambiar el plan, y el apoderado leería eso como avance del niño.
export function avanceGeneral(perfil: PerfilNino): number {
  const materias = perfil.examen.materias;
  if (materias.length === 0) return 0;
  const suma = materias.reduce(
    (acc, m) => acc + indicadorExamen(m, perfil.curso, perfil.tutoria, perfil.examen.fecha).porcentaje,
    0
  );
  return Math.round(suma / materias.length);
}

export function estadoDelAlumno(perfil: PerfilNino, ahora = new Date()): EstadoAlumno {
  const avance = avanceGeneral(perfil);
  const dias = diasDesdeUltimaSesion(perfil, ahora);

  // Todavía no empieza: no es una alerta, es que falta arrancar. `dias` ya
  // sale null en el mismo caso (ninguna sesión NI evidencia registrada) —
  // antes esto miraba solo `sesiones`, así que un niño que solo había
  // rendido una prueba de etapa (sin charla completa con Rai) aparecía acá
  // como si nunca hubiera empezado.
  if (!perfil.tutoria || dias === null) {
    return { nivel: "sin_datos", titulo: "Aún no comienza", avance, diasSinEstudiar: dias };
  }

  // Lo más urgente primero: si no está estudiando, nada más importa.
  if (dias !== null && dias >= DIAS_INACTIVO) {
    return {
      nivel: "alerta",
      titulo: `Sin estudiar hace ${dias} días`,
      avance,
      diasSinEstudiar: dias,
    };
  }

  if (calcularPlan(perfil).veredicto === "apretado") {
    return { nivel: "alerta", titulo: "Va apretado para la fecha", avance, diasSinEstudiar: dias };
  }

  const rojos = (perfil.tutoria.temas ?? []).filter(
    (t) => t.estado === "le_cuesta" && perfil.examen.materias.includes(t.materia)
  ).length;
  if (rojos >= TEMAS_ROJOS_ATENCION) {
    return {
      nivel: "atencion",
      titulo: `${rojos} temas para reforzar`,
      avance,
      diasSinEstudiar: dias,
    };
  }

  return { nivel: "normal", titulo: "Ritmo normal", avance, diasSinEstudiar: dias };
}

// Color por nivel. Va SIEMPRE acompañado del texto (ver titulo): el estado no
// se comunica solo con color.
export function colorEstado(nivel: NivelEstado): string {
  if (nivel === "alerta") return "var(--clay)";
  if (nivel === "atencion") return "var(--gold)";
  if (nivel === "normal") return "var(--sage-deep)";
  return "var(--ink-soft)";
}
