# PLAN — Deploy de mepreparo al VPS (para Gema)

> Objetivo: dejar la app corriendo en producción en el VPS, con HTTPS, sobre un
> dominio, con la BD Postgres persistente y backups. Todo el andamiaje ya está
> en el repo y verificado localmente. Este documento es el checklist ejecutable.
>
> Estado verificado al escribirlo (2026-07-12):
> - `npm run build` con `output: standalone` funciona → `.next/standalone/server.js` (23MB).
> - `docker-compose.prod.yml`, `app/Dockerfile`, `Caddyfile`, `.env.prod.example` en el repo.
> - better-auth ya lee `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `trustedOrigins`.
> - El RAG lee su archivo por `RAG_CHUNKS_PATH` (volumen), no de una ruta fija.

---

## 0. Prerrequisitos que aporta el humano (NO Gema)
- [ ] Un **VPS** (Ubuntu 22.04+ recomendado) con acceso SSH y Docker + Docker Compose instalados.
- [ ] Un **dominio** (ej. `mepreparo.cl`) con un **A record** apuntando a la IP del VPS.
- [ ] Una **API key de Gemini de PRODUCCIÓN** nueva (NO la de pruebas que se expuso en el chat).
- [ ] Los puertos 80 y 443 abiertos en el firewall del VPS.

## 1. Subir el código
```bash
# en el VPS
git clone https://github.com/omilion/mepreparo.git
cd mepreparo
```

## 2. El archivo del RAG (¡NO viaja con git!)
`base-documental/_rag/chunks.jsonl` (~125MB, con embeddings gemini-embedding-2)
está gitignored. Hay que ponerlo en el VPS a mano, en esa misma ruta:
```bash
# desde la máquina que tiene el archivo (ej. el PC del dev):
scp base-documental/_rag/chunks.jsonl usuario@IP_VPS:~/mepreparo/base-documental/_rag/chunks.jsonl
```
- Verificar que llegó completo: `ls -la base-documental/_rag/chunks.jsonl` (~125MB)
  y `head -c 200 base-documental/_rag/chunks.jsonl` (debe verse JSON con "embedding").
- Alternativa (más lenta): regenerarlo en el VPS con
  `GEMINI_API_KEY=... python base-documental/_rag/upgrade_embeddings.py`
  (requiere los PDFs y los chunks base, que también están gitignored → mejor scp).

## 3. Secretos de producción
```bash
cp .env.prod.example .env.prod
# editar .env.prod y rellenar TODO:
```
- `DOMINIO` = el dominio sin https (ej. `mepreparo.cl`)
- `NEXT_PUBLIC_APP_URL` = con https (ej. `https://mepreparo.cl`)
- `POSTGRES_PASSWORD` = `openssl rand -base64 24`
- `GEMINI_API_KEY` = la key de producción nueva
- `DIAG_HMAC_SECRET` = `openssl rand -hex 32`
- `BETTER_AUTH_SECRET` = `openssl rand -hex 32`  (otro distinto)

⚠️ `.env.prod` NUNCA se commitea (ya está en .gitignore). Verificar: `git check-ignore .env.prod` debe imprimir `.env.prod`.

## 4. Levantar todo
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
Esto construye la imagen de la app, levanta Postgres (pgvector), Caddy (que
saca el certificado HTTPS solo) y el backup diario.

## 5. Crear el esquema de la BD (primera vez)
Las tablas (better-auth + mepreparo) se crean con drizzle. Desde el VPS:
```bash
# entrar al contenedor de la app o correr drizzle-kit apuntando a la BD:
docker compose -f docker-compose.prod.yml exec app sh -c \
  'DATABASE_URL="postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@db:5432/$POSTGRES_DB" npx drizzle-kit push --force'
```
> Nota: el standalone no trae drizzle-kit. Alternativa robusta: exportar el
> esquema como SQL una vez (`npx drizzle-kit generate`) y aplicarlo con
> `psql`. Ver §Notas.

## 6. Verificar
- [ ] `https://tu-dominio` responde 200 y muestra la landing.
- [ ] Registro de un apoderado de prueba funciona (crea sesión).
- [ ] El tutor responde en modo `gemini` (no `simulado`) → confirma que la key y el RAG cargan.
  ```bash
  curl -s https://tu-dominio/api/tutor -X POST -H "Content-Type: application/json" \
    -d '{"accion":"saludo","acuerdo":null,"resumenPerfil":"test","materias":["matematica"],"horasSemana":6,"nombre":"Test"}' | grep -o '"modo":"[a-z]*"'
  ```
- [ ] Logs sin errores: `docker compose -f docker-compose.prod.yml logs -f app`

---

## Notas y gotchas conocidos
- **Migraciones**: si `drizzle-kit push` desde el contenedor da problemas
  (no está en la imagen standalone), correr drizzle-kit desde una copia del
  repo con node instalado, apuntando `DATABASE_URL` al Postgres del VPS
  (exponiendo el puerto 5432 temporalmente solo para la migración, luego cerrar).
- **El archivo del RAG cambia**: si se regeneran embeddings, hay que volver a
  copiar el chunks.jsonl al VPS y reiniciar `app` (`docker compose ... restart app`).
- **Rate limiting / abuso**: aún NO hay límite en `/api/tutor` ni `/api/demo/*`.
  Con la app pública, alguien podría quemar la cuota de Gemini. Recomendado
  añadir rate limit por IP antes de difundir la URL (pendiente, no bloquea el deploy).
- **Better-auth cookies**: requieren HTTPS en producción. Caddy ya lo da; si se
  prueba por IP sin dominio, el login fallará (es esperado).
- **Backups**: el servicio `backup` deja dumps en `./backups` cada 24h y borra
  los de +7 días. Considerar sincronizarlos fuera del VPS.
