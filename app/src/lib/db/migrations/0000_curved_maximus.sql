CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apoderado_perfil" (
	"user_id" text PRIMARY KEY NOT NULL,
	"telefono" text,
	"rut" text,
	"relacion" text,
	"comuna" text,
	"region" text,
	"consentimiento_at" timestamp,
	"consentimiento_version" text,
	"perfil_completo" boolean DEFAULT false NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cache_respuestas" (
	"id" text PRIMARY KEY NOT NULL,
	"pregunta_normalizada" text NOT NULL,
	"materia" text NOT NULL,
	"curso" text NOT NULL,
	"respuesta" text NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contenido_validado" (
	"id" text PRIMARY KEY NOT NULL,
	"materia" text NOT NULL,
	"curso" text NOT NULL,
	"oa" text NOT NULL,
	"dificultad" integer NOT NULL,
	"tipo" text NOT NULL,
	"enunciado" text NOT NULL,
	"datos" jsonb,
	"solucion_paso_a_paso" jsonb,
	"respuesta_final" text NOT NULL,
	"estado" text NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"nombre_nino" text,
	"origen" text DEFAULT 'demo' NOT NULL,
	"acepta_contacto" boolean DEFAULT false NOT NULL,
	"convertido" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pupilos" (
	"id" text PRIMARY KEY NOT NULL,
	"cuenta_id" text NOT NULL,
	"nombre" text NOT NULL,
	"curso" text NOT NULL,
	"examen_fecha" text NOT NULL,
	"examen_materias" jsonb NOT NULL,
	"horas_semana" integer NOT NULL,
	"contexto" jsonb NOT NULL,
	"diagnostico" jsonb,
	"tutoria" jsonb,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" text PRIMARY KEY NOT NULL,
	"pupilo_id" text NOT NULL,
	"cuenta_id" text NOT NULL,
	"fecha" timestamp NOT NULL,
	"duracion_min" integer NOT NULL,
	"dia" text NOT NULL,
	"materia" text NOT NULL,
	"titulo" text NOT NULL,
	"resumen" text NOT NULL,
	"n_mensajes" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp,
	"updatedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apoderado_perfil" ADD CONSTRAINT "apoderado_perfil_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pupilos" ADD CONSTRAINT "pupilos_cuenta_id_user_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_pupilo_id_pupilos_id_fk" FOREIGN KEY ("pupilo_id") REFERENCES "public"."pupilos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_cuenta_id_user_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;