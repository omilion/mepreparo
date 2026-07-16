# PLAN — Vocabulario Visual Zen (iconos que reemplazan a las imágenes)

Este documento registra la decisión de fondo y el plan por capas para que Rai use
un **lenguaje visual limpio** en toda la app, sin imágenes rasterizadas.

---

## 0. ⭐ EL PRINCIPIO (decisión del usuario — manda sobre todo)

**La app NUNCA muestra imágenes rasterizadas (fotos, ilustraciones cargadas, gifs).
Todo lo visual es SVG de línea.** Donde un tutor normal pondría una imagen, mepreparo
pone un **icono de línea** (o un diagrama/interactivo SVG).

Por qué: una foto sobreestimula, pesa y distrae; rompe el zen. Un icono de línea
comunica lo mismo —un objeto, un concepto, una emoción— pero limpio, liviano y
calmado. Es la misma regla que ya teníamos para las librerías de interactivos
("mecánica, no apariencia"), extendida a TODO lo visual.

El icono deja de ser un adorno: es **el reemplazo de la imagen**. Y se vuelve un
**dato de primera clase** que atraviesa tres usos:

1. **Explicar** — un icono junto al concepto (átomo, planeta, balanza).
2. **Poblar interactivos** — clasificar 🐕🐈🌵 en vez de "perro, gato, cactus";
   el intruso, el conector, etc. se vuelven visuales (clave para los que aún no
   leen bien).
3. **Expresar emoción** — Rai tiene estados (celebra, piensa, anima) con iconos.
   Le da presencia y calidez sin romper el zen.

> Esto ANTECEDE a construir más interactivos. Hacer el Clasificador con texto y
> luego rehacerlo con iconos sería construirlo dos veces. Los iconos son el
> cimiento sobre el que se paran los interactivos visuales y la expresividad de Rai.

---

## 1. La librería: Tabler Icons

- **Qué es**: >5.200 iconos de línea, estilo limpio, `stroke` configurable (se
  sienten livianos y zen). Repo: https://github.com/tabler/tabler-icons
- **El desafío**: son muchísimos. Si Rai elige el icono en tiempo de ejecución
  (Gemini devuelve "atomo"), no se puede hacer import estático (el nombre es
  dinámico). Importar toda la librería mete megabytes al bundle.

### Decisión de arquitectura: híbrido curado + fetch, con Rai que NO inventa

Ni la Opción A pura (diccionario de 150 iconos hardcodeados en el bundle) ni la B
pura (fetch de cualquiera de los 5.200) por separado. El híbrido:

1. **Copiar un subconjunto generoso de SVGs de Tabler a `/public/iconos/`**
   (arrancamos con ~150-250 que cubran básica: animales, cuerpo, espacio,
   geometría, útiles, naturaleza, emociones de Rai). Nombres en español
   normalizados (`atomo.svg`, `corazon.svg`, `triangulo.svg`).
2. **Fetch bajo demanda + caché del navegador**: la app pide `/iconos/atomo.svg`
   solo cuando se necesita. **Zero-bundle**: no empaquetamos ningún icono. La 2ª
   vez sale de caché (gratis, sin internet).
3. **Rai recibe la LISTA de nombres válidos** en su system prompt (los ~200 que
   existen, no los 5.200). Así **elige de un menú conocido y no inventa**. Este
   punto es el que hace que funcione de verdad.
4. **Fallback elegante**: si aun así pide uno que no existe (404), NO mostramos un
   icono roto ni un genérico feo — simplemente omitimos el icono y dejamos el
   texto. El concepto se entiende igual. Nunca se rompe la UI.

Por qué el híbrido gana: escala a cientos de conceptos (como la B), pero Rai no
falla porque elige de una lista (como la A), y el bundle sigue liviano.

---

## 2. El componente base: `<IconoZen>`

Un único componente que resuelve un nombre → SVG de `/public/iconos/`.

- Props: `nombre` (string), `tamaño`, `stroke` (default 1.5, el grosor zen).
- Carga el SVG por fetch, lo cachea en memoria (Map) para no re-pedir el mismo.
- Aplica `currentColor` para que herede el color del contexto (salvia, gold, tinta).
- Si el fetch falla, renderiza `null` (fallback: no molesta).
- Respeta el tema claro/oscuro automáticamente vía `currentColor`.

Este componente es el ladrillo. Todo lo demás lo usa.

---

## 3. Capas de construcción (de cimiento a avanzado)

### Capa 1 — Base de iconos (el cimiento) · MENOR RIESGO
- Copiar el set curado a `/public/iconos/` con nombres en español.
- Construir `<IconoZen nombre="..." />` con fetch + caché + fallback.
- Generar la LISTA de nombres válidos (un `iconos.ts` con el array).
- **Verificar**: un icono se ve, hereda color, cae elegante si no existe.

### Capa 2 — Rai explica con iconos (marcador en el texto)
- Rai emite `[icono:atomo]` incrustado en su respuesta (mismo patrón que los
  marcadores de interactivos que ya usamos: `<<SOPA:tema>>`, etc.).
- El chat (`TextoRevelado`/`Tutor`) detecta el marcador y renderiza `<IconoZen>`
  inline en el flujo del texto.
- System prompt de Rai: se le pasa la lista de iconos válidos + la instrucción de
  usarlos con moderación (dulce, no comida — igual que los interactivos).
- **Verificar**: Rai mete un icono en una explicación y aparece limpio inline.

### Capa 3 — Rai expresivo (estados emocionales)
- Un set chico de iconos de emoción/estado de Rai (celebra, piensa, anima, saluda).
- Se muestran junto a la esfera/presencia de Rai (`AuraOrb`) según el momento:
  al acertar un interactivo, al calcular, al fallar (ánimo), al saludar.
- Puede ir atado a eventos que YA tenemos (acierto/fallo de interactivos) sin que
  Rai tenga que pedirlo explícitamente, o vía un marcador `[estado:celebra]`.
- **Verificar**: Rai "reacciona" visualmente a un acierto sin romper el zen.

### Capa 4 — Interactivos con iconos (aquí conecta con el otro plan)
- Extender el contrato JSON de los interactivos para que cada elemento pueda
  traer `icono` además de (o en vez de) `texto`. Ej. clasificador:
  `{ "grupoA": "Seres vivos", "grupoB": "Inertes", "items": [{"texto":"perro","icono":"perro"}, ...] }`
- Rai/Gemini decide si usa iconos o palabras según edad y tema (ver §4).
- Retro-aplicar a los interactivos existentes que ganen con iconos (intruso,
  clasificador, conector).
- **Verificar**: un intruso de 4 iconos donde tocas el que no encaja.

### Capa 5 (futuro, opcional) — Diagramas SVG generados por Rai
- Para explicar de verdad (no solo decorar): fracción pintada, recta numérica,
  triángulo con ángulos, ciclo con flechas. Rai devuelve SVG parametrizado o un
  esquema que la app dibuja.
- Es el mismo lenguaje (SVG de línea zen), un peldaño más arriba que el icono.
- Se evalúa cuando las capas 1-4 estén sólidas.

---

## 4. Decisión pendiente de confirmar con el usuario

**¿Los elementos (en interactivos y explicaciones) son solo-icono, solo-texto o
mixto (icono + etiqueta)?**
- 1° básico (aún no lee bien): el icono solo es oro.
- 8°: el texto puede bastar.
- Probable respuesta: **mixto configurable** — Rai/el sistema decide según el
  curso del niño (que ya tenemos en el perfil). Esto define la forma del JSON.

---

## 5. Cómo se conecta con lo ya construido

- **Marcadores**: Rai ya sabe emitir marcadores (`<<SOPA:tema>>`…). `[icono:x]` y
  `[estado:x]` son el mismo mecanismo. Bajo riesgo de integración.
- **SVG de línea**: la rueda, el conector, los Fireworks ya son este lenguaje. Los
  iconos lo completan, no lo contradicen.
- **Biblioteca / caché**: los interactivos con iconos se cachean igual que hoy en
  `contenido_validado` (el `icono` es solo un campo más del JSON).
- **Regla del dulce**: los iconos, como los interactivos, se usan con moderación.
  No saturar cada frase de Rai con dibujitos.

---

## 6. Orden recomendado

1. **Capa 1** (base de iconos) — cimiento, rápido, bajo riesgo.
2. **Capa 2** (Rai explica con iconos) — mejora inmediata de calidez.
3. **Capa 3** (Rai expresivo) — presencia del tutor.
4. **Capa 4** (interactivos con iconos) — y recién aquí retomar los interactivos
   que faltaban (Clasificador, etc.), que ya nacen "con iconos" desde el diseño.
5. **Capa 5** (diagramas) — cuando lo anterior esté sólido.
