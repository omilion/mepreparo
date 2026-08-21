// Fusión atómica de PerfilNino para sincronización multi-dispositivo y offline-first.
// Evita que un dispositivo con marca de tiempo desfasada borre avances,
// evidencias, diagnósticos o sesiones ganadas en otro dispositivo.

import type { PerfilNino, DiagnosticoMateria, Materia } from "@/lib/profile";
import type {
  AcuerdoTutoria,
  SesionTutoria,
  TemaDominio,
  RecuerdoNino,
  SimulacroCierre,
  PlanMateria,
} from "./acuerdo";
import { sanearTutoria } from "./sanearMemoria";

function fechaMs(iso?: string): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function fusionarDiagnostico(
  base?: Partial<Record<Materia, DiagnosticoMateria>>,
  entrante?: Partial<Record<Materia, DiagnosticoMateria>>
): Partial<Record<Materia, DiagnosticoMateria>> | undefined {
  if (!base && !entrante) return undefined;
  if (!base) return entrante;
  if (!entrante) return base;

  const resultado: Partial<Record<Materia, DiagnosticoMateria>> = { ...base };

  for (const [key, valEntrante] of Object.entries(entrante) as [Materia, DiagnosticoMateria][]) {
    const valBase = base[key];
    if (!valBase) {
      resultado[key] = valEntrante;
    } else {
      // Si ambos tienen diagnóstico para la misma materia, fusionar brechas y tomar mayor nivel
      const brechasSet = new Set([...(valBase.brechas || []), ...(valEntrante.brechas || [])]);
      resultado[key] = {
        nivel: Math.max(valBase.nivel || 0, valEntrante.nivel || 0),
        brechas: Array.from(brechasSet),
      };
    }
  }

  return resultado;
}

export function fusionarTemasDominio(
  base: TemaDominio[] = [],
  entrante: TemaDominio[] = []
): TemaDominio[] {
  const mapa = new Map<string, TemaDominio>();

  // Helper para combinar dos registros del mismo tema
  function combinar(a: TemaDominio, b: TemaDominio): TemaDominio {
    // Si cualquiera de los dos dio superado, el tema queda superado.
    let estadoFinal = a.estado;
    if (a.estado === "superado" || b.estado === "superado") {
      estadoFinal = "superado";
    } else if (a.estado === "le_cuesta" || b.estado === "le_cuesta") {
      estadoFinal = "le_cuesta";
    }

    // Deduplicar evidencias por (fecha, nota, tipo)
    const evidenciasVistas = new Set<string>();
    const evidenciasUnidas = [...(a.evidencias || []), ...(b.evidencias || [])].filter((e) => {
      const clave = `${e.fecha}_${e.tipo}_${e.nota}`;
      if (evidenciasVistas.has(clave)) return false;
      evidenciasVistas.add(clave);
      return true;
    });

    // Ordenar evidencias cronológicamente
    evidenciasUnidas.sort((e1, e2) => fechaMs(e1.fecha) - fechaMs(e2.fecha));

    // Fecha de actualización más reciente
    const fechaMasReciente = fechaMs(a.actualizadoEn) >= fechaMs(b.actualizadoEn)
      ? a.actualizadoEn
      : b.actualizadoEn;

    // Refuerzo pendiente: tomar el más reciente si existe
    let refuerzoFinal = a.refuerzoPendiente;
    if (b.refuerzoPendiente) {
      if (!a.refuerzoPendiente || fechaMs(b.refuerzoPendiente.desde) > fechaMs(a.refuerzoPendiente.desde)) {
        refuerzoFinal = b.refuerzoPendiente;
      }
    }
    // Si el tema quedó superado, se limpia el refuerzo pendiente
    if (estadoFinal === "superado") {
      refuerzoFinal = undefined;
    }

    return {
      tema: a.tema,
      materia: a.materia,
      estado: estadoFinal,
      evidencias: evidenciasUnidas,
      actualizadoEn: fechaMasReciente,
      refuerzoPendiente: refuerzoFinal,
    };
  }

  for (const t of base) {
    mapa.set(`${t.materia}:${t.tema.toLowerCase().trim()}`, t);
  }

  for (const t of entrante) {
    const clave = `${t.materia}:${t.tema.toLowerCase().trim()}`;
    const existente = mapa.get(clave);
    if (!existente) {
      mapa.set(clave, t);
    } else {
      mapa.set(clave, combinar(existente, t));
    }
  }

  return Array.from(mapa.values());
}

export function fusionarSesiones(
  base: SesionTutoria[] = [],
  entrante: SesionTutoria[] = []
): SesionTutoria[] {
  const vistas = new Set<string>();
  const unificadas: SesionTutoria[] = [];

  for (const s of [...base, ...entrante]) {
    const clave = `${s.fecha}_${s.materia}_${s.titulo}`;
    if (!vistas.has(clave)) {
      vistas.add(clave);
      unificadas.push(s);
    }
  }

  unificadas.sort((a, b) => fechaMs(a.fecha) - fechaMs(b.fecha));
  return unificadas;
}

export function fusionarRecuerdos(
  base: RecuerdoNino[] = [],
  entrante: RecuerdoNino[] = []
): RecuerdoNino[] {
  const vistas = new Set<string>();
  const unificados: RecuerdoNino[] = [];

  for (const r of [...base, ...entrante]) {
    const clave = `${r.fecha}_${r.tipo}_${r.texto}`;
    if (!vistas.has(clave)) {
      vistas.add(clave);
      unificados.push(r);
    }
  }

  unificados.sort((a, b) => fechaMs(a.fecha) - fechaMs(b.fecha));
  return unificados;
}

export function fusionarSimulacrosCierre(
  base: SimulacroCierre[] = [],
  entrante: SimulacroCierre[] = []
): SimulacroCierre[] {
  const vistas = new Set<string>();
  const unificados: SimulacroCierre[] = [];

  for (const s of [...base, ...entrante]) {
    const clave = `${s.materia}_${s.numero}_${s.fecha}`;
    if (!vistas.has(clave)) {
      vistas.add(clave);
      unificados.push(s);
    }
  }

  unificados.sort((a, b) => fechaMs(a.fecha) - fechaMs(b.fecha));
  return unificados;
}

export function fusionarPlanMaterias(
  base: PlanMateria[] = [],
  entrante: PlanMateria[] = []
): PlanMateria[] {
  const mapa = new Map<Materia, PlanMateria>();
  for (const p of base) mapa.set(p.materia, p);
  for (const p of entrante) {
    const prev = mapa.get(p.materia);
    if (!prev || fechaMs(p.generadoEn) >= fechaMs(prev.generadoEn)) {
      mapa.set(p.materia, p);
    }
  }
  return Array.from(mapa.values());
}

export function fusionarTutoria(
  base?: AcuerdoTutoria,
  entrante?: AcuerdoTutoria,
  curso?: string
): AcuerdoTutoria | undefined {
  if (!base && !entrante) return undefined;
  if (!base) return sanearTutoria(entrante, curso as any) ?? undefined;
  if (!entrante) return sanearTutoria(base, curso as any) ?? undefined;

  const sanBase = sanearTutoria(base, curso as any) || base;
  const sanEntrante = sanearTutoria(entrante, curso as any) || entrante;

  const creadoEn = fechaMs(sanBase.creadoEn) <= fechaMs(sanEntrante.creadoEn) && fechaMs(sanBase.creadoEn) > 0
    ? sanBase.creadoEn
    : sanEntrante.creadoEn;

  const horario = { ...sanBase.horario, ...sanEntrante.horario };
  const planMaterias = fusionarPlanMaterias(sanBase.planMaterias, sanEntrante.planMaterias);
  const sesiones = fusionarSesiones(sanBase.sesiones, sanEntrante.sesiones);
  const temas = fusionarTemasDominio(sanBase.temas, sanEntrante.temas);
  const recuerdos = fusionarRecuerdos(sanBase.recuerdos, sanEntrante.recuerdos);
  const simulacrosCierre = fusionarSimulacrosCierre(
    sanBase.simulacrosCierre,
    sanEntrante.simulacrosCierre
  );

  const contenidosVistosSet = new Set([
    ...(sanBase.contenidosVistos || []),
    ...(sanEntrante.contenidosVistos || []),
  ]);
  const contenidosVistos = Array.from(contenidosVistosSet).slice(-120);

  const notasNino = [sanBase.notasNino, sanEntrante.notasNino].filter(Boolean).join(" | ");

  return (
    sanearTutoria(
      {
        creadoEn,
        horario,
        planMaterias,
        notasNino,
        sesiones,
        temas,
        recuerdos,
        contenidosVistos,
        simulacrosCierre,
      },
      curso as any
    ) ?? undefined
  );
}

export function fusionarPerfilNino(
  base: PerfilNino | undefined,
  entrante: PerfilNino
): PerfilNino {
  if (!base) {
    return {
      ...entrante,
      tutoria: sanearTutoria(entrante.tutoria, entrante.curso) ?? undefined,
    };
  }

  const baseMs = fechaMs(base.updatedAt || base.creadoEn);
  const entranteMs = fechaMs(entrante.updatedAt || entrante.creadoEn);
  const esEntranteMasNuevo = entranteMs >= baseMs;

  const perfilPrincipal = esEntranteMasNuevo ? entrante : base;

  // Logros vistos: set union de ambos perfiles
  const logrosVistosSet = new Set([
    ...(base.contexto?.logrosVistos || []),
    ...(entrante.contexto?.logrosVistos || []),
  ]);

  const contextoUnificado = {
    ...perfilPrincipal.contexto,
    logrosVistos: Array.from(logrosVistosSet),
  };

  const diagnosticoUnificado = fusionarDiagnostico(base.diagnostico, entrante.diagnostico);
  const tutoriaUnificada = fusionarTutoria(base.tutoria, entrante.tutoria, perfilPrincipal.curso as any);

  const fechaUpdateDefinitiva = new Date(Math.max(baseMs, entranteMs, Date.now())).toISOString();

  return {
    id: perfilPrincipal.id,
    nombre: perfilPrincipal.nombre,
    curso: perfilPrincipal.curso,
    examen: perfilPrincipal.examen,
    disponibilidad: perfilPrincipal.disponibilidad,
    contexto: contextoUnificado,
    diagnostico: diagnosticoUnificado,
    tutoria: tutoriaUnificada,
    creadoEn: fechaMs(base.creadoEn) <= fechaMs(entrante.creadoEn) && fechaMs(base.creadoEn) > 0 ? base.creadoEn : entrante.creadoEn,
    updatedAt: fechaUpdateDefinitiva,
  };
}
