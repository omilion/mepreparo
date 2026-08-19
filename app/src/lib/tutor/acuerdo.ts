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
  // simulacro = bloque del simulacro de examen (evidencia dura, cronometrada)
  // prueba_etapa = la prueba formal de la etapa (8 preguntas, ≥80% para pasar)
  tipo: "ejercicios" | "juicio_rai" | "dijo" | "diagnostico" | "simulacro" | "prueba_etapa";
  nota: string; // ej. "5 de 6 correctos" | "dijo 'no las entiendo'"
  // Para "ejercicios" y "prueba_etapa": el conteo real, sin tener que volver a
  // parsear `nota` con regex para sumarlo (evidencias viejas sin esto igual
  // funcionan: el código que suma cae de vuelta a parsear la nota).
  correctos?: number;
  total?: number;
}

export interface TemaDominio {
  tema: string; // ej. "fracciones" (mismo vocabulario que las brechas)
  materia: Materia;
  estado: EstadoTema;
  evidencias: EvidenciaTema[]; // la más reciente al final
  actualizadoEn: string; // ISO
  // La ÚLTIMA prueba formal de este tema que NO se aprobó, y que todavía no se
  // resolvió con práctica nueva. Rai lo lee en la memoria para retomarlo la
  // próxima clase ("quedamos en repasar esto") en vez de que la promesa se
  // pierda apenas termina la sesión. Se limpia (se sobreescribe con undefined
  // vía spread) cuando una prueba nueva SÍ se aprueba.
  refuerzoPendiente?: {
    desde: string; // ISO date de la prueba reprobada
    correctos: number;
    total: number;
    enunciadosFallados: string[]; // lo que le costó, para que Rai lo retome con otro ángulo
  };
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

// Plan de una materia generado por la IA al terminar el onboarding ("preparar
// los mundos"): el orden pedagógico de temas + un objetivo. Da a las etapas y a
// las conversaciones sentido de temporalidad ("sin esto no entenderás lo otro").
// Es la BASE; el niño puede desviarse, pero orienta a Rai.
export interface PlanMateria {
  materia: Materia;
  objetivo: string; // meta de la materia para el examen (1 frase)
  temas: string[]; // orden pedagógico de temas (claves, como en el banco)
  generadoEn: string; // ISO
}

export interface AcuerdoTutoria {
  creadoEn: string; // ISO — cuándo se hizo la primera charla
  // Qué ramo(s) toca cada día. Un día puede no tener ramo (descanso).
  horario: Partial<Record<Dia, Materia[]>>;
  // Plan por materia generado por la IA (la ruta base de cada "mundo").
  planMaterias?: PlanMateria[];
  // LEGADO: notas planas (se conserva para acuerdos antiguos; ya no se
  // trunca ni se escribe — los recuerdos nuevos van a `recuerdos`).
  notasNino: string;
  // Historial de sesiones, la más reciente al final (capa 1).
  sesiones: SesionTutoria[];
  // Capa 2: dominio por tema. Opcional para compatibilidad con acuerdos viejos.
  temas?: TemaDominio[];
  // Capa 3: recuerdos personales del niño.
  recuerdos?: RecuerdoNino[];
  // Ids de interactivos que este niño YA vio, entre sesiones. Sin esto, la
  // memoria de lo entregado moría con la clase y a la semana siguiente la
  // biblioteca le devolvía exactamente el mismo juego. Se recorta a los
  // últimos MAX_VISTOS para no engordar el perfil (que viaja en cada sync).
  contenidosVistos?: string[];
  // El CIERRE de una materia (ver etapas.ts → faseDeMateria): al superar
  // todas sus etapas, un simulacro documentado (mixto, cronometrado, sin
  // ayuda de Rai) reemplaza el "listo" superficial por evidencia real de que
  // no se olvidó nada. Si revela huecos, se arma un repaso dirigido a esos
  // temas y se rinde un segundo simulacro — tope de 2: si el segundo tampoco
  // alcanza, la materia queda igual "lista" pero con los huecos anotados
  // para que Rai los siga tocando en charlas normales, sin bloquear el avance.
  simulacrosCierre?: SimulacroCierre[];
}

export interface SimulacroCierre {
  materia: Materia;
  numero: 1 | 2; // qué lugar ocupa en el ciclo de cierre de ESA materia
  fecha: string; // ISO date
  desglose: { tema: string; correctos: number; total: number }[];
  aprobado: boolean; // ≥80% del total mixto de la materia
  // Temas bajo el umbral EN ESTE simulacro — el insumo directo del repaso
  // dirigido (no es lo mismo que "le_cuesta": un tema puede estar
  // "superado" por su prueba de etapa y aun así salir débil acá, que es
  // justo el olvido que el simulacro está pensado para detectar).
  temasDebiles: string[];
}

// Cuántos interactivos recordamos por niño. ~120 cubre varias semanas de
// clases; más allá, repetir algo de hace meses es aceptable (y deseable, como
// repaso espaciado).
export const MAX_VISTOS = 120;

// Registra contenidos entregados sin duplicar y conservando los más recientes.
export function recordarContenidos(
  acuerdo: AcuerdoTutoria,
  ids: string[]
): AcuerdoTutoria {
  const limpios = ids.filter(Boolean);
  if (limpios.length === 0) return acuerdo;
  const previos = acuerdo.contenidosVistos ?? [];
  // los nuevos al final: si hay que recortar, se pierde lo más antiguo
  const juntos = [...previos.filter((id) => !limpios.includes(id)), ...limpios];
  return { ...acuerdo, contenidosVistos: juntos.slice(-MAX_VISTOS) };
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

// ¿Hay evidencia DURA a favor de este tema? (ejercicios resueltos, prueba de
// etapa o simulacro). El juicio de Rai y las frases del niño no cuentan acá.
function tieneEvidenciaDura(evidencias: EvidenciaTema[]): boolean {
  return evidencias.some((e) => e.tipo === "ejercicios" || e.tipo === "simulacro");
}

// ¿Rai ya lo había dado por superado en una sesión ANTERIOR (otro día)?
function juicioSuperoPrevio(evidencias: EvidenciaTema[], hoy: string): boolean {
  return evidencias.some(
    (e) => e.tipo === "juicio_rai" && e.nota === "lo logró en la sesión" && e.fecha !== hoy
  );
}

// Transición de estado determinista (el LLM reporta, el CÓDIGO decide):
// le_costo → le_cuesta | avanzo → en_proceso (nunca degrada un superado; si
// vuelve a costar sí baja, eso es señal real).
//
// "supero" NO basta por sí solo para dar un tema por superado. registrarEjercicios
// exige ≥4 ejercicios y ≥80%; aceptar la impresión de Rai sin umbral inflaba el
// indicador "listo para tu examen" y el logro "materia completa" con pura
// conversación. Ahora sube a superado solo si hay evidencia dura, o si Rai lo
// sostiene en DOS sesiones distintas; si no, reconoce el avance con "en_proceso".
function transicion(
  previo: TemaDominio | undefined,
  r: TemaTrabajado["resultado"],
  evidencias: EvidenciaTema[],
  hoy: string
): EstadoTema {
  if (r === "le_costo") return "le_cuesta";
  if (r === "supero") {
    const respaldado =
      tieneEvidenciaDura(evidencias) || juicioSuperoPrevio(previo?.evidencias ?? [], hoy);
    return respaldado ? "superado" : "en_proceso";
  }
  return previo?.estado === "superado" ? "superado" : "en_proceso";
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
      estado: transicion(previo, t.resultado, evidencias, fecha),
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

// Umbrales de la PRUEBA formal de etapa (8 preguntas del banco, servidor
// valida con HMAC — ver PruebaEtapa.tsx). Compartidos con el cliente para que
// la pantalla de resultado y el guardado de evidencia usen exactamente el
// mismo criterio y nunca se contradigan ("buen intento" en pantalla pero el
// mapa la marca superada, o al revés).
export const UMBRAL_PRUEBA_ETAPA = 0.8;
export const MINIMO_EVALUABLE_PRUEBA = 2;

// Umbral para que el CÓDIGO (no la impresión de Rai en la charla) considere
// que hay práctica suficiente para ofrecer la prueba formal. Más bajo que el
// de la prueba misma (0.75 vs. 0.8): esto solo habilita el botón, no aprueba
// la etapa — approvar sigue exigiendo la prueba real.
const UMBRAL_LISTO = 0.75;
const MINIMO_LISTO = 4;

// Suma correctos/total de un tipo de evidencia dentro de una lista, solo
// contando evidencia CON o DESPUÉS de `desde` (para exigir práctica NUEVA
// tras reprobar una prueba, no reciclar la de antes). Usa los campos
// estructurados si existen; si no (evidencia vieja, de antes de este
// cambio), cae a parsear la nota — así los acuerdos existentes no pierden su
// historial.
export function acumularEvidencia(
  evidencias: EvidenciaTema[],
  tipo: EvidenciaTema["tipo"],
  desde?: string
): { correctos: number; total: number } {
  return evidencias.reduce(
    (acc, e) => {
      if (e.tipo !== tipo) return acc;
      if (desde && e.fecha < desde) return acc;
      if (e.correctos !== undefined && e.total !== undefined) {
        return { correctos: acc.correctos + e.correctos, total: acc.total + e.total };
      }
      const match = /^(\d+) de (\d+) correctos/.exec(e.nota);
      if (!match) return acc;
      return { correctos: acc.correctos + Number(match[1]), total: acc.total + Number(match[2]) };
    },
    { correctos: 0, total: 0 }
  );
}

// Evidencia de PRÁCTICA (no la prueba formal): un bloque de ejercicios/juego
// interactivo sobre un tema. YA NO otorga "superado" por sí sola — antes,
// práctica suelta (un par de sopas de letras acertadas) podía marcar toda la
// etapa como superada sin que existiera una prueba real detrás. Ahora la
// práctica solo mueve entre "le_cuesta"/"en_proceso" y alimenta
// evaluarPreparacion(): superar la etapa exige pasar registrarPruebaEtapa.
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
  evidencias.push({ fecha, tipo: "ejercicios", nota: `${correctos} de ${total} correctos`, correctos, total });

  const ratio = total > 0 ? correctos / total : 0;
  const estado: EstadoTema =
    ratio <= 0.4
      ? "le_cuesta"
      // zona media: conserva lo que ya había (un "superado" real de una
      // prueba no se degrada por un ejercicio suelto; un "le_cuesta" tampoco
      // se borra solo porque un ejercicio salió bien). Practicar bien nunca
      // OTORGA "superado" por sí solo — eso exige registrarPruebaEtapa.
      : (previo?.estado ?? "en_proceso");

  const actualizado: TemaDominio = {
    ...previo,
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

// Evidencia DURA formal: el resultado de la prueba de etapa (8 preguntas,
// validadas en el servidor). Es la ÚNICA vía para que un tema pase a
// "superado" (ver registrarEjercicios). Si no aprueba, queda un
// refuerzoPendiente con lo que falló, para que Rai lo retome la próxima
// clase con otro enfoque en vez de que la promesa se pierda.
export function registrarPruebaEtapa(
  acuerdo: AcuerdoTutoria,
  tema: string,
  materia: Materia,
  correctos: number,
  total: number,
  enunciadosFallados: string[] = [],
  fecha = hoyIso()
): AcuerdoTutoria {
  const clave = tema.trim().toLowerCase();
  const temas = [...(acuerdo.temas ?? [])];
  const idx = temas.findIndex((x) => x.tema === clave && x.materia === materia);
  const previo = idx >= 0 ? temas[idx] : undefined;

  const ratio = total > 0 ? correctos / total : 0;
  const aprobada = total >= MINIMO_EVALUABLE_PRUEBA && ratio >= UMBRAL_PRUEBA_ETAPA;

  const evidencias = [...(previo?.evidencias ?? [])];
  evidencias.push({
    fecha,
    tipo: "prueba_etapa",
    nota: `prueba de etapa: ${correctos} de ${total}${aprobada ? " — aprobada" : ""}`,
    correctos,
    total,
  });

  const actualizado: TemaDominio = {
    tema: clave,
    materia,
    estado: aprobada ? "superado" : ratio <= 0.4 ? "le_cuesta" : (previo?.estado ?? "en_proceso"),
    evidencias: evidencias.slice(-8),
    actualizadoEn: fecha,
    // aprobada: se resuelve cualquier refuerzo pendiente anterior.
    // no aprobada: queda (o se reemplaza) el pendiente con esta prueba.
    refuerzoPendiente: aprobada
      ? undefined
      : { desde: fecha, correctos, total, enunciadosFallados },
  };
  if (idx >= 0) temas[idx] = actualizado;
  else temas.push(actualizado);
  return { ...acuerdo, temas };
}

export type PreparacionPrueba = "aprendiendo" | "lista_para_prueba" | "refuerzo_tras_prueba";

// LA decisión de si corresponde ofrecer la prueba de la etapa — determinista,
// NO el criterio de Rai en la charla. La usa tanto el marcador <<PRUEBA>> (vía
// api/tutor) como el botón "Rendir la prueba" del mapa: antes cada uno hacía
// lo suyo (Rai por impresión, el mapa sin ningún chequeo), y podían
// contradecirse o dejar rendir sin ninguna base.
export function evaluarPreparacion(
  acuerdo: AcuerdoTutoria | null | undefined,
  materia: Materia,
  tema: string
): PreparacionPrueba {
  const clave = tema.trim().toLowerCase();
  const dominio = (acuerdo?.temas ?? []).find((t) => t.tema === clave && t.materia === materia);
  if (!dominio) return "aprendiendo";
  if (dominio.estado === "superado") return "lista_para_prueba"; // repetirla es libre

  // Si reprobó una prueba, exige práctica NUEVA (desde esa fecha) antes de
  // volver a habilitar el botón — evita que "inténtalo de nuevo" se vuelva
  // adivinar por repetición apenas terminada la prueba anterior.
  const desde = dominio.refuerzoPendiente?.desde;
  const acumulado = acumularEvidencia(dominio.evidencias, "ejercicios", desde);
  const ratio = acumulado.total > 0 ? acumulado.correctos / acumulado.total : 0;
  const listo = acumulado.total >= MINIMO_LISTO && ratio >= UMBRAL_LISTO;

  if (!listo) return desde ? "refuerzo_tras_prueba" : "aprendiendo";
  return "lista_para_prueba";
}

// Detecta qué temas pasaron a "superado" recién ahora (no lo estaban antes).
// Puro: compara dos listas de TemaDominio, no toca red ni estado. Se usa en
// los tres lugares donde un tema puede superarse (prueba de etapa, simulacro,
// cierre de sesión con Rai) para disparar el correo de logro sin duplicar la
// lógica de detección en cada uno.
export function temasSuperadosNuevos(
  antes: TemaDominio[] | undefined,
  despues: TemaDominio[] | undefined
): { tema: string; materia: Materia }[] {
  const previos = antes ?? [];
  const nuevos: { tema: string; materia: Materia }[] = [];
  for (const t of despues ?? []) {
    if (t.estado !== "superado") continue;
    const antesDeEste = previos.find((p) => p.tema === t.tema && p.materia === t.materia);
    if (antesDeEste?.estado !== "superado") {
      nuevos.push({ tema: t.tema, materia: t.materia });
    }
  }
  return nuevos;
}

// Evidencia dura: resultado por tema de un SIMULACRO de examen completo (varios
// temas de una materia, cronometrado, sin ayuda de Rai). Misma regla dura que
// registrarEjercicios, pero recorre el desglose tema a tema en un solo llamado.
export function registrarSimulacro(
  acuerdo: AcuerdoTutoria,
  materia: Materia,
  desglose: { tema: string; correctos: number; total: number }[],
  fecha = hoyIso()
): AcuerdoTutoria {
  let siguiente = acuerdo;
  for (const d of desglose) {
    if (d.total <= 0) continue;
    const clave = d.tema.trim().toLowerCase();
    const temas = [...(siguiente.temas ?? [])];
    const idx = temas.findIndex((x) => x.tema === clave && x.materia === materia);
    const previo = idx >= 0 ? temas[idx] : undefined;

    const evidencias = [...(previo?.evidencias ?? [])];
    evidencias.push({
      fecha,
      tipo: "simulacro",
      nota: `${d.correctos} de ${d.total} correctos en simulacro`,
    });

    const ratio = d.correctos / d.total;
    const estado: EstadoTema =
      d.total >= 4 && ratio >= 0.8 ? "superado" : ratio <= 0.4 ? "le_cuesta" : (previo?.estado ?? "en_proceso");

    const actualizado: TemaDominio = {
      tema: clave,
      materia,
      estado,
      evidencias: evidencias.slice(-8),
      actualizadoEn: fecha,
    };
    if (idx >= 0) temas[idx] = actualizado;
    else temas.push(actualizado);
    siguiente = { ...siguiente, temas };
  }
  return siguiente;
}

// Umbral del simulacro de CIERRE (mixto, toda la materia) — mismo criterio
// que la prueba de etapa, por consistencia: 80% para dar la materia por
// afirmada de verdad, no solo "cada tema por separado alguna vez".
export const UMBRAL_SIMULACRO_CIERRE = 0.8;
// Un tema individual sale "débil" en el desglose del simulacro con menos de
// esto — más laxo que le_cuesta (≤40%): el simulacro es cronometrado y mixto,
// así que un tropiezo puntual no debería mandar un tema entero a repaso.
const UMBRAL_TEMA_DEBIL_EN_SIMULACRO = 0.7;

// El simulacro DOCUMENTADO que cierra una materia (ver faseDeMateria en
// etapas.ts). `numero` lo decide quien llama (1 o 2, según en qué punto del
// ciclo esté la materia) — acuerdo.ts no conoce las etapas, así que no puede
// calcularlo solo sin crear un import circular con etapas.ts.
export function registrarSimulacroCierre(
  acuerdo: AcuerdoTutoria,
  materia: Materia,
  numero: 1 | 2,
  desglose: { tema: string; correctos: number; total: number }[],
  fecha = hoyIso()
): AcuerdoTutoria {
  // Evidencia dura por tema, igual que cualquier simulacro.
  const conEvidencia = registrarSimulacro(acuerdo, materia, desglose, fecha);

  const totalMixto = desglose.reduce((acc, d) => acc + d.total, 0);
  const correctosMixto = desglose.reduce((acc, d) => acc + d.correctos, 0);
  const aprobado = totalMixto > 0 && correctosMixto / totalMixto >= UMBRAL_SIMULACRO_CIERRE;
  const temasDebiles = desglose
    .filter((d) => d.total > 0 && d.correctos / d.total < UMBRAL_TEMA_DEBIL_EN_SIMULACRO)
    .map((d) => d.tema.trim().toLowerCase());

  const cierre: SimulacroCierre = { materia, numero, fecha, desglose, aprobado, temasDebiles };
  return {
    ...conEvidencia,
    simulacrosCierre: [...(conEvidencia.simulacrosCierre ?? []), cierre],
  };
}

// Recuperación selectiva: los recuerdos y temas que valen para la sesión de HOY.
// Prioriza la materia del día; dentro de ella, temas superados (para motivar) y
// con dificultad (para reforzar), los más recientes primero.
export function memoriaParaHoy(
  acuerdo: AcuerdoTutoria,
  materiasHoy: Materia[],
  maxTemas = 3,
  maxRecuerdos = 3,
  // El tema de la etapa que el niño está estudiando AHORA. Va primero sí o sí:
  // ordenando solo por fecha, la memoria del tema en curso podía quedar fuera
  // del corte — justo la que Rai necesita para decir "¿te acuerdas que te
  // costaban y las lograste?", que es lo que justifica tener memoria.
  temaFoco?: string
): { temas: TemaDominio[]; recuerdos: RecuerdoNino[] } {
  const enMateria = (m: Materia) => materiasHoy.length === 0 || materiasHoy.includes(m);

  const candidatos = (acuerdo.temas ?? [])
    .filter((t) => enMateria(t.materia))
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));

  const delFoco = temaFoco ? candidatos.filter((t) => t.tema === temaFoco) : [];
  const resto = candidatos.filter((t) => !delFoco.includes(t));
  const temas = [...delFoco, ...resto].slice(0, maxTemas);

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
    // Sin esto, "quedamos en repasar esto la próxima clase" era una promesa
    // que se perdía apenas terminaba la sesión: Rai no tenía forma de saber,
    // al empezar la siguiente, que había un refuerzo pendiente de una prueba
    // reprobada.
    const pendiente = t.refuerzoPendiente
      ? ` [PENDIENTE: reprobó la prueba de este tema (${t.refuerzoPendiente.correctos}/${t.refuerzoPendiente.total}) — retómalo con otro enfoque antes de sugerir la prueba de nuevo]`
      : "";
    partes.push(`${t.tema} (${t.estado})${ev ? ` [${ev}]` : ""}${pendiente}`);
  }
  for (const r of m.recuerdos) {
    partes.push(`recuerdo ${r.fecha.slice(5)}: ${r.texto}`);
  }
  return partes.join(" · ");
}
