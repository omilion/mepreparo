# PLAN — mepreparo al siguiente nivel

> Estado al escribirlo (2026-07-09): Fases 1–4 construidas y funcionando
> (setup padre → diagnóstico adaptativo → plan → tutor Rai con Gemini real).
> Repo: https://github.com/omilion/mepreparo · Billing Gemini activo (Nivel 1,
> tope CLP 5.000/mes) → embeddings reales DESBLOQUEADOS.
>
> Este plan ordena el trabajo en 4 fases (A→D). Cada ítem tiene: qué, cómo,
> criterio de aceptación (CA) y quién (nosotros / Gema / usuario).

---

## FASE A — Fundamentos (primero: el corazón del producto)

### A1. Memoria completa de Rai — PRIORIDAD MÁXIMA
La memoria es la base del producto. Hoy Rai guarda el horario pero NO registra
las sesiones. Cada **sesión de estudio** debe quedar con metadatos:

```ts
interface SesionTutoria {
  fecha: string;        // ISO datetime de inicio
  duracionMin: number;  // duración real de la sesión
  dia: Dia;             // lun..dom
  materia: Materia;     // asignatura trabajada
  titulo: string;       // ej. "Suma de fracciones con distinto denominador"
  resumen: string;      // 1-3 frases: qué se hizo, dónde quedó, qué reforzar
  nMensajes: number;    // largo de la interacción (métrica de costo/uso)
}
```

**Cómo:**
1. `Tutor.tsx` marca `inicioSesion = Date.now()` al montar.
2. Al salir (`onVolver`) con ≥2 turnos del niño: llamada a `/api/tutor` con
   `accion: "cerrar"` → Gemini (flash-lite, barato) genera `titulo` + `resumen`
   usando `PROMPT_RESUMIR_SESION` (ya existe, nunca se invocó) + los últimos
   turnos. Se calcula `duracionMin` y se hace push a `perfil.tutoria.sesiones`.
3. Fallback si la llamada falla: guardar sesión con `titulo`/`resumen`
   genéricos ("Sesión de {materia}") — NUNCA perder la sesión.
4. `notasNino`: en el mismo cierre, pedir a Gemini (misma llamada, mismo JSON)
   una línea de "aprendizajes sobre el niño" y **fusionarla** con las notas
   existentes (cap ~400 chars para no inflar el prompt).
5. Vista padre: `PanelHijos` ya muestra horario; añadir "última sesión" y un
   historial (fecha · título · duración) al tocar la tarjeta → esto ES la
   página de progreso del padre (D2 la amplía).

**CA:** entrar al tutor, conversar 3 turnos, salir → en localStorage queda la
sesión con los 7 campos; al volver otro día Rai la menciona. — **Nosotros**

### A2. Respuestas del diagnóstico al servidor (problema #8)
Hoy `banco.json` (con el campo `correcta`) viaja al navegador: se puede ver la
respuesta con DevTools y pesa 294KB en el bundle.

**Solución propuesta:** mover el banco al servidor.
- `GET /api/diagnostico/pregunta?materia&curso&dificultad&excluir=ids` →
  devuelve la pregunta **sin** `correcta`, con opciones ya barajadas y un
  `token` = HMAC(preguntaId + orden barajado + secreto del servidor). Sin
  estado en el server (stateless), no requiere BD.
- `POST /api/diagnostico/responder {preguntaId, indice, token}` → el server
  verifica el HMAC y responde `{acierto: boolean, indiceCorrecto}`.
- El motor adaptativo NO se toca: sigue en el cliente, solo necesita el
  booleano de acierto (que ya es lo único que usa).

**CA:** en la pestaña Network no aparece nunca el campo `correcta`; el bundle
pierde ~294KB; el diagnóstico funciona igual. — **Nosotros**

### A3. Tests automatizados + CI (puntos #5 y #7)
Automatizar los necesarios: los motores puros (funciones sin UI, baratas de
testear y donde un bug es silencioso).

- **Vitest** en `app/`: `diagnostico/motor` (sube/baja dificultad, criterio de
  parada, nivel 0..1 con casos bueno/medio/malo), `barajarOpciones`
  (uniformidad de posiciones e integridad), `plan/motor` (veredictos
  holgura/justo/apretado), `tutor/acuerdo` (diaDeHoy, materiasDeHoy),
  `separarHorario` del route (parse, saneo de materias inválidas, JSON roto).
- **GitHub Actions**: `npm test` + `tsc --noEmit` + `next build` en cada push
  (ya tenemos repo). Badge en README.

**CA:** `npm test` verde local y en Actions; un cambio que rompa el motor hace
fallar el CI. — **Nosotros** (Gema puede ampliar casos después)

### A4. Embeddings reales (desbloqueado por billing)
El script `base-documental/_rag/upgrade_embeddings.py` ya existe; la cuota ya
no es problema. Correr con la key nueva → `text-embedding-004` sobre los 9.899
chunks; validar con la prueba de sinónimos del plan
`PLAN-reembeddings-gemini.md`. Después, cambiar `rag.ts` de solapamiento de
términos a similitud vectorial (la interfaz `recuperar()` no cambia).
Costo estimado: centavos de dólar (embeddings son ~100x más baratos que
generación).

**CA:** buscar "repartir una pizza en partes iguales" recupera chunks de
fracciones. — **Usuario corre el script** (o Gema); nosotros el cambio en rag.ts

---

## FASE B — Cuentas y datos (Supabase)

**Decisión Supabase vs Docker:** Supabase para producción. Es Postgres
gestionado + Auth incluida + pgvector + Row Level Security + tier gratis, cero
administración. Docker requeriría un VPS 24/7 pagado y administrado a mano, y
construir el login desde cero. Sin lock-in real: es Postgres estándar
(`pg_dump` y te vas cuando quieras). Docker queda como opción de Postgres
LOCAL para desarrollo si se quiere trabajar offline.

### B1. Inscripción del apoderado (punto nuevo del usuario)
Hoy el onboarding parte directo con los niños; falta el registro del padre.

- **Registro**: email + contraseña (Supabase Auth; magic link como alternativa
  sin contraseña). Nombre del apoderado. El flujo actual pasa a ser:
  registro padre → registrar pupilos (ya existe) → wizard (ya existe).
- **Página "Mi cuenta"**: datos del apoderado (editar nombre/email), lista de
  pupilos con su estado, horarios acordados, y sección **suscripción/medios de
  pago** — en esta fase solo la ESTRUCTURA (plan actual: "beta gratuita"); la
  pasarela real es D3.
- El modelo `Cuenta` ya tiene `apoderado?: {nombre, email}` — se completa y
  pasa a ser obligatorio al registrarse.

**CA:** un padre nuevo se registra con email, crea 2 pupilos, cierra el
navegador, entra desde OTRO dispositivo y ve todo. — **Nosotros**

### B2. Migración de datos: localStorage → Supabase (offline-first)
`storage.ts` ya está aislado a propósito — se cambia el adaptador sin tocar
pantallas:
- Tablas: `cuentas` (1:1 auth.users), `pupilos` (jsonb del perfil + columnas
  indexables: curso, fecha_examen), `sesiones` (las de A1, fila por sesión).
- **RLS**: cada apoderado solo lee/escribe sus filas (crítico: datos de niños).
- Estrategia: escribir SIEMPRE local primero (la app nunca se bloquea sin
  internet) y sincronizar a Supabase en background con `updatedAt` como
  resolución de conflictos (gana el más reciente).
- Migración suave: al iniciar sesión por primera vez, si hay cuenta local, se
  sube y se marca migrada.

**CA:** modo avión → la app funciona; vuelve internet → sincroniza solo.
— **Nosotros** (es la pieza más grande del plan)

---

## FASE C — Economía de escala (que cada sesión sea muy barata)

Objetivo explícito del usuario: **ahorrar manteniendo una interacción natural,
que se sienta el tutor**. La estrategia es que la IA "en vivo" sea el último
recurso, no el primero:

```
pregunta del niño
  → 1) ¿está en la BIBLIOTECA COMPARTIDA validada?  → responder (0 tokens)
  → 2) ¿está en el CACHÉ de respuestas similares?   → responder (0 tokens)
  → 3) Gemini flash-lite (charla, ánimo, transición) → barato
  → 4) Gemini flash (explicación nueva, con RAG)     → caro, la excepción
       └→ lo bueno que genera pasa por el CHECKER y entra a la biblioteca
```

### C1. Checker + biblioteca compartida de contenido validado (idea del usuario)
El problema real: la IA puede inventar un ejercicio irresoluble o con la
respuesta mala. Y cada generación cuesta. La solución del usuario es correcta
y la refinamos así:

- **Generación estructurada**: cuando Rai crea un ejercicio/ejemplo/mini-clase,
  Gemini lo emite en JSON: `{enunciado, datos, solucionPasoatPaso,
  respuestaFinal, materia, curso, oa, dificultad, tipo}`.
- **Checker en 2 niveles**:
  1. **Determinista (matemática)**: el server RE-RESUELVE numéricamente la
     respuesta a partir de los datos (evaluación aritmética con código, no con
     otra IA). Si `respuestaFinal` no cuadra con la re-solución → se descarta.
     Es el checker más barato y el único 100% confiable para números.
  2. **Crítico IA (lenguaje/historia/ciencias, no verificable con código)**:
     una segunda pasada con flash-lite y prompt de auditor ("¿es correcto según
     este contexto del currículum? ¿la pregunta tiene UNA respuesta clara?") +
     el chunk RAG como fuente de verdad. Solo aprueba con veredicto explícito.
- **Estados**: `candidata → validada → publicada` (+ `reportada` si un padre
  marca un error — botón de reporte en la UI, humano en el circuito).
- **Biblioteca compartida** (tabla `contenido_validado` en Supabase, B2):
  indexada por materia+curso+oa+dificultad. **Compartida entre TODOS los
  usuarios**: lo que se validó para un niño de 5° sirve a todos los de 5°.
  El costo de generar se paga UNA vez por contenido, no por niño. A más
  usuarios, MENOR costo marginal por sesión — la economía se invierte a favor.

**CA:** generar 20 ejercicios de fracciones → los que tienen respuesta mala se
descartan solos; un segundo niño que pide lo mismo recibe de biblioteca con
latencia <200ms y 0 tokens. — **Diseño nosotros; generación masiva la corre Gema**

### C2. Caché de respuestas del tutor
Hash de (pregunta normalizada + materia + curso) → respuesta previa. Guarda en
Supabase con TTL largo. Cubre el "¿qué es una fracción?" que preguntan todos.
**CA:** repetir una pregunta típica no llama a Gemini. — **Nosotros**

### C3. Enrutado de modelos + presupuesto por sesión
- flash-lite para: saludos, transiciones, ánimo, resúmenes de cierre (A1).
- flash solo para: explicación nueva con RAG (paso 4 del embudo).
- **Presupuesto pedagógico**: Rai cierra la sesión de forma natural a los
  ~25-30 min o ~N intercambios ("¡buen trabajo por hoy! mañana seguimos con…")
  → es MEJOR pedagogía (sesiones cortas y frecuentes) y acota el costo máximo
  por sesión. Nunca un corte seco: siempre cierre cálido + generar el resumen.
- Métrica objetivo: **< CLP 20 por sesión** (medible: log de tokens por sesión
  en la tabla `sesiones`; con tope CLP 5.000/mes ≈ 250 sesiones/mes de margen).

**CA:** una sesión típica de 25 min registra su costo estimado y queda bajo el
objetivo. — **Nosotros**

### C4. Banco anti-sesgo regenerado
Ejecutar `PLAN-banco-antisesgo.md` (emparejar longitudes de opciones). Con A2
hecho, el banco nuevo entra solo al servidor. — **Gema**

---

## FASE D — Producto completo

### D1. Home del alumno + sesión de estudio guiada
El niño entra a SU tarjeta y ve: qué toca hoy, racha de días, botón "estudiar
con Rai". La sesión guiada usa la biblioteca C1 (ejercicios validados, 0
tokens) intercalada con el tutor en vivo solo cuando se traba — la arquitectura
"IA in the middle" completa. — **Nosotros**

### D2. Panel de progreso del padre
Con las sesiones de A1 en Supabase: historial por hijo (fecha, duración,
materia, título, resumen), horas/semana reales vs plan, avance por materia.
Es leer datos que ya existen — por eso A1 va primero. — **Nosotros**

### D3. Pagos
Pasarela chilena (Flow / MercadoPago / Khipu) sobre la sección de cuenta de B1.
Modelo sugerido: suscripción mensual por familia (no por niño). Recién tiene
sentido cuando D1 esté vivo. — **Nosotros, al final**

---

## Orden recomendado y dependencias

```
A1 memoria Rai ──────────────┐
A2 respuestas al server ─────┤→ B1 registro padre → B2 Supabase ─→ C1 checker+biblioteca
A3 tests + CI (paralelo) ────┤                                  ├→ C2 caché
A4 embeddings (paralelo) ────┘                                  └→ C3 enrutado
                                                                     ↓
                                                          D1 home alumno → D2 panel padre → D3 pagos
```

- **A1 es lo primero**: sin memoria real, el diferenciador del producto no existe.
- A3 y A4 pueden ir en paralelo (A4 lo puede correr Gema/usuario hoy mismo).
- C1 necesita B2 (la biblioteca vive en Supabase), pero el CHECKER se puede
  prototipar antes contra archivos locales.
- Pendientes menores que se limpian al pasar: borrar `bancoSemilla.ts` si ya no
  se usa, unificar `diaId()` con `diaDeHoy()`, pasada de accesibilidad (roles
  ARIA en el chat) durante D1.

## Seguridad (transversal, no negociable)
- Regenerar la key de Gemini expuesta en chats (usuario, HOY).
- Cerrar el túnel cloudflare cuando no se esté probando en el móvil.
- `/api/tutor`: rate limit simple por IP/cuenta (aunque haya tope de gasto,
  evita que un tercero queme el presupuesto del mes en una tarde).
- Con B2: RLS en todas las tablas; los datos de niños nunca salen de la cuenta
  del apoderado.
