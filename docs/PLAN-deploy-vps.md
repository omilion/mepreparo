# PLAN — Deploy de mepreparo al VPS por SSH (para Gema)

> Gema hace TODO por SSH en el VPS, de principio a fin. Esto es una secuencia
> ejecutable: cada bloque es para pegar en la terminal SSH del VPS (salvo el
> paso 2, que se corre desde la máquina que tiene el archivo del RAG).
>
> Estado verificado (2026-07-12): build standalone OK (`server.js` 23MB),
> 56 tests verdes. Infra en el repo: `docker-compose.prod.yml`, `app/Dockerfile`,
> `Caddyfile`, `.env.prod.example`, y el SQL del esquema en
> `app/src/lib/db/migrations/0000_*.sql` (10 tablas).

---

## 0. Prerrequisitos (los aporta el humano, una sola vez)
- VPS Ubuntu 22.04+ con **Docker + Docker Compose** instalados y acceso SSH.
- **Dominio** con un **A record** apuntando a la IP del VPS (ej. `mepreparo.cl`).
- **API key de Gemini de PRODUCCIÓN** nueva (NO la de pruebas expuesta en el chat).
- Puertos **80 y 443** abiertos en el firewall.

Verificar Docker en el VPS antes de empezar:
```bash
docker --version && docker compose version
```

## 1. Clonar el repo (en el VPS)
```bash
cd ~
git clone https://github.com/omilion/mepreparo.git
cd mepreparo
```

## 2. Transferir el archivo del RAG (NO viaja con git)
`base-documental/_rag/chunks.jsonl` (~125MB, embeddings gemini-embedding-2) está
gitignored. Copiarlo por scp/rsync **desde la máquina que lo tiene** al VPS:
```bash
# correr esto en la máquina origen (el PC del dev), NO en el VPS:
rsync -avz --progress \
  base-documental/_rag/chunks.jsonl \
  USUARIO@IP_VPS:~/mepreparo/base-documental/_rag/chunks.jsonl
```
Verificar en el VPS que llegó completo:
```bash
ls -la base-documental/_rag/chunks.jsonl        # ~125MB
head -c 120 base-documental/_rag/chunks.jsonl   # debe verse JSON con "embedding"
```

## 3. Crear los secretos de producción (en el VPS)
```bash
cp .env.prod.example .env.prod
# generar los secretos y anotarlos:
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "DIAG_HMAC_SECRET=$(openssl rand -hex 32)"
echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)"
# editar .env.prod con nano y rellenar TODO:
nano .env.prod
```
Rellenar en `.env.prod`:
- `DOMINIO=mepreparo.cl`            (sin https)
- `NEXT_PUBLIC_APP_URL=https://mepreparo.cl`   (con https)
- `POSTGRES_PASSWORD=` … (el generado arriba)
- `GEMINI_API_KEY=` … (la key de producción nueva)
- `GEMINI_MODEL=gemini-3.5-flash`
- `DIAG_HMAC_SECRET=` … (el generado)
- `BETTER_AUTH_SECRET=` … (el otro generado)

Confirmar que no se filtra: `git check-ignore .env.prod` → debe imprimir `.env.prod`.

## 4. Levantar Postgres primero (para migrar antes que arranque la app)
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d db
# esperar a que esté healthy:
docker compose -f docker-compose.prod.yml ps
```

## 5. Crear el esquema de la BD (SQL, sin drizzle-kit)
El esquema completo (10 tablas: user/session/account/verification de better-auth +
pupilos/sesiones/apoderado_perfil/leads/contenido_validado/cache_respuestas) está
en el repo. Aplicarlo con psql dentro del contenedor de Postgres:
```bash
# carga el .env.prod para tener las credenciales
set -a; . ./.env.prod; set +a

docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < app/src/lib/db/migrations/0000_*.sql

# verificar que las 10 tablas existen:
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"
```

## 6. Construir y levantar la app + Caddy + backups
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
Caddy sacará el certificado HTTPS solo (puede tardar ~30s la primera vez).
Ver que todo quede arriba:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app   # Ctrl-C para salir
```

## 7. Verificar el deploy
```bash
# 1. la landing responde
curl -sI https://$DOMINIO | head -1        # HTTP/2 200

# 2. el tutor responde con IA real (modo gemini) → confirma key + RAG cargados
curl -s https://$DOMINIO/api/tutor -X POST -H "Content-Type: application/json" \
  -d '{"accion":"saludo","acuerdo":null,"resumenPerfil":"test","materias":["matematica"],"horasSemana":6,"nombre":"Test"}' \
  | grep -o '"modo":"[a-z]*"'              # debe decir "modo":"gemini"
```
- [ ] Abrir `https://tu-dominio` en el navegador → landing.
- [ ] Registrar un apoderado de prueba → debe crear sesión (login funciona con HTTPS).
- [ ] `modo":"gemini"` en el curl → key y RAG OK. Si dice `simulado`: revisar
      `GEMINI_API_KEY` y que el volumen del chunks.jsonl esté montado
      (`docker compose -f docker-compose.prod.yml exec app ls -la /data/rag/`).

---

## Comandos útiles (operación)
```bash
# ver logs
docker compose -f docker-compose.prod.yml logs -f app
# reiniciar solo la app (ej. tras actualizar el chunks.jsonl)
docker compose -f docker-compose.prod.yml restart app
# actualizar código: git pull + rebuild
git pull && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build app
# backups: quedan en ./backups (dump diario, borra +7 días automáticamente)
ls -la backups/
```

## Gotchas conocidos
- **Login por IP (sin dominio) falla**: better-auth requiere HTTPS; Caddy lo da
  solo con dominio. Probar siempre por el dominio, no por la IP.
- **RATE LIMITING pendiente**: `/api/tutor` y `/api/demo/*` no tienen límite aún.
  Con la URL pública, alguien podría quemar la cuota de Gemini. Añadir antes de
  difundir la URL ampliamente (no bloquea el primer deploy de prueba).
- **Actualizar embeddings**: si se regenera el chunks.jsonl, volver a copiarlo
  (paso 2) y `restart app`.
- **Migraciones futuras**: si el esquema cambia, generar el nuevo SQL con
  `npx drizzle-kit generate` en el repo y aplicar el archivo nuevo con el mismo
  método del paso 5.
