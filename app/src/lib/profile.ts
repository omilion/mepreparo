// Modelo de perfil del niño — la APP lo mantiene (no la IA).
// Es la fuente de verdad para diagnóstico, plan y tutor.
// Ver docs/ARQUITECTURA-tecnica.md §4.

import type { AcuerdoTutoria } from "@/lib/tutor/acuerdo";

export type Materia =
  | "matematica"
  | "lenguaje"
  | "ciencias"
  | "historia"
  | "ingles";

export const MATERIAS: { id: Materia; label: string }[] = [
  { id: "matematica", label: "Matemática" },
  { id: "lenguaje", label: "Lenguaje" },
  { id: "ciencias", label: "Ciencias" },
  { id: "historia", label: "Historia" },
  { id: "ingles", label: "Inglés" },
];

export type Curso =
  | "1basico"
  | "2basico"
  | "3basico"
  | "4basico"
  | "5basico"
  | "6basico"
  | "7basico"
  | "8basico";

export const CURSOS: { id: Curso; label: string }[] = [
  { id: "1basico", label: "1° básico" },
  { id: "2basico", label: "2° básico" },
  { id: "3basico", label: "3° básico" },
  { id: "4basico", label: "4° básico" },
  { id: "5basico", label: "5° básico" },
  { id: "6basico", label: "6° básico" },
  { id: "7basico", label: "7° básico" },
  { id: "8basico", label: "8° básico" },
];

// Opciones de contexto que dan personalidad al tutor (setup del padre).
export const INTERESES = [
  "Animales",
  "Dibujo",
  "Deportes",
  "Música",
  "Ciencia",
  "Historias y cuentos",
  "Videojuegos",
  "Naturaleza",
] as const;

export const ESTILOS_APRENDIZAJE = [
  "Ejemplos visuales",
  "Paso a paso",
  "Con juegos",
  "Explicaciones cortas",
] as const;

export interface DiagnosticoMateria {
  // 0..1 — nivel estimado tras el diagnóstico adaptativo (Fase 2)
  nivel: number;
  // Objetivos/temas donde se detectaron brechas
  brechas: string[];
}

export interface PerfilNino {
  id: string;
  nombre: string;
  curso: Curso;
  examen: {
    fecha: string; // ISO yyyy-mm-dd
    materias: Materia[];
  };
  disponibilidad: {
    horasSemana: number;
  };
  contexto: {
    intereses: string[];
    estilos: string[]; // cómo aprende mejor
    notas?: string;
  };
  // Se llena en Fase 2 (diagnóstico). Vacío al crear el perfil.
  diagnostico?: Partial<Record<Materia, DiagnosticoMateria>>;
  // Memoria del tutor: se crea en la primera charla con Rai. Vacío hasta entonces.
  tutoria?: AcuerdoTutoria;
  creadoEn: string; // ISO
}

// Perfil vacío con valores por defecto sensatos para el formulario.
export function nuevoPerfil(nombre = ""): PerfilNino {
  return {
    id: crearId(),
    nombre,
    curso: "5basico",
    examen: { fecha: "", materias: [] },
    disponibilidad: { horasSemana: 6 },
    contexto: { intereses: [], estilos: [] },
    creadoEn: new Date().toISOString(),
  };
}

// La cuenta del apoderado: es el DUEÑO/admin. Contiene los perfiles de sus
// hijos (pupilos). El apoderado configura y ve progreso; el niño solo estudia.
export interface Cuenta {
  id: string;
  creadaEn: string;
  // datos del apoderado (mínimos por ahora; email para futura sincronización)
  apoderado?: { nombre?: string; email?: string };
  pupilos: PerfilNino[];
}

export function nuevaCuenta(pupilos: PerfilNino[] = []): Cuenta {
  return { id: crearId(), creadaEn: new Date().toISOString(), pupilos };
}

// ¿El perfil ya pasó por el wizard? (tiene lo mínimo para diagnosticar)
export function configuracionCompleta(p: PerfilNino): boolean {
  return perfilEsValido(p);
}

// ¿Ya se hizo el diagnóstico de este niño?
export function tieneDiagnostico(p: PerfilNino): boolean {
  return !!p.diagnostico && Object.keys(p.diagnostico).length > 0;
}

export function crearId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2, 10);
}

// --- Validación del setup del padre ---
// La calidad de esta configuración calibra todo (diagnóstico → plan → tutor),
// por eso validamos con cuidado antes de continuar.

export interface ErroresPerfil {
  nombre?: string;
  materias?: string;
  fecha?: string;
  horasSemana?: string;
}

export function validarPerfil(p: PerfilNino): ErroresPerfil {
  const e: ErroresPerfil = {};

  if (!p.nombre.trim()) {
    e.nombre = "Escribe el nombre de quien va a estudiar.";
  }

  if (p.examen.materias.length === 0) {
    e.materias = "Elige al menos una materia del examen.";
  }

  if (!p.examen.fecha) {
    e.fecha = "Indica la fecha del examen.";
  } else {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(p.examen.fecha + "T00:00:00");
    if (Number.isNaN(fecha.getTime())) {
      e.fecha = "La fecha no es válida.";
    } else if (fecha < hoy) {
      e.fecha = "La fecha del examen ya pasó. Revisa el año.";
    }
  }

  if (p.disponibilidad.horasSemana < 1 || p.disponibilidad.horasSemana > 40) {
    e.horasSemana = "Indica un número de horas realista (1 a 40).";
  }

  return e;
}

export function perfilEsValido(p: PerfilNino): boolean {
  return Object.keys(validarPerfil(p)).length === 0;
}

// Días que faltan para el examen (útil para el plan y el home).
export function diasHastaExamen(fechaIso: string): number | null {
  if (!fechaIso) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(fechaIso + "T00:00:00");
  if (Number.isNaN(fecha.getTime())) return null;
  const ms = fecha.getTime() - hoy.getTime();
  return Math.round(ms / 86_400_000);
}
