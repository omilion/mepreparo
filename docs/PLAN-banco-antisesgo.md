# Plan: corregir el sesgo de longitud en el banco de preguntas

> **Para:** agente constructor (Gema).
> **Problema detectado (con datos):** en `app/src/lib/diagnostico/banco.json` la respuesta CORRECTA es sistemáticamente más larga que las incorrectas → se puede adivinar sin saber. Medido sobre 720 preguntas:
> - La correcta promedia **21.5 caracteres** vs **13.1** las incorrectas (**+64%**).
> - La correcta es la opción más larga en **37%** de los casos (azar = 25%).
> Esto invalida el diagnóstico: mediría astucia, no conocimiento.

> **Objetivo:** regenerar (o post-procesar) el banco para que la longitud de la opción NO delate cuál es la correcta. Mantener el MISMO contrato de datos (`app/src/lib/diagnostico/tipos.ts`) y la misma cobertura (720 preguntas, 5 materias, dif 1–5, con `oa`).

---

## Regla central (la que faltó)
**Las 3–4 opciones de cada pregunta deben tener longitud y nivel de detalle equivalentes.** La correcta no puede ser más elaborada, más específica ni más "de libro" que las distractoras.

Criterios verificables:
- Diferencia de longitud entre la opción más larga y la más corta ≤ ~30% (idealmente todas dentro de un rango estrecho).
- La opción correcta NO es la más larga con más frecuencia que el azar (~1/n).
- Las distractoras son plausibles: errores típicos del tema, no rellenos obviamente falsos ni cortos.
- Mismo formato entre opciones (si una es una frase, todas frases; si una lleva unidad "cm³", todas la llevan).

## Cómo lograrlo
Dos enfoques válidos (elige uno):

**A) Regenerar con la regla en el prompt.** Al pedir cada pregunta al LLM, exigir explícitamente: "las 4 opciones deben tener largo similar (±3 palabras); la correcta no debe ser la más detallada; las incorrectas deben ser errores plausibles del mismo tipo". 

**B) Post-procesar el banco actual.** Para cada pregunta, reescribir las opciones para emparejar longitudes: acortar la correcta y/o enriquecer las distractoras hasta que queden parejas, sin cambiar cuál es la correcta ni su significado.

> El contenido y la respuesta correcta NO cambian; solo se equilibra la forma de las opciones.

## Verificación (checklist) — con métrica, no a ojo
Correr un script que reporte sobre el banco final:
- [ ] Largo promedio de la correcta ≈ largo promedio de las incorrectas (diferencia < 10%).
- [ ] La correcta es la opción más larga en ≤ (100/n)% + 5 puntos (con 4 opciones: ≤ ~30%).
- [ ] Ninguna pregunta con una opción > 60% más larga que otra de la misma pregunta.
- [ ] Se mantienen: 720 preguntas, 0 ids duplicados, `correcta` en rango, dif 1–5 completas, `oa` presente.
- [ ] Muestra de 15 preguntas revisada a mano: no se puede adivinar la correcta solo por su forma.
- [ ] UTF-8 correcto (tildes y ñ intactas).

## Reporte final
Informar: métrica de longitud correcta vs incorrecta ANTES y DESPUÉS, % de veces que la correcta es la más larga, y confirmación de que el contenido/respuestas no cambiaron.
