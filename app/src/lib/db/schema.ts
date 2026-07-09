import { pgTable, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";

// --- TABLAS REQUERIDAS POR BETTER AUTH ---
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

// --- TABLAS DEL SISTEMA MEPREPARO ---
export const pupilos = pgTable("pupilos", {
  id: text("id").primaryKey(),
  cuentaId: text("cuenta_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  curso: text("curso").notNull(), // '5basico', etc.
  examenFecha: text("examen_fecha").notNull(), // ISO YYYY-MM-DD
  examenMaterias: jsonb("examen_materias").notNull().$type<string[]>(), // Lista de materias
  horasSemana: integer("horas_semana").notNull(),
  contexto: jsonb("contexto").notNull(), // intereses, estilos de aprendizaje, etc.
  diagnostico: jsonb("diagnostico"), // Resultados de diagnósticos
  tutoria: jsonb("tutoria"), // Configuración de horarios y memoria
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sesiones = pgTable("sesiones", {
  id: text("id").primaryKey(),
  pupiloId: text("pupilo_id")
    .notNull()
    .references(() => pupilos.id, { onDelete: "cascade" }),
  cuentaId: text("cuenta_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fecha: timestamp("fecha").notNull(),
  duracionMin: integer("duracion_min").notNull(),
  dia: text("dia").notNull(), // 'lun', 'mar', etc.
  materia: text("materia").notNull(),
  titulo: text("titulo").notNull(),
  resumen: text("resumen").notNull(),
  nMensajes: integer("n_mensajes").notNull(),
});

export const contenidoValidado = pgTable("contenido_validado", {
  id: text("id").primaryKey(),
  materia: text("materia").notNull(),
  curso: text("curso").notNull(),
  oa: text("oa").notNull(),
  dificultad: integer("dificultad").notNull(),
  tipo: text("tipo").notNull(), // 'ejercicio', 'explicacion'
  enunciado: text("enunciado").notNull(),
  datos: jsonb("datos"), // datos numéricos/variables
  solucionPasoAPaso: jsonb("solucion_paso_a_paso"),
  respuestaFinal: text("respuesta_final").notNull(),
  estado: text("estado").notNull(), // 'candidata' | 'validada' | 'publicada' | 'reportada'
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});

export const cacheRespuestas = pgTable("cache_respuestas", {
  id: text("id").primaryKey(),
  preguntaNormalizada: text("pregunta_normalizada").notNull(),
  materia: text("materia").notNull(),
  curso: text("curso").notNull(),
  respuesta: text("respuesta").notNull(),
  creadoEn: timestamp("creado_en").defaultNow().notNull(),
});
