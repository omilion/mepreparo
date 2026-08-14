-- Rota los códigos débiles testcupon* sin reactivar una invitación que ya se
-- hubiera usado en algún entorno donde 0005 alcanzó a ejecutarse.
UPDATE "cupones_acceso"
SET "codigo_hash" = 'f19d4f3c344946f10e3fea567c9e8562fadeffa01a18d352b536a6278b30554a'
WHERE "id" = 'piloto_testcupon' AND "usado" = false;--> statement-breakpoint
UPDATE "cupones_acceso"
SET "codigo_hash" = '93211c9f7d03a198449637b058a3c314839ecb245336962c9de04ea63c84063a'
WHERE "id" = 'piloto_testcupon1' AND "usado" = false;--> statement-breakpoint
UPDATE "cupones_acceso"
SET "codigo_hash" = 'e1bc08665c3b72fa17c49406604606070cf46334cb14efa0e5b749118ec0149b'
WHERE "id" = 'piloto_testcupon13' AND "usado" = false;
