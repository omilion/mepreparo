// El "acuerdo de tutoría": la memoria persistente entre Rai y el niño.
// Se arma en la PRIMERA charla (Rai propone un horario semanal y conoce al niño)
// y se recuerda en cada sesión siguiente. Vive dentro del PerfilNino, así se
// guarda con el resto (localStorage hoy; Supabase mañana).

import type { Materia } from "@/lib/profile";

// Días de la semana en el orden en que los mostramos/planificamos.
export type Dia = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

export const DIAS: { id: Dia; label: string; corto: string }[] = [
  { id: "lun", label: "Lunes", corto: "Lun" },
  { id: "mar", label: "Martes", corto: "Mar" },
  { id: "mie", label: "Miércoles", corto: "Mié" },
  { id: "jue", label: "Jueves", corto: "Jue" },
  { id: "vie", label: "Viernes", corto: "Vie" },
  { id: "sab", label: "Sábado", corto: "Sáb" },
  { id: "dom", label: "Domingo", corto: "Dom" },
];

// Resumen de UNA sesión, para que Rai recuerde de qué hablaron la vez pasada.
export interface SesionTutoria {
  fecha: string;        // ISO datetime de inicio
  duracionMin: number;  // duración real de la sesión
  dia: Dia;             // lun..dom
  materia: Materia;     // asignatura trabajada
  titulo: string;       // ej. "Suma de fracciones con distinto denominador"
  resumen: string;      // 1-3 frases: qué se hizo, dónde quedó, qué reforzar
  nMensajes: number;    // largo de la interacción (métrica de costo/uso)
}

// --- Capa 2: dominio por TEMA -------------------------------------------
// El corazón de "¿recuerdas cuando vimos fracciones y te costaban, pero
// pudimos?": un registro por tema con su estado y las evidencias que lo
// respaldan (números de ejercicios + juicio de Rai + dichos del niño).

export type EstadoTema = "en_proceso" | "le_cuesta" | "superado";

export interface EvidenciaTema {
  fecha: string; // ISO date
  // ejercicios = conteo determinista | juicio_rai = del cierre de sesión
  // dijo = frase del niño | diagnostico = brecha detectada al inicio
  tipo: "ejercicios" | "juicio_rai" | "dijo" | "diagnostico";
  nota: string; // ej. "5 de 6 correctos" | "dijo 'no las entiendo'"
}

export interface TemaDominio {
  tema: string; // ej. "fracciones" (mismo vocabulario que las brechas)
  materia: Materia;
  estado: EstadoTema;
  evidencias: EvidenciaTema[]; // la más reciente al final
  actualizadoEn: string; // ISO
}

// --- Capa 3: recuerdos personales ----------------------------------------
// Frases y observaciones del niño (SOLO sobre el estudio) con fecha, para que
// Rai pueda decir "me contaste que..." con sus propias palabras.

export interface RecuerdoNino {
  fecha: string; // ISO date
  tipo: "gusto" | "dificultad" | "logro" | "emocional";
  texto: string; // ej. "dijo 'las fracciones se me hacen difíciles'"
  tema?: string; // si el recuerdo está ligado a un tema concreto
}

export interface AcuerdoTutoria {
  creadoEn: string; // ISO — cuándo se hizo la primera charla
  // Qué ramo(s) toca cada día. Un día puede no tener ramo (descanso).
  horario: Partial<Record<Dia, Materia[]>>;
  // LEGADO: notas planas (se conserva para acuerdos antiguos; ya no se
  // trunca ni se escribe — los recuerdos nuevos van a `recuerdos`).
  notasNino: string;
  // Historial de sesiones, la más reciente al final (capa 1).
  sesiones: SesionTutoria[];
  // Capa 2: dominio por tema. Opcional para compatibilidad con acuerdos viejos.
  temas?: TemaDominio[];
  // Capa 3: recuerdos personales del niño.
  recuerdos?: RecuerdoNino[];
}

// Día de hoy como Dia (lun..dom), a partir de getDay() (0=domingo).
export function diaDeHoy(d = new Date()): Dia {
  const map: Dia[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
  return map[d.getDay()];
}

// ¿Qué materia(s) toca hoy según el acuerdo?
export function materiasDeHoy(acuerdo: AcuerdoTutoria, hoy = diaDeHoy()): Materia[] {
  return acuerdo.horario[hoy] ?? [];
}

// La última sesión registrada (para "recordar de qué hablamos la vez pasada").
export function ultimaSesion(acuerdo: AcuerdoTutoria): SesionTutoria | null {
  return acuerdo.sesiones.at(-1) ?? null;
}

// ------------------------------------------------------------------------
// Helpers PUROS de la memoria (testeables sin UI ni red)
// ------------------------------------------------------------------------

// Lo que el cierre de sesión (Gemini) reporta sobre cada tema trabajado.
export interface TemaTrabajado {
  tema: string;
  materia: Materia;
  resultado: "avanzo" | "le_costo" | "supero";
  fraseDelNino?: string; // textual, SOLO sobre el estudio
}

const hoyIso = () => new Date().toISOString().slice(0, 10);

// Transición de estado determinista (el LLM reporta, el CÓDIGO decide):
// le_costo → le_cuesta | supero → superado | avanzo → en_proceso (pero nunca
// degrada un tema ya superado: si vuelve a costar, sí baja — eso es señal real).
function transicion(previo: EstadoTema | undefined, r: TemaTrabajado["resultado"]): EstadoTema {
  if (r === "le_costo") return "le_cuesta";
  if (r === "supero") return "superado";
  return previo === "superado" ? "superado" : "en_proceso";
}

// Aplica el reporte del cierre de sesión al acuerdo. Devuelve un acuerdo NUEVO.
export function aplicarCierre(
  acuerdo: AcuerdoTutoria,
  reporte: { temasTrabajados?: TemaTrabajado[]; recuerdos?: Omit<RecuerdoNino, "fecha">[] },
  fecha = hoyIso()
): AcuerdoTutoria {
  const temas = [...(acuerdo.temas ?? [])];

  for (const t of reporte.temasTrabajados ?? []) {
    if (!t.tema?.trim()) continue;
    const clave = t.tema.trim().toLowerCase();
    const idx = temas.findIndex((x) => x.tema === clave && x.materia === t.materia);
    const previo = idx >= 0 ? temas[idx] : undefined;

    const evidencias: EvidenciaTema[] = [...(previo?.evidencias ?? [])];
    evidencias.push({
      fecha,
      tipo: "juicio_rai",
      nota:
        t.resultado === "supero"
          ? "lo logró en la sesión"
          : t.resultado === "le_costo"
            ? "le costó en la sesión"
            : "avanzó en la sesión",
    });
    if (t.fraseDelNino?.trim()) {
      evidencias.push({ fecha, tipo: "dijo", nota: `dijo "${t.fraseDelNino.trim()}"` });
    }

    const actualizado: TemaDominio = {
      tema: clave,
      materia: t.materia,
      estado: transicion(previo?.estado, t.resultado),
      evidencias: evidencias.slice(-8), // cap: las 8 evidencias más recientes
      actualizadoEn: fecha,
    };
    if (idx >= 0) temas[idx] = actualizado;
    else temas.push(actualizado);
  }

  const recuerdos = [...(acuerdo.recuerdos ?? [])];
  for (const r of reporte.recuerdos ?? []) {
    if (!r.texto?.trim()) continue;
    recuerdos.push({ ...r, texto: r.texto.trim(), fecha });
  }

  return { ...acuerdo, temas, recuerdos: recuerdos.slice(-40) }; // cap global
}

// Siembra la capa 2 desde el diagnóstico inicial: cada brecha entra como tema
// "le_cuesta" con evidencia tipo diagnostico. Así Rai tiene material desde el día 1.
export function sembrarTemasDesdeDiagnostico(
  acuerdo: AcuerdoTutoria,
  diagnostico: Partial<Record<Materia, { nivel: number; brechas: string[] }>> | undefined,
  fecha = hoyIso()
): AcuerdoTutoria {
  if (!diagnostico) return acuerdo;
  const temas = [...(acuerdo.temas ?? [])];
  for (const [materia, d] of Object.entries(diagnostico)) {
    for (const brecha of d?.brechas ?? []) {
      const clave = brecha.trim().toLowerCase();
      if (!clave || temas.some((t) => t.tema === clave && t.materia === materia)) continue;
      temas.push({
        tema: clave,
        materia: materia as Materia,
        estado: "le_cuesta",
        evidencias: [{ fecha, tipo: "diagnostico", nota: "brecha detectada en el diagnóstico" }],
        actualizadoEn: fecha,
      });
    }
  }
  return { ...acuerdo, temas };
}

// Evidencia dura: resultado de un bloque de ejercicios sobre un tema
// (lo llama el flujo de estudio cuando el niño responde ejercicios reales).
export function registrarEjercicios(
  acuerdo: AcuerdoTutoria,
  tema: string,
  materia: Materia,
  correctos: number,
  total: number,
  fecha = hoyIso()
): AcuerdoTutoria {
  const clave = tema.trim().toLowerCase();
  const temas = [...(acuerdo.temas ?? [])];
  const idx = temas.findIndex((x) => x.tema === clave && x.materia === materia);
  const previo = idx >= 0 ? temas[idx] : undefined;

  const evidencias = [...(previo?.evidencias ?? [])];
  evidencias.push({ fecha, tipo: "ejercicios", nota: `${correctos} de ${total} correctos` });

  // regla dura: ≥80% con al menos 4 ejercicios = superado; ≤40% = le_cuesta
  const ratio = total > 0 ? correctos / total : 0;
  const estado: EstadoTema =
    total >= 4 && ratio >= 0.8 ? "superado" : ratio <= 0.4 ? "le_cuesta" : (previo?.estado ?? "en_proceso");

  const actualizado: TemaDominio = {
    tema: clave,
    materia,
    estado,
    evidencias: evidencias.slice(-8),
    actualizadoEn: fecha,
  };
  if (idx >= 0) temas[idx] = actualizado;
  else temas.push(actualizado);
  return { ...acuerdo, temas };
}

// Recuperación selectiva: los recuerdos y temas que valen para la sesión de HOY.
// Prioriza la materia del día; dentro de ella, temas superados (para motivar) y
// con dificultad (para reforzar), los más recientes primero.
export function memoriaParaHoy(
  acuerdo: AcuerdoTutoria,
  materiasHoy: Materia[],
  maxTemas = 3,
  maxRecuerdos = 3
): { temas: TemaDominio[]; recuerdos: RecuerdoNino[] } {
  const enMateria = (m: Materia) => materiasHoy.length === 0 || materiasHoy.includes(m);

  const temas = (acuerdo.temas ?? [])
    .filter((t) => enMateria(t.materia))
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn))
    .slice(0, maxTemas);

  const temasElegidos = new Set(temas.map((t) => t.tema));
  const recuerdos = (acuerdo.recuerdos ?? [])
    .filter((r) => !r.tema || temasElegidos.has(r.tema) )
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, maxRecuerdos);

  return { temas, recuerdos };
}

// Texto compacto de la memoria para inyectar en el prompt (pocos tokens).
export function textoMemoria(m: { temas: TemaDominio[]; recuerdos: RecuerdoNino[] }): string {
  const partes: string[] = [];
  for (const t of m.temas) {
    const ev = t.evidencias.slice(-2).map((e) => `${e.fecha.slice(5)}: ${e.nota}`).join("; ");
    partes.push(`${t.tema} (${t.estado})${ev ? ` [${ev}]` : ""}`);
  }
  for (const r of m.recuerdos) {
    partes.push(`recuerdo ${r.fecha.slice(5)}: ${r.texto}`);
  }
  return partes.join(" · ");
}
