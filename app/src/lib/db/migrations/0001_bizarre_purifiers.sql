CREATE TABLE "eventos" (
	"id" text PRIMARY KEY NOT NULL,
	"cuenta_id" text,
	"pupilo_id" text,
	"tipo" text NOT NULL,
	"origen" text NOT NULL,
	"materia" text,
	"meta" jsonb,
	"creado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_cuenta_id_user_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_pupilo_id_pupilos_id_fk" FOREIGN KEY ("pupilo_id") REFERENCES "public"."pupilos"("id") ON DELETE cascade ON UPDATE no action;