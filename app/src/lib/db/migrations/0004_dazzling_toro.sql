CREATE TABLE "suscripciones" (
	"cuenta_id" text PRIMARY KEY NOT NULL,
	"estado" text DEFAULT 'prueba' NOT NULL,
	"prueba_hasta" timestamp,
	"periodo_hasta" timestamp,
	"flow_orden_comercio" text,
	"flow_token" text,
	"ultimo_pago_en" timestamp,
	"cancelada_en" timestamp,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	"actualizado_en" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_cuenta_id_user_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;