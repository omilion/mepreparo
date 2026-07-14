# PLAN DE CONSTRUCCIÓN — Interactivos de Rai (accionable)

> Ejecutable paso a paso. Complementa `PLAN-interactivos.md` (el brainstorm/
> decisiones); este es el CÓMO construirlo. Regla que manda todo: **estética zen
> + animaciones suaves** (papel/salvia/clay/Fraunces; nada arcade). Las
> librerías solo aportan MECÁNICA (headless), el look es 100% nuestro.
>
> Principio rector (decisión del usuario): los interactivos son **EL DULCE, NO
> LA COMIDA**. Rai sugiere **1-2 por sesión**, integrados en el ritmo de la
> clase. El core sigue siendo opción múltiple + respuesta escrita.

---

## LO QUE YA EXISTE Y SE REUTILIZA (no reinventar)
El circuito de "ejercicio en el chat" ya está construido y es el molde:
- **Marcador**: Rai termina un mensaje con `<<EJERCICIO:tema>>` — definido en
  `INSTRUCCION_EJERCICIO` (`src/lib/tutor/personaje.ts:125`).
- **Extracción**: `separarEjercicio()` en `src/app/api/tutor/route.ts:315` saca
  el marcador y devuelve `ejercicioTema`; el texto sale limpio.
- **Carga**: `cargarEjercicioEnChat()` en `Tutor.tsx` pide a
  `/api/ejercicios/obtener` y embebe la tarjeta; hay RED DE SEGURIDAD (si no
  llega, Rai lo dice, el niño no queda colgado).
- **UI**: `TarjetaEjercicioChat` (`Tutor.tsx:593`) renderiza enunciado+opciones.
- **Evidencia**: `responderEjercicio()` → `registrarEjercicios(acuerdo, tema,
  materia, correctos, total)` alimenta la memoria y el mapa.
- **Biblioteca + checker**: `/api/ejercicios/obtener` genera con Gemini, valida
  con `validarEjercicio` (`src/lib/tutor/checker.ts`) y guarda en la tabla
  `contenidoValidado`. FIX reciente: maxTokens 1100 + parseJsonTolerante.

Los interactivos EXTIENDEN este circuito: mismo marcador (evolucionado), misma
tabla (columnas nuevas), mismo flujo carga→jugar→evidencia. NO es un sistema
paralelo.

---

## CONTRATO DE DATOS (lo más importante — diseñar bien desde el inicio)
Todo interactivo, sea del tipo que sea, viaja como este objeto (lo genera la IA,
lo valida el checker, lo renderiza el componente):

```ts
interface Interactivo {
  tipo: TipoInteractivo;      // "escrito" | "sopa" | "fraccion" | "arrastra" | ...
  materia: Materia;
  curso: Curso;
  tema: string;
  enunciado: string;          // lo que Rai/pantalla le dice al niño
  datos: Record<string, unknown>; // ESPECÍFICO del tipo (ver cada plantilla)
  // cómo se valida el acierto (el componente lo usa localmente):
  respuestaCorrecta: unknown; // forma depende del tipo
}
```
- `tipo` es el discriminador: el front hace un `switch(tipo)` y renderiza el
  componente correcto. El checker hace lo mismo para validar por tipo.
- `datos` y `respuestaCorrecta` son libres por tipo, pero DEFINIDOS y
  DOCUMENTADOS por plantilla (abajo). Nunca improvisar formatos.
- Se guarda en `contenido_validado` reutilizando columnas: `tipo` (ya existe),
  `datos` jsonb (ya existe), `respuestaFinal` → guardar JSON.stringify de
  `respuestaCorrecta` cuando no sea string simple. Añadir MIGRACIÓN solo si hace
  falta una columna nueva (evaluar; probablemente `datos` basta).

---

## FASE 0 — Fundación del sistema de interactivos
Objetivo: el circuito soporta MÚLTIPLES tipos, sin construir juegos aún.
1. **Tipo y registro**: crear `src/lib/interactivos/tipos.ts` con
   `TipoInteractivo`, la interfaz `Interactivo`, y un REGISTRO
   `{ [tipo]: { generar, validar, Componente } }` — el patrón que hace todo
   extensible (agregar un juego = agregar una entrada).
2. **Marcador evolucionado**: cambiar `<<EJERCICIO:tema>>` a
   `<<JUEGO:tipo:tema>>` (retrocompatible: si no hay tipo, asumir "alternativa").
   Actualizar `INSTRUCCION_EJERCICIO` y `separarEjercicio` (regex + devolver
   `{tipo, tema}`). Dosis: instruir a Rai "1-2 por sesión, en el ritmo de la
   clase, no como premio" + darle en el prompt un contador de cuántos lleva.
3. **Endpoint unificado**: `/api/interactivos/obtener?tipo&tema&materia&curso`
   (o extender el de ejercicios). Según `tipo`, llama al `generar` del registro,
   pasa por el `validar` del registro, guarda en biblioteca, devuelve el
   `Interactivo`. Reutiliza el patrón de `/api/ejercicios/obtener`.
4. **Router de UI**: en `Tutor.tsx`, `TarjetaEjercicioChat` pasa a
   `TarjetaInteractivo` que hace `switch(tipo)` y monta el componente del
   registro. La opción múltiple actual se vuelve el primer "tipo" (alternativa).
5. **Consciencia de dosis**: contador de interactivos propuestos en la sesión
   (en el estado de `Tutor.tsx`), enviado a Rai en el prompt para autolimitarse.
**CA Fase 0**: la opción múltiple actual sigue funcionando idéntica, pero ahora
pasa por el registro/switch. tsc + tests verdes. NADA visible cambia aún.

---

## FASE 1 — PILOTO: "escrito" (respuesta abierta)
El molde de menor riesgo (sin librería, sin canvas). Valida todo el circuito.
- **datos**: `{ }` (nada especial). **respuestaCorrecta**: `string[]`
  (respuestas aceptadas) + flag `abierta: boolean`.
- **Componente** `InteractivoEscrito`: input + botón "Validar" (reusar el estilo
  del input destacado del tutor). Al responder:
  - Si NO `abierta`: comparación tolerante (minúsculas, sin tildes, trim) contra
    `respuestaCorrecta`. Local, 0 tokens.
  - Si `abierta` (reflexiva): manda la respuesta a Rai (`/api/tutor` con un
    modo "evaluar") → Rai juzga el concepto y da feedback en su próximo mensaje.
- **generar**: prompt pide `{enunciado, respuestasValidas:[...], abierta}`.
- **validar (checker)**: hay enunciado + al menos 1 respuesta válida (o abierta).
- **Reporta** acierto/fallo a `registrarEjercicios` igual que hoy.
**CA Fase 1**: Rai lanza un escrito, el niño escribe, valida bien (exacto y
reflexivo), la evidencia llega a la memoria. Verificar E2E con Gemini real.

---

## FASE 2 — Dos juegos "dulce" (los que enganchan)
Elegir 2 de estos 3 como primeros juegos visuales. NO construir los demás tipos
(tabla-excel, laberinto, conectar-puntos) — pospuestos indefinidamente.

### 2a. "Pinta la fracción" (mate) — SVG propio, sin librería
- **datos**: `{ total: number }` (porciones). **respuestaCorrecta**:
  `{ numerador: number }` (cuántas pintar). Enunciado: "Pinta 3/8".
- **Componente**: una torta/barra SVG dividida en `total` porciones; el niño
  toca para pintar (color salvia); acierta si pinta `numerador`. KaTeX para
  mostrar la fracción "3/8" bien (barra real). Animación suave al pintar.
- **checker determinista**: `0 < numerador < total`, fracción válida.

### 2b. "Sopa de letras" (lenguaje/ciencias) — `@blex41/word-search`
- Librería da el PATH (coordenadas) de cada palabra → permite validar; usar
  `forbiddenWords` para que el relleno aleatorio NUNCA forme groserías.
- **datos**: `{ grid: string[][], palabras: {palabra, path}[] }` (lo genera la
  librería en el server desde las palabras del tema). **respuestaCorrecta**:
  las palabras a encontrar.
- **Componente**: grilla zen; el niño arrastra/selecciona celdas; al completar
  un path válido, la palabra se marca (salvia). Al encontrar todas → cierre.
- **generar**: la IA da SOLO las palabras del tema (ej. 6 animales); la librería
  arma la grilla en el server. **checker**: las palabras existen y caben.

### 2c. "Arrastra la palabra" (lenguaje) — `@dnd-kit/core`
- TouchSensor con `delay: 250ms` + tolerancia → NO choca con el scroll de la
  tablet (crítico, las usuarias reales usan tablet).
- **datos**: `{ frase: "El ___ corre", opciones: ["gato","sol"] }`.
  **respuestaCorrecta**: `{ hueco: "gato" }`.
- **Componente**: frase con hueco; palabras arrastrables; acierta al soltar la
  correcta en el hueco. Animación de encaje suave.
**CA Fase 2**: cada juego: Rai lo lanza, se genera+valida+cachea en biblioteca,
el niño juega en TABLET (probar touch real), reporta evidencia, estética zen.

---

## FASE 3 — Pulido y biblioteca
- **Reporte de contenido malo**: botón discreto "reportar" en la tarjeta → marca
  `estado='reportada'` → sale de circulación (cierra el circuito humano del
  checker). Aplica a todos los tipos.
- **Poblar biblioteca** (Gema): generar y validar en lote interactivos de los
  temas más comunes por materia×curso, para que estén cacheados (0 tokens en
  uso real). Los juegos raros se generan al vuelo la 1ª vez.
- **Celebración**: al completar un juego, reusar el `Fireworks` sutil que ya
  existe (no confeti estridente).

---

## ORDEN Y DEPENDENCIAS
```
FASE 0 (fundación: registro + marcador + switch) 
   → FASE 1 (piloto escrito, verifica el circuito) 
   → FASE 2 (2 juegos: empezar por 2a pinta-fracción o 2b sopa) 
   → FASE 3 (reporte + poblar + celebración)
```
- Cada fase deja la app funcionando y se commitea aparte.
- Instalar librerías solo cuando se llega a su juego (dnd-kit en 2c,
  @blex41/word-search en 2b, react-katex en 2a).
- Verificar SIEMPRE en tablet táctil real, no solo desktop (el touch es donde
  se rompen los juegos de arrastre).

## LIBRERÍAS (todas headless — mecánica sí, estética no)
| Juego | Librería | Rol |
|---|---|---|
| escrito | ninguna | — |
| pinta-fracción / coordenadas / recta | ninguna (SVG propio) + KaTeX (fórmulas) | KaTeX solo compone la fórmula |
| sopa de letras | `@blex41/word-search` | genera grid + path de palabras; forbiddenWords |
| arrastra / línea de tiempo / matching | `@dnd-kit/core` | TouchSensor delay:250ms (no choca scroll tablet) |
| (tabla-excel) | `@tanstack/react-table` | POSPUESTO — baja frecuencia en básica |
| (laberinto) | `generate-maze` | POSPUESTO |

## NO NEGOCIABLE (estética)
- Colores de marca, Fraunces en títulos, curvas suaves, animaciones lentas
  (respeta prefers-reduced-motion). Feedback de acierto discreto (Fireworks
  sutil existente). Nada de sonidos/colores arcade.
- El interactivo es EL DULCE: 1-2 por sesión. Si el circuito tienta a ponerlos
  en cada turno, está mal — la rareza es la feature.
