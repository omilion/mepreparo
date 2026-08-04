ALTER TABLE "apoderado_perfil" ADD COLUMN "alerta_semanal" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "apoderado_perfil" ADD COLUMN "alerta_inactividad" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "apoderado_perfil" ADD COLUMN "alerta_logro" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pupilos" ADD COLUMN "ultima_alerta_inactividad_en" timestamp;--> statement-breakpoint
ALTER TABLE "pupilos" ADD COLUMN "ultimo_resumen_semanal_en" timestamp;