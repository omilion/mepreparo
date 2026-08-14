CREATE TABLE "cupones_acceso" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo_hash" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"limite_pupilos" integer DEFAULT 3 NOT NULL,
	"canjeado_por" text,
	"canjeado_en" timestamp,
	"creado_en" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cupones_acceso_codigo_hash_unique" UNIQUE("codigo_hash"),
	CONSTRAINT "cupones_acceso_canjeado_por_unique" UNIQUE("canjeado_por")
);
--> statement-breakpoint
ALTER TABLE "suscripciones" ADD COLUMN "cupon_id" text;--> statement-breakpoint
ALTER TABLE "suscripciones" ADD COLUMN "limite_pupilos" integer;--> statement-breakpoint
ALTER TABLE "cupones_acceso" ADD CONSTRAINT "cupones_acceso_canjeado_por_user_id_fk" FOREIGN KEY ("canjeado_por") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_cupon_id_cupones_acceso_id_fk" FOREIGN KEY ("cupon_id") REFERENCES "public"."cupones_acceso"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "cupones_acceso" ("id", "codigo_hash", "limite_pupilos")
VALUES
  ('piloto_testcupon', 'f19d4f3c344946f10e3fea567c9e8562fadeffa01a18d352b536a6278b30554a', 3),
  ('piloto_testcupon1', '93211c9f7d03a198449637b058a3c314839ecb245336962c9de04ea63c84063a', 3),
  ('piloto_testcupon13', 'e1bc08665c3b72fa17c49406604606070cf46334cb14efa0e5b749118ec0149b', 3)
ON CONFLICT ("id") DO NOTHING;
