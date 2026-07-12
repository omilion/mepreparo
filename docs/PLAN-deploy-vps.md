# PLAN — Deploy de PRUEBA de mepreparo a un VPS COMPARTIDO (para Gema)

> ⚠️ EL VPS YA TIENE OTRAS APPS Y DOMINIOS CORRIENDO. No se debe estropear nada
> de eso. mepreparo va AISLADO en un puerto alto libre, SIN tocar 80/443, SIN
> Caddy, con nombres y red propios (prefijo mepreparo_). Se accede por
> `http://IP_DEL_VPS:PUERTO`. Todavía NO hay dominio.
>
> Gema hace TODO por SSH. Secuencia ejecutable de arriba a abajo (salvo el
> paso 3, que corre desde la máquina que tiene el archivo del RAG).
>
> Usa `docker-compose.vps.yml` + `.env.vps` (NO el docker-compose.prod.yml, que
> es para cuando haya dominio+HTTPS). Estado verificado (2026-07-12): build
> standalone OK (server.js 23MB), 56 tests, SQL del esquema aplica limpio.

---

## 0. Prerrequisitos (el humano)
- VPS con **Docker + Docker Compose** y acceso SSH (ya lo tienes: hay apps corriendo).
- **API key de Gemini de PRODUCCIÓN** nueva (NO la de pruebas expuesta en el chat).

## 1. RECONOCIMIENTO — no romper lo existente (PRIMERO, en el VPS)
Antes de tocar nada, ver qué corre y qué puertos están ocupados:
```bash
docker --version && docker compose version
echo "--- contenedores actuales (NO tocar) ---"
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
echo "--- puertos en uso ---"
ss -tlnp | awk '{print $4}' | grep -oE ':[0-9]+$' | sort -u
```
Elegir un **puerto alto LIBRE** para mepreparo (ej. 8090, 8091, 3100…): que NO
aparezca en la lista de puertos en uso, y NO sea 80/443. Ese valor va en
`APP_PORT` (paso 4). Confirmar que está libre:
```bash
ss -tlnp | grep ':8090' && echo "OCUPADO, elegir otro" || echo "8090 libre"
```
> Nota: `docker-compose.vps.yml` NO publica el puerto de Postgres al host y usa
> una red propia `mepreparo_net`, así que no colisiona con otras apps ni con otro
> Postgres que pueda existir.

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

## 4. Crear los secretos (en el VPS)
```bash
cp .env.vps.example .env.vps
# generar los secretos:
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "DIAG_HMAC_SECRET=$(openssl rand -hex 32)"
echo "BETTER_AUTH_SECRET=$(openssl rand -hex 32)"
nano .env.vps
```
Rellenar en `.env.vps`:
- `APP_PORT=8090`   (el puerto LIBRE elegido en el paso 1)
- `NEXT_PUBLIC_APP_URL=http://IP_DEL_VPS:8090`  (IP real del VPS + el puerto)
- `POSTGRES_PASSWORD=` … (el generado)
- `GEMINI_API_KEY=` … (la key de producción nueva)
- `GEMINI_MODEL=gemini-3.5-flash`
- `DIAG_HMAC_SECRET=` … / `BETTER_AUTH_SECRET=` … (los generados)

Confirmar que no se filtra: `git check-ignore .env.vps` → debe imprimir `.env.vps`.

## 5. Levantar Postgres primero (para migrar antes que arranque la app)
```bash
docker compose -f docker-compose.vps.yml --env-file .env.vps up -d db
docker compose -f docker-compose.vps.yml ps      # esperar db "healthy"
```

## 6. Crear el esquema de la BD (SQL, probado — aplica limpio)
Las 10 tablas (better-auth + mepreparo) vienen en el repo como SQL. Aplicar con
psql dentro del contenedor de Postgres:
```bash
set -a; . ./.env.vps; set +a

docker compose -f docker-compose.vps.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < app/src/lib/db/migrations/0000_*.sql

# verificar las 10 tablas:
docker compose -f docker-compose.vps.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"
```

## 7. Construir y levantar la app + backups (SIN Caddy, SIN 80/443)
```bash
docker compose -f docker-compose.vps.yml --env-file .env.vps up -d --build
docker compose -f docker-compose.vps.yml ps
docker compose -f docker-compose.vps.yml logs -f app   # Ctrl-C para salir
```

## 8. Verificar (por IP:puerto, http)
```bash
set -a; . ./.env.vps; set +a
IP_PUERTO=$(echo "$NEXT_PUBLIC_APP_URL")

# 1. la landing responde
curl -sI "$IP_PUERTO" | head -1        # HTTP/1.1 200

# 2. el tutor responde con IA real (modo gemini) → confirma key + RAG cargados
curl -s "$IP_PUERTO/api/tutor" -X POST -H "Content-Type: application/json" \
  -d '{"accion":"saludo","acuerdo":null,"resumenPerfil":"test","materias":["matematica"],"horasSemana":6,"nombre":"Test"}' \
  | grep -o '"modo":"[a-z]*"'          # debe decir "modo":"gemini"
```
- [ ] Abrir `http://IP_DEL_VPS:8090` en el navegador → landing.
- [ ] Probar demo, tutor, mapa (NO necesitan login).
- [ ] `modo":"gemini"` → key y RAG OK. Si dice `simulado`: revisar `GEMINI_API_KEY`
      y que el volumen del chunks esté montado
      (`docker compose -f docker-compose.vps.yml exec app ls -la /data/rag/`).
- [ ] IMPORTANTE: confirmar que las OTRAS apps del VPS siguen intactas
      (`docker ps` — que sigan Up; abrir sus dominios).

---

## Comandos útiles (operación)
```bash
docker compose -f docker-compose.vps.yml logs -f app
docker compose -f docker-compose.vps.yml restart app          # tras actualizar el chunks
git pull && docker compose -f docker-compose.vps.yml --env-file .env.vps up -d --build app
docker compose -f docker-compose.vps.yml down                 # apagar SOLO mepreparo
ls -la backups/                                               # dumps diarios
```

## Gotchas conocidos
- **Login del apoderado sobre http (IP)**: funciona en este deploy de PRUEBA
  porque `auth.ts` desactiva las cookies "Secure" cuando la URL es http
  (useSecureCookies=false). ES SOLO PARA STAGING — inseguro para usuarios reales.
  Con dominio+HTTPS (docker-compose.prod.yml) vuelve a ser seguro automáticamente.
- **NO tocar 80/443**: este compose no los usa. Si alguna vez se quiere HTTPS,
  se hace enganchando mepreparo al proxy que YA existe en el VPS (apuntándolo a
  http://localhost:APP_PORT), no levantando otro Caddy.
- **RATE LIMITING pendiente**: `/api/tutor` y `/api/demo/*` no tienen límite. No
  difundir la URL ampliamente hasta añadirlo (alguien podría quemar la cuota Gemini).
- **Actualizar embeddings**: re-copiar el chunks.jsonl (paso 3) y `restart app`.
- **Cuando haya dominio**: migrar a `docker-compose.prod.yml` (trae Caddy+HTTPS)
  o enganchar al proxy existente; cambiar NEXT_PUBLIC_APP_URL a https://dominio.

## Cuando tengas dominio (futuro)
El repo también trae `docker-compose.prod.yml` + `Caddyfile` + `.env.prod.example`
para el deploy CON dominio y HTTPS propio. Pero si el VPS ya tiene un proxy
central, lo correcto es NO usar ese Caddy y en cambio añadir un `server`/`site`
en el proxy existente que apunte a `http://localhost:APP_PORT`.
