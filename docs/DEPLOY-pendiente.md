# DEPLOY PENDIENTE — instrucciones para Gema

> Estado al 2026-07-27. Este despliegue trae cambios de base de datos y **dos
> pasos manuales que no se pueden saltar**. Si solo se hace `git pull` + rebuild,
> la app funciona igual pero queda a medias y sin avisar.

## Qué se está subiendo

| Cambio | Por qué importa |
|---|---|
| Telemetría de fallos (tabla `eventos`) | Hoy no hay forma de saber cuántas veces falla Rai. Los bugs los descubrimos porque las niñas los contaron. |
| Login de admin (columna `rol` en `user`) | Panel de operación en `/admin`, protegido en el servidor. |
| Caché de respuestas del tutor **eliminada** | Servía respuestas con el nombre de un niño a otro distinto. Ver paso 3. |
| No repetir la misma experiencia de juego | Dos interactivos seguidos sí, el mismo tipo no. |
| Los tres arreglos de la prueba con las niñas | Avance que se perdía, juego repetido entre sesiones, prueba imposible de aprobar. |

---

## 1. Actualizar el código

```bash
cd ~/mepreparo
git pull
```

## 2. Aplicar las migraciones (ANTES de levantar la app)

```bash
set -a; . ./.env.vps; set +a

for m in app/src/lib/db/migrations/0001_*.sql app/src/lib/db/migrations/0002_*.sql; do
  docker compose -f docker-compose.vps.yml exec -T db \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$m"
done
```

Verificar que quedaron:

```bash
docker compose -f docker-compose.vps.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt" | grep eventos

docker compose -f docker-compose.vps.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\d \"user\"" | grep rol
```

> ⚠️ Si la `0001` no se aplica, **la app NO se cae**: registrar telemetría es
> best-effort y se traga el error. La tabla queda vacía para siempre y vamos a
> creer que no hay fallos cuando en realidad no se están guardando. Es el paso
> que más fácil se olvida y el que peor se nota.

## 3. Vaciar la caché de respuestas (una sola vez, IMPORTANTE)

Esa caché guardaba el texto de Rai con la llave `(pregunta + materia + curso)`,
**sin el niño**. Como las respuestas llevan el nombre adentro, un niño podía
recibir un saludo dirigido a otra niña, junto con cosas que ella había contado
de sí misma. El código ya no la lee ni la escribe, pero las filas viejas siguen
ahí con datos personales:

```bash
docker compose -f docker-compose.vps.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "delete from cache_respuestas;"
```

La tabla se deja creada por si algún día se diseña una caché despersonalizada.

## 4. Reconstruir y levantar

```bash
docker compose -f docker-compose.vps.yml --env-file .env.vps up -d --build app
docker compose -f docker-compose.vps.yml logs -f app   # que arranque sin errores
```

## 5. Verificar

```bash
IP_PUERTO="http://144.91.88.57:8090"

curl -sI "$IP_PUERTO" | head -1        # HTTP/1.1 200

# el tutor responde con IA real (no simulado)
curl -s "$IP_PUERTO/api/tutor" -X POST -H "Content-Type: application/json" \
  -d '{"accion":"saludo","acuerdo":null,"resumenPerfil":"test","materias":["ciencias"],"horasSemana":6,"curso":"5basico","nombre":"Test"}' \
  | grep -o '"modo":"[a-z_]*"'         # debe decir "modo":"gemini"
```

- [ ] `"modo":"gemini"` (si dice `simulado`, falta la `GEMINI_API_KEY`)
- [ ] Las OTRAS apps del VPS siguen arriba: `docker ps`
- [ ] Abrir la landing en el navegador

## 6. Crear el admin (solo la primera vez)

El rol no se puede pedir al registrarse. Hay que registrarse por la app como
apoderado normal y después promoverse desde el servidor:

```bash
docker compose -f docker-compose.vps.yml exec app \
  npx tsx scripts/promover-admin.ts correo@ejemplo.cl
```

Cerrar sesión y volver a entrar para que tome el cambio. Esa cuenta entrará
directo a `/admin`.

> ⚠️ **No abrir el login de admin por la IP pública.** Sobre `http://` las
> cookies de sesión viajan sin cifrar. Para un apoderado en staging es un riesgo
> asumido; para una cuenta que ve datos de TODAS las familias, no. Mientras no
> haya dominio con HTTPS, usar un túnel:
>
> ```bash
> ssh -L 8090:localhost:8090 usuario@144.91.88.57
> # y abrir http://localhost:8090/admin
> ```

---

## Después del deploy: qué mirar

En `/admin`, a los pocos días, revisar el desglose de fallos. Si aparece
`tutor_modo_simulado` es una alarma (está respondiendo sin IA). Si la lista está
vacía **y hubo clases**, revisar el paso 2: probablemente la migración no se
aplicó.

## Cambio de costo que hay que saber

Al quitar la caché, **cada turno de conversación llama a Gemini**. En una prueba
real, 20 de 30 turnos venían de esa caché. El gasto va a subir de forma notoria.
Es el precio de que Rai le hable a cada niño y no le repita lo que le dijo a
otro; si hay que ajustar, la palanca correcta es el enrutado de modelos
(`MODELO_LITE` vs el completo), no reciclar conversaciones.

## Pendiente conocido (no bloquea)

El banco de preguntas tiene **solo 2 preguntas en varios temas**. El código ya no
castiga por eso (antes era imposible aprobar la prueba), pero llenar el banco
sigue pendiente.
