# Plan: arreglar a Rai como tutor y la mecánica de rutas de aprendizaje

> Diagnóstico completo en la revisión del 2026-08-05. Este plan ordena los
> arreglos por dependencia y, para cada uno, deja explícito **qué se puede
> romper** — varios tocan la memoria del niño, que es el dato más delicado
> que tenemos.

## El problema de fondo, en una frase

**Estudiar con Rai casi no mueve el mapa.** La evidencia que genera una clase
se guarda con la materia equivocada (R1.1) o con una clave de tema que ninguna
etapa lee (R1.2). Hoy el camino avanza casi solo por las pruebas. Todo lo
demás de este plan es calidad de la clase; esto es que el producto haga lo
que promete.

---

## FASE R1 — Que la clase escriba donde corresponde · ~1 día

> Sin esto, afinar umbrales o prompts es decorar una tubería rota.

### R1.1 La clase hereda la materia de la etapa elegida

Hoy `tutor/page.tsx` pasa solo `foco.tema` y descarta `foco.materia`; el Tutor
deduce la materia del horario del día. Si el niño cambia de pestaña en el mapa,
la clase enseña un tema de Matemática "dentro" de Lenguaje.

- Pasar `materiaFoco={foco?.materia}` al Tutor y usarla como materia de la
  clase, con el horario como fallback:
  `materia = materiaFoco ?? materiasHoy[0] ?? examen.materias[0]`.
- El prompt debe reflejar la elección sin sonar a reto: si el niño eligió una
  materia distinta a la agendada, `sistemaSesion` dice *"hoy tocaba Lenguaje
  pero eligió seguir con Matemática"* en vez de afirmar "Hoy toca: Lenguaje"
  mientras enseña otra cosa.

**Qué se puede romper:**
- `materia` alimenta además el color de la esfera (`AuraOrb`), la telemetría,
  `nuevaSesion.materia` y el fallback de la materia de las actividades
  (`mat = data.actividadMateria || materia`). Los cuatro **mejoran** con el
  arreglo, pero hay que verificarlos: el panel del apoderado y el resumen
  semanal por correo muestran `sesion.materia`.
- `foco` se persiste por niño en localStorage. Un `foco` viejo podría fijar
  una materia que ya no corresponde. Mitigación: `/hoy` y el mapa lo escriben
  fresco en cada entrada, y "conversa libre" lo limpia. Revisar que no quede
  ningún camino que entre a `/tutor` con foco rancio.
- La primera charla (`esPrimera`) no tiene foco: debe seguir cayendo al
  fallback actual.

**CA:** el niño entra al mapa, cambia a una materia que **no** es la del
horario, toca "Estudiar con Rai", conversa y sale. La sesión queda guardada en
esa materia y la etapa correspondiente refleja lo trabajado.

### R1.2 Las claves de tema del cierre se emparejan con la ruta real

El cierre pide el tema como texto libre y `aplicarCierre` solo hace
`.toLowerCase().trim()`. Las claves reales son `resolucion_problemas`,
`comprension_lectora`: cualquier variante ("comprensión lectora", "problemas")
crea un tema fantasma.

- Nueva función pura `normalizarClaveTema()`: minúsculas, sin tildes, espacios
  y guiones → `_`.
- Nueva función pura `emparejarConRuta(clave, ruta)`: exacta → normalizada →
  coincidencia por inclusión. Si no empareja, **se conserva la clave
  normalizada** (no se descarta: un tema fuera de la ruta sigue siendo memoria
  válida, solo que no es una etapa).
- El endpoint de cierre ya recibe `curso` y `acuerdo`: puede calcular
  `rutaDeTemas()` y (a) **inyectar las claves válidas en el prompt** —el lever
  más fuerte— y (b) emparejar la respuesta antes de guardarla.

**Qué se puede romper:**
- Los temas fantasma **ya escritos** en la memoria de niños reales no se
  arreglan solos. Decidir: dejarlos (se ven en "en qué va" pero no en el mapa)
  o escribir una migración que los empareje una vez. Recomiendo dejarlos y que
  el emparejamiento aplique de aquí en adelante — tocar memoria histórica de
  menores por un beneficio cosmético no lo vale.
- `aplicarCierre` está cubierto por `memoria.test.ts`; hay que extenderlo, no
  reescribirlo.

**CA:** una sesión donde Rai reporta "Comprensión Lectora" queda guardada como
`comprension_lectora` y la etapa correspondiente del mapa cambia de estado.

---

## FASE R2 — Umbrales de evidencia coherentes · ~medio día

> Depende de R1: no tiene sentido calibrar cuánta evidencia hace falta si la
> evidencia se está guardando en el lugar equivocado.

### R2.1 El simulacro puede marcar superado *(bug introducido en Fase 2.1)*

`registrarSimulacro` exige `total >= 4` por tema, pero el simulacro reparte 24
preguntas entre 8 temas = 3 por tema. Hoy solo puede **bajar** a `le_cuesta`.

- Regla propia para el simulacro: **≥3 preguntas y ≥80%** → `superado`.
  Justificación honesta: es cronometrado, sin ayuda de Rai y sin feedback —
  3 de 3 en ese contexto es evidencia más fuerte que 4 de 5 en una práctica
  guiada. El umbral de `registrarEjercicios` se calibró para otro escenario.
- Alternativa si se prefiere no tocar el umbral: subir el tope de preguntas o
  cubrir menos temas por simulacro. **Recomiendo el umbral**: 32 preguntas
  cronometradas es demasiado para un niño de básica.

**Qué se puede romper:** `acuerdo.test.ts` cubre `registrarSimulacro`; los
casos existentes (4 de 5, y 1 de 2 sin degradar) siguen pasando con la regla
nueva, pero hay que agregar el caso de 3 de 3.

**CA:** un niño rinde un simulacro con 3/3 en un tema y esa etapa queda
superada en el mapa.

### R2.2 Doble estándar del juicio de Rai — **decisión tuya**

`registrarEjercicios` exige ≥4 ejercicios y ≥80%. El cierre acepta `"supero"`
por juicio del LLM, sin umbral. Un tema puede quedar superado —y contar para
el indicador "listo para tu examen" y el logro "materia completa"— solo porque
Rai quedó con buena impresión.

Tres opciones, de más a menos estricta:

| | Regla | Efecto |
|---|---|---|
| **A** | `superado` exige al menos una evidencia dura (ejercicios/prueba/simulacro). El juicio de Rai puede confirmar, no otorgar. | El mapa avanza más lento pero significa algo. Riesgo: un niño que conversa mucho y rinde poco no ve progreso. |
| **B** (recomendada) | El juicio de Rai sube `le_cuesta → en_proceso` libremente; para llegar a `superado` necesita evidencia dura **o** dos juicios `supero` en sesiones distintas. | Reconoce el trabajo conversacional sin regalar el estado. |
| **C** | Dejarlo como está. | El indicador y los logros se inflan. |

**Qué se puede romper:** el test `memoria.test.ts:31` ("supero → superado")
codifica la regla actual y **debe cambiar** — es el test el que está
consagrando el problema. También hay que revisar que el correo de logro
(Fase 3.2) no se vuelva demasiado raro (con la opción A podría no llegar nunca
para un niño conversador).

---

## FASE R3 — Que Rai enseñe con el currículum a la vista · ~1 día

### R3.1 La consulta del RAG se arma del tema, no del texto del niño

Hoy `recuperar(body.pregunta)`. En una clase real la mayoría de los turnos son
"sí", "ya", "no sé": `terminos()` los vacía y el RAG devuelve `[]`. Turnos algo
más largos recuperan ruido. El `temaFoco` nunca entra en la consulta.

- Construir la consulta como
  `[tituloDeTema(temaFoco), nombreMateria, curso, pregunta del niño]`, dando al
  tema el peso principal.
- Cuando el turno del niño no aporta términos, la consulta **igual** es útil
  porque lleva el tema.

**Qué se puede romper:**
- Más llamadas a `obtenerEmbedding` con consultas más largas → costo. Es
  marginal (los embeddings son baratos y ya se llama en cada turno de chat),
  pero ahora hay telemetría de costo (Fase 4.1) para confirmarlo con datos.
- Las `fuentes` que se muestran al niño cambiarán: serán más consistentes con
  el tema y menos con su pregunta literal. Es lo que queremos, pero es un
  cambio visible.

### R3.2 El saludo también recupera currículum

`if (accion === "chat" && body.materia)` deja el saludo fuera. Justo cuando
`temaFoco` le pide a Rai *"una INTRODUCCIÓN al tema MACRO"*, es el mensaje con
menos anclaje de toda la sesión.

- Habilitar RAG para `accion: "saludo"` cuando hay `temaFoco`, con la consulta
  de R3.1.

**Qué se puede romper:** el saludo usa `MODELO_LITE` y es corto por diseño;
inyectarle 3 fragmentos de 600 caracteres puede volverlo denso. Revisar el
tono real de la primera frase después del cambio, y bajar a `k: 2` si hace
falta.

**CA (R3):** el niño toca la etapa "Fracciones" y el primer mensaje de Rai
introduce fracciones apoyado en el currículum, no en una generalidad.

---

## FASE R4 — Ajustes de clase · ~medio día

### R4.1 Dificultad adaptativa en los ejercicios de clase
`dificultad: "2"` está hardcodeada en `Tutor.tsx`. La prueba adapta (±1) y el
simulacro parte según el estado del tema; la clase no.
- Mapear el estado del tema → dificultad (escala 1-3 del endpoint de
  ejercicios): `le_cuesta → 1`, `en_proceso → 2`, `superado → 3`.
- **Ojo:** el diagnóstico usa escala 1-5 y los ejercicios 1-3. No mezclarlas.

### R4.2 La memoria prioriza el tema de la etapa
`memoriaParaHoy` ordena por fecha y corta en 3, así que la memoria del tema que
el niño está estudiando puede quedar fuera — justo la que Rai necesita para
decir *"¿te acuerdas que te costaban y las lograste?"*.
- Aceptar un `temaFoco` opcional y garantizar que ese tema entre primero.
- **Qué se puede romper:** `memoria.test.ts` cubre `memoriaParaHoy`; el
  parámetro nuevo debe ser opcional para no tocar las llamadas existentes.

### R4.3 `PlanMateria.objetivo` deja de ser dato muerto
Se genera con una llamada a Gemini y no lo lee nadie.
- Mostrarlo en el mapa como subtítulo de la materia.
- Inyectarlo en `sistemaSesion` para que Rai pueda apelar al para qué.
- Si se decide no usarlo, **quitar su generación** y ahorrar la llamada. Lo
  que no puede quedar es a medias.

---

## Orden y dependencias

```
R1.1 materia correcta ─┐
R1.2 claves de ruta ───┴──► R2.1 umbral simulacro
                            R2.2 estándar del juicio de Rai  (decisión)
R3.1 RAG por tema ─────────► R3.2 RAG en el saludo
R4.1 · R4.2 · R4.3  (independientes, en cualquier hueco)
```

- **R1 va primero, sin excepción.**
- R2 después de R1 (calibrar sobre datos que aterrizan bien).
- R3 y R4 son independientes de R1/R2.

## Pruebas

Además de las de cada fase:

- **Test de regresión del bug R1.1**: extraer la decisión de materia a una
  función pura (`materiaDeClase(foco, materiasHoy, examen)`) y testearla —
  hoy esa lógica vive suelta en un `const` dentro del componente, que es
  justamente por qué nadie la vio.
- **Test de R1.2** con las variantes reales que produce el LLM: acentos,
  espacios, mayúsculas, singular/plural.
- Correr `npm test` completo (116 hoy) y el build en cada fase.
- Verificación en vivo con la base local: una sesión real de chat con Gemini
  que termine, y comprobar en Postgres que la evidencia quedó en el tema y la
  materia correctos.

## Estimación

| Fase | Contenido | Tiempo |
|---|---|---|
| R1 | Materia correcta + claves de ruta | ~1 día |
| R2 | Umbrales de evidencia | ~½ día |
| R3 | RAG por tema + saludo | ~1 día |
| R4 | Dificultad, memoria, objetivo | ~½ día |

**Total ~3 días.** R1 sola ya cambia el producto: es la diferencia entre un
mapa que refleja el trabajo del niño y uno que lo ignora.

## Decisiones que necesito de ti

1. **R2.2** — ¿opción A, B o C para el estándar de "superado"? (recomiendo B)
2. **R2.1** — ¿bajar el umbral del simulacro a 3, o reestructurar el reparto de
   preguntas? (recomiendo el umbral)
3. **R4.3** — ¿el objetivo de materia se muestra y se usa, o se elimina?
4. **R1.2** — ¿tocamos los temas fantasma ya guardados o los dejamos?
   (recomiendo dejarlos)
