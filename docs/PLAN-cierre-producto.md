# PLAN — Cierre de producto (de "motor pedagógico" a "producto que se vende")

> Origen: revisión completa de la app (18 rutas, 20 APIs, modelo de datos) tras las
> pruebas reales con las hijas del usuario. Diagnóstico: **el motor pedagógico está
> más maduro que el producto alrededor**. Falta (a) los cimientos aburridos —legal,
> cuenta, pagos— y (b) el cierre del arco: el examen.
>
> Este documento es la lista accionable para cerrar TODO. Orden pensado por
> dependencias reales, no por gusto.

---

## Principios que mandan sobre este plan

1. **Nada de esto agrega interactivos.** Hay 9 y sobran. Se cierra el producto.
2. **Verificar antes de aceptar.** Cada tarea trae su CA (criterio de aceptación)
   comprobable, no "compila".
3. **Estética zen y "el dulce, no la comida"** siguen mandando (ver
   PLAN-interactivos.md §0 y PLAN-vocabulario-visual-zen.md §0).
4. Lo que toca datos de menores se hace **antes** de tener usuarios reales.

---

## FASE 0 — Cerrar lo que quedó a medias (1 día)

### 0.1 Cablear `generarPrueba.ts`
Existe `src/lib/diagnostico/generarPrueba.ts` (creado, **sin usar**). Genera con
Gemini una pregunta de opción múltiple validada por el checker y la cachea en
`contenido_validado` con `tipo: "prueba_gen"`.

- Engancharlo en `/api/diagnostico/pregunta`: si el banco no tiene más preguntas
  del tema y el cliente pide `generar=1`, servir una generada (id propio + HMAC
  igual que las del banco — el `responder` es stateless, ya funciona).
- `PruebaEtapa.tsx`: subir el objetivo a **8 preguntas** (decisión tomada) y pedir
  generadas cuando el banco se agote.
- **CA:** una prueba de un tema con 2 preguntas en banco entrega 8 y aprueba con
  ≥80%. Verificado con curl al endpoint. — **Nosotros**

---

## FASE 1 — Cimientos (bloqueantes para usuarios reales) · ~1 semana

### 1.1 Legal: privacidad, términos y borrado ⚠️ LO PRIMERO
Guardamos datos de **menores**, incluidas frases textuales del niño sobre cómo se
siente. Sin esto no se puede abrir a nadie fuera de la familia (Ley 21.719).

- Rutas nuevas `/privacidad` y `/terminos` (estáticas, SSR, enlazadas desde el
  footer del landing y desde Mi Cuenta).
- Contenido mínimo: qué se guarda, para qué, cuánto tiempo, quién accede, que el
  apoderado es el titular, derechos ARCO, contacto.
- Checkbox de aceptación en el registro (guardar `aceptoTerminos` + fecha).
- **Borrar mi cuenta** en Mi Cuenta: borra cuenta + pupilos + sesiones + eventos
  (cascade ya existe en el schema) con confirmación escrita.
- **Exportar mis datos**: JSON descargable con todo lo del apoderado y sus hijos.
- **CA:** un apoderado puede leer ambas páginas, exportar su JSON y borrar su
  cuenta; tras borrar, no queda fila suya en `user`, `pupilos`, `eventos`. — **Nosotros**

### 1.2 Email transaccional (Resend)
Desbloquea 1.3, alertas y recibos. Sin servidor de correo propio.

- Cuenta Resend + dominio verificado (SPF/DKIM). Variable `RESEND_API_KEY`.
- Helper `src/lib/email.ts` con `enviarEmail({para, asunto, html})` y plantilla
  zen (mismo lenguaje visual: sin imágenes, tipografía limpia).
- **CA:** un email de prueba llega a la bandeja (no spam) con el remitente del
  dominio propio. — **Nosotros + usuario (dominio)**

### 1.3 Recuperar contraseña
Hoy un apoderado que olvida su clave **pierde la cuenta y el progreso de sus hijos
para siempre**.

- `emailAndPassword.sendResetPassword` de better-auth → usa 1.2.
- Rutas `/auth/recuperar` (pide email) y `/auth/nueva-clave?token=` (setea).
- Enlace "¿Olvidaste tu contraseña?" en el formulario de login.
- **CA:** flujo completo probado con una cuenta real: llega el correo, el enlace
  funciona una sola vez y la clave nueva sirve. — **Nosotros**

### 1.4 PWA (instalable en tablet)
Barato y cambia la percepción a "app de verdad". Los niños entran por tablet.

- `src/app/manifest.ts` (nombre, íconos 192/512, `display: standalone`,
  `theme_color` del tema zen, `start_url: "/"`).
- Íconos generados desde el lenguaje visual actual (línea, salvia).
- Meta `apple-mobile-web-app-capable` para iPad.
- **CA:** en una tablet real, "Agregar a pantalla de inicio" deja un ícono que
  abre a pantalla completa sin barra del navegador. — **Nosotros + usuario (probar)**

---

## FASE 2 — El arco del producto: el examen · ~1 semana

> Es la promesa del nombre. Hoy el niño nunca rinde algo parecido a su examen real.

### 2.1 Simulacro de examen por materia
- Componente `Simulacro.tsx`: 20-30 preguntas mixtas de TODOS los temas de la
  materia, **cronometrado**, sin ayuda de Rai, sin feedback hasta el final.
- Fuente: banco + `generarPrueba` (Fase 0) para cubrir huecos.
- Al terminar: puntaje, desglose por tema, y **Rai comenta el resultado** con
  cariño y propone qué reforzar (reusa el patrón de `raiExplicaError`).
- Se guarda como evidencia dura (`tipo: "simulacro"` en `EvidenciaTema`).
- **CA:** un niño rinde un simulacro completo de una materia y el resultado queda
  en su memoria por tema; Rai lo menciona en la sesión siguiente. — **Nosotros**

### 2.2 Indicador "listo para tu examen"
La fecha del examen ya se pide en el onboarding y hoy casi no se usa.

- Cálculo: cobertura de temas (cuántas etapas superadas / total) × desempeño
  (aciertos recientes por tema) → un % con lenguaje humano
  ("vas bien encaminada en Matemática, te falta afirmar fracciones").
- Visible para el **niño** (en el mapa, sutil) y para el **apoderado** (destacado).
- **Cuenta regresiva** al examen: "faltan 34 días".
- **CA:** con dos perfiles distintos (uno avanzado, uno atrasado) el indicador da
  números y textos claramente distintos y correctos. — **Nosotros**

---

## FASE 3 — Retención: que vuelvan mañana · ~1 semana

### 3.1 Panel del apoderado: "en qué va" (no solo cuánto)
La joya del modelo de datos —temas con estado `le_costo`/`supero`, evidencias y
frases textuales del niño— **no se le muestra al padre**. La data ya existe.

- En cada hijo: lista de temas por materia con su estado (color zen), la evidencia
  más reciente y, si la hay, la frase del niño ("dijo: las fracciones se me hacen
  difíciles").
- Bloque "qué reforzar esta semana" (top 3 temas en rojo).
- **CA:** el apoderado ve, sin abrir el chat, en qué está flojo su hijo y qué dijo
  al respecto. — **Nosotros**

### 3.2 Alertas por email al apoderado (usa 1.2)
- Semanal: resumen del progreso (minutos, temas superados, qué reforzar).
- Inactividad: "Emilia no estudia hace 5 días".
- Logro: "¡Emilia superó Fracciones!" (esta engancha de verdad).
- Preferencias en Mi Cuenta para apagarlas (obligatorio si mandamos correo).
- **CA:** los tres correos llegan bien formateados y el switch de apagado
  funciona. — **Nosotros**

### 3.3 Niño: "qué hago hoy"
Hoy el niño cae en el mapa y **tiene que decidir**. A un niño de básica hay que
darle UNA acción obvia.

- Home del alumno: tarjeta grande "Hoy toca Matemática · Etapa 3 · 20 min" con un
  solo botón "Empezar". El mapa queda como vista secundaria ("ver mi camino").
- Si ya estudió hoy: "¡Ya estudiaste hoy! ¿Quieres repasar algo?" (sin presionar).
- **CA:** un niño entra y sabe qué hacer sin leer nada más que una frase. — **Nosotros**

### 3.4 Logros y racha visible
`calcularRacha` ya existe en `PlanEstudio.tsx` pero casi no se celebra.

- Racha visible y celebrada (Fireworks, nunca emojis — ver memoria del proyecto).
- Set corto de logros con iconos del vocabulario zen: primera sesión, 3 días
  seguidos, primera etapa, primer simulacro, materia completa.
- **NO** puntos ni ranking: no competimos, acompañamos (coherente con el zen).
- **CA:** al lograr algo, el niño lo ve con la celebración de partículas y queda
  guardado. — **Nosotros**

---

## FASE 4 — Negocio · ~1 semana

### 4.1 Costo real por sesión (telemetría)
Meta declarada: **< CLP 20 por sesión** (PLAN-siguiente-nivel C3). Hoy **no se mide**.

- Nuevo tipo de evento `sesion_costo` con `meta: {tokensIn, tokensOut, modelo}`
  (la tabla `eventos` y el catálogo cerrado ya existen).
- `gemini.ts` devuelve el uso de tokens; el endpoint del tutor lo registra.
- **CA:** tras una sesión real, el admin muestra el costo estimado en CLP y se
  puede comparar con la meta. — **Nosotros**

### 4.2 Admin: retención y embudo
- Retención semanal (cuántos vuelven), sesiones por niño, dónde abandonan
  (registro → wizard → diagnóstico → primera sesión).
- Costo promedio por sesión y por familia (usa 4.1) — valida el margen del
  análisis de voz (~54%).
- **CA:** se responde "¿cuánta gente vuelve la segunda semana?" y "¿cuánto me
  cuesta un niño al mes?" mirando el panel. — **Nosotros**

### 4.3 Pagos (Flow o MercadoPago)
Recién tiene sentido con Fase 2 y 3 vivas (hay algo que vale pagar).

- Suscripción mensual **por familia** (no por niño).
- Estados: prueba gratis → activa → vencida → cancelada. Bloqueo suave al vencer
  (el niño termina su sesión; no se corta a mitad de clase).
- Recibo por email (usa 1.2).
- Add-on futuro "Mundo de Voz" para prelectores (bolsas de minutos, ver
  `analisis_costos_voz.md`: costo ~CLP 2.734/mes/niño, precio sugerido $5.990,
  margen real ~54% — **ojo: la cuota gratis de TTS alcanza ~11 niños, no 285**).
- **CA:** una familia se suscribe con tarjeta real, recibe recibo, y al cancelar
  mantiene acceso hasta el fin del período pagado. — **Nosotros + usuario (cuenta Flow)**

---

## FASE 5 — Resiliencia (opcional, al final)

### 5.1 Offline básico
Se corta el wifi y se acaba la clase.

- Service worker: cachear el shell de la app y los iconos.
- Cola local de respuestas del niño (evidencia) para sincronizar al volver.
- **NO** intentar Rai offline (necesita la API). Mensaje honesto: "sin internet
  puedo mostrarte tus juegos, pero no puedo conversar".
- **CA:** con el avión activado, la app abre y el niño puede repasar un interactivo
  ya cargado. — **Nosotros**

---

## Orden y dependencias

```
FASE 0 (generarPrueba) ─────────────► FASE 2.1 (simulacro)
                                              │
1.1 legal ──┐                                 ▼
1.2 email ──┼──► 1.3 recuperar clave     2.2 indicador listo
            │         │                       │
1.4 PWA ────┘         └──► 3.2 alertas        ▼
                                         3.1 panel "en qué va"
                                         3.3 hoy toca · 3.4 logros
                                                  │
                                    4.1 costo ──► 4.2 admin ──► 4.3 pagos
                                                                    │
                                                              5.1 offline
```

- **1.1 va primero, sin excepción** (datos de menores).
- **1.2 (email) desbloquea** 1.3 y 3.2 y 4.3 → hacerlo temprano.
- **Fase 0 desbloquea 2.1**: sin preguntas suficientes no hay simulacro.
- 1.4 (PWA) no depende de nada: se puede hacer en cualquier hueco.

---

## Estimación gruesa

| Fase | Contenido | Tiempo |
|---|---|---|
| 0 | Cerrar generarPrueba | 1 día |
| 1 | Legal, email, clave, PWA | ~1 semana |
| 2 | Simulacro + indicador | ~1 semana |
| 3 | Panel, alertas, hoy toca, logros | ~1 semana |
| 4 | Costo, admin, pagos | ~1 semana |
| 5 | Offline | 2-3 días |

**Total ~5 semanas** de trabajo enfocado. Las fases 1 y 2 son las que convierten
esto en un producto lanzable; 3 y 4 en un negocio.

---

## Lo que NO está en este plan (a propósito)

- Más interactivos (hay 9, sobran).
- Voz para prelectores: es un producto aparte, va **después** de 4.3 (necesita
  pagos vivos para cobrar las bolsas de minutos).
- App nativa: la PWA cubre el caso.
- Multi-idioma: no hay demanda.
