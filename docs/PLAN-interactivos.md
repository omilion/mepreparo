# PLAN — Ejercicios interactivos y mini-juegos (brainstorm aterrizado)

> Documento de diseño, NO de implementación (aún). Fija el modelo acordado en el
> brainstorm del 2026-07 para cuando se construya. La regla que manda TODO:
> **mantener las animaciones suaves y la estética zen** (papel cálido, salvia,
> clay, Fraunces). Un juego que no se sienta zen no entra, por muy ingenioso.

## ⭐ ROL DE LOS INTERACTIVOS (decisión que reordena todo, usuario 2026-07)
Los interactivos son **EL DULCE, NO LA COMIDA**. Un condimento de dinamismo
ocasional entre las preguntas clásicas — NO el mainstream. Consecuencias:
- El CORE sigue siendo opción múltiple + respuesta escrita (robusto, barato,
  siempre funciona). Los juegos aparecen DE VEZ EN CUANDO, como sorpresa/premio.
- NO construir los ~9 tipos. Empezar con 2-3 que se sientan mágicos (candidatos:
  sopa de letras, pinta-fracción, arrastra-la-palabra) y ver si enganchan. La
  tabla-excel, laberintos, conectar-puntos se posponen indefinidamente o nunca.
- La frecuencia BAJA desinfla la preocupación costo/fragilidad: como aparecen
  poco (y se guardan en biblioteca → después gratis), da igual que un generado
  cueste más tokens. NO es el flujo principal.
- RAI ELIGE cuándo lanzarlos, pero con una DOSIS clara: **1 o 2 por sesión**,
  integrados en el RITMO de la clase — NO son un premio colgado al final ni algo
  al azar. Es como un profesor que alterna explicar/preguntar/hacer actividad.
  Predecible (el niño sabe que habrá un momento lúdico) sin ser mecánico (Rai
  decide el punto donde fluye, típicamente a media clase cuando ya entendió algo
  y viene bien afianzarlo jugando). Rai necesita "consciencia de dosis": un
  contador de interactivos propuestos en la sesión para no pasarse ni quedarse
  corto. Esto zanja el contrato de datos → Rai decide el tipo (no tabla tema→juego).

## El modelo (decidido)
Plantillas FIJAS (componentes React propios) + la IA rellena los PARÁMETROS +
el checker valida + se guarda en la BIBLIOTECA compartida. La IA genera DATOS,
nunca CÓDIGO. Es el mismo circuito de los ejercicios de opción múltiple que ya
existe, extendido a más "tipos".

Por qué así (y no HTML generado por IA en un iframe):
- La IA generando código es FRÁGIL — el 2026-07-13 se truncó el JSON de un
  ejercicio SIMPLE con 600 tokens; un juego HTML son miles de tokens y tiene que
  funcionar sin un solo error de sintaxis. Un ejercicio malo se ve raro; un juego
  con bug de JS no hace nada frente al niño.
- Con plantillas: el componente SIEMPRE funciona (lo escribimos y probamos una
  vez), cero riesgo de seguridad, y la IA hace lo barato y robusto (datos).
- Embudo de costos: la 1ª vez que se pide un interactivo de un tema, la IA
  rellena la plantilla → checker valida → se GUARDA en la biblioteca → el
  siguiente niño lo recibe a 0 tokens. Cuando no exista, se genera; cuando exista,
  se reutiliza.
- El iframe+sandbox+srcdoc+postMessage (idea de Gema, técnicamente correcta)
  queda SOLO para casos verdaderamente únicos y SIEMPRE con validación previa en
  la biblioteca — nunca código sin probar frente a un niño. Es el último recurso,
  no el primero.

## Investigación de librerías (2026-07, hecha)
Regla: la librería hace la MECÁNICA invisible/difícil; el LOOK lo controlamos
nosotros (zen). Resultados:
- **Drag & drop** → `@dnd-kit/core` (~6KB, touch nativo crítico para tablet,
  "no animation opinions" = no impone estética, accesible ARIA). Estándar 2026.
  react-beautiful-dnd está DEPRECADA. Para: arrastra-palabra, línea de tiempo,
  matching.
- **Sopa de letras** → `@sbj42/word-search-generator` (solo GENERA la grilla —
  coloca palabras sin cruces, incl. diagonales; sin UI). Nosotros dibujamos la
  grilla zen y la selección. Los "componentes listos" de GitHub traen su UI → NO.
- **Matemática (fórmulas) → KaTeX (`react-katex`)**: hallazgo importante. Para
  mostrar fracciones/ecuaciones BIEN renderizadas (3/8 como fracción real con
  barra, no texto plano). Rápido (<50ms), liviano, NO impone colores (solo
  compone la fórmula, le damos el estilo). Aplica a CUALQUIER ejercicio de mate,
  no solo juegos.
- **Pinta fracción / recta numérica / coordenadas / laberinto** → SVG/canvas
  PROPIO, sin librería (más liviano, 100% control del look).

## Postura sobre librerías (decidida)
Librerías SOLO para la mecánica invisible (arrastre, canvas), NUNCA para la
apariencia. El look siempre lo controlamos nosotros. Donde no haga falta
librería, componente propio (más liviano, 100% zen). Ej: dnd-kit solo maneja la
física del drag; nosotros ponemos los colores y las curvas suaves. Rechazar
librerías de "juego educativo listo" que traen su propia UI.

## Catálogo de plantillas (familia)
Todas entran por el mismo flujo y reportan su resultado a la memoria (evidencia
para el apoderado), igual que los ejercicios actuales.

| Plantilla | La IA rellena | Materias | Complejidad |
|---|---|---|---|
| Opción múltiple | (ya existe) | todas | — |
| **Respuesta escrita** ← PILOTO | enunciado + respuesta(s) válida(s) | todas | baja |
| Une con líneas (matching) | pares concepto–definición | todas | media |
| Verdadero/Falso | afirmaciones | ciencias, historia | baja |
| Pinta la fracción | fracción objetivo | mate | media (SVG) |
| Ordena la línea de tiempo | hitos + orden correcto | historia | media (drag) |
| Sopa de letras | palabras del tema | lenguaje, ciencias | media (propio) |
| Arrastra la palabra al hueco | frase + palabras | lenguaje | media (drag) |
| Recta numérica / coordenadas | punto objetivo | mate | media (SVG) |
| Tabla tipo Excel | filas/columnas a completar | mate, ciencias | media |

Los de MAYOR valor para exámenes libres de básica (donde más se traban / más se
evalúa): fracciones visuales, línea de tiempo de Historia, recta numérica/
coordenadas. Son plantillas fijas ideales — 80% del valor con 20% del riesgo.

## PILOTO acordado: Respuesta escrita
El molde de menor riesgo que valida todo el circuito nuevo antes de invertir en
juegos visuales. En vez de botones de alternativas, un input + botón "Validar".
- Validación exacta (números/palabras): comparación tolerante a
  mayúsculas/espacios/tildes en el cliente.
- Validación reflexiva ("¿por qué crees…?"): el texto va a Rai, que ya tiene el
  contexto de la conversación, y evalúa el concepto + da feedback.
- Reporta acierto/fallo a la memoria (registrarEjercicios), igual que hoy.

## Las 3 cosas a resolver ANTES de construir (diseño)
1. **Contrato de datos común por tipo**: definir el JSON que la IA devuelve para
   cada plantilla, para que checker y componente lo entiendan igual. Es lo más
   importante de acertar desde el inicio (evita reescribir después).
2. **Checker por tipo**: cada plantilla necesita su validación propia
   (sopa: ¿las palabras caben en la grilla y existen? línea de tiempo: ¿el orden
   es históricamente correcto? escrita: ¿la respuesta es coherente?). Esto
   garantiza que un interactivo generado NUNCA llegue roto al niño.
3. **dnd-kit vs. arrastre nativo en TABLET táctil**: probar cuál se siente más
   suave al tacto (las usuarias reales usan tablet). Decide toda la familia de
   juegos con arrastre.

## Circuito técnico (igual al de ejercicios actuales)
1. Rai lanza el interactivo con un marcador (extender el actual `<<EJERCICIO:tema>>`
   a algo como `<<JUEGO:tipo:tema>>`).
2. El front pide a `/api/ejercicios/obtener` (o endpoint hermano) el interactivo
   del tipo+tema; si no está en biblioteca, la IA rellena la plantilla.
3. El checker (por tipo) valida; si pasa, se guarda en `contenido_validado`
   (añadir columna `tipo` y un `contenido`/`datos` jsonb por plantilla).
4. El componente correspondiente se renderiza en la tarjeta del chat (misma
   estética que la tarjeta de ejercicio actual).
5. Al completar, callback/postMessage → registrarEjercicios → memoria + mapa.
6. Red de seguridad (ya existe para ejercicios): si no llega o es inválido, Rai
   lo dice con naturalidad; el niño nunca queda colgado.

## Estética (no negociable)
- Colores de marca (salvia/clay/papel), Fraunces para títulos, curvas suaves.
- Animaciones lentas y suaves (respeta prefers-reduced-motion), nada brusco.
- Feedback de acierto discreto (el patrón de Fireworks sutil que ya existe), no
  confeti estridente.
- Nada de sonidos/colores chillones tipo "juego arcade".
