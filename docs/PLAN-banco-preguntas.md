# Plan: generar el banco de preguntas del diagnóstico (desde el RAG)

> **Para:** agente constructor (Gema).
> **Objetivo:** generar un banco grande de preguntas de opción múltiple para el **diagnóstico adaptativo**, ancladas al currículum oficial (usando la base RAG ya procesada), cumpliendo EXACTAMENTE el formato que el motor de la app ya espera.
> **El motor ya está construido y probado.** Solo necesita este banco para dejar de usar el banco semilla.

---

## 0. Contrato de datos (OBLIGATORIO, no cambiar)
Cada pregunta es un objeto con esta forma (definida en `app/src/lib/diagnostico/tipos.ts`):

```json
{
  "id": "mat_5b_frac_003",
  "materia": "matematica",
  "curso": "5basico",
  "dificultad": 3,
  "tema": "fracciones",
  "enunciado": "Sofía comió 3 de 8 porciones de pizza. ¿Qué fracción comió?",
  "opciones": ["3/8", "8/3", "3/5", "5/8"],
  "correcta": 0,
  "oa": "MA05 OA 07"
}
```
Reglas del formato:
- `materia`: uno de `matematica | lenguaje | ciencias | historia | ingles`.
- `curso`: uno de `1basico … 8basico`.
- `dificultad`: entero **1 a 5** (1 = muy fácil, 5 = desafiante para el nivel).
- `tema`: slug corto en minúscula con guion_bajo (agrupa por OA/habilidad). **Reusar** los mismos slugs dentro de una materia para que las brechas se agrupen bien (ej. siempre `fracciones`, no a veces `fraccion`).
- `opciones`: 3 o 4 strings. Una sola correcta.
- `correcta`: índice 0-based de la opción correcta.
- `oa`: opcional pero deseable — el código del Objetivo de Aprendizaje oficial (trazabilidad).

## 1. Cobertura objetivo
Para **cada materia** y **cada curso 1°–8°** (según lo que exista en el RAG):
- Al menos **4 preguntas por cada nivel de dificultad (1–5)** → ~20 por materia/curso.
- Distribuidas entre los **temas/OA principales** del curso (no todas del mismo tema).
- Total estimado: varios miles. Priorizar 5° a 8° básico primero (son los cursos con exámenes libres más frecuentes).

## 2. Cómo generarlas (ancladas al currículum)
1. Para cada (materia, curso), recuperar del RAG (`base-documental/_rag/`) los chunks de esa materia/curso (usar los metadatos para filtrar). Dar peso a los chunks de `tipo: temario_examen_libre` (es lo que se evalúa).
2. A partir del texto oficial de esos OA, redactar preguntas de opción múltiple **fieles al contenido** (no inventar temas fuera del currículum).
3. Asignar `dificultad` según la demanda cognitiva (recordar=1–2, aplicar=3, analizar/resolver problemas=4–5).
4. Asignar `tema` coherente (mismo slug para el mismo OA).
5. Verificar que la opción `correcta` es inequívoca y las distractoras son plausibles pero incorrectas.

> Si se usa un LLM (Gemini) para redactar, revisar una muestra a mano: el enunciado debe ser resoluble solo con el enunciado, sin ambigüedad, y la respuesta correcta debe ser realmente correcta.

## 3. Salida
- Un archivo **`app/src/lib/diagnostico/banco.json`** con un arreglo JSON de preguntas (el contrato de §0).
- Opcional: dividir por materia si crece mucho (`banco.matematica.json`, …) — avisar para ajustar el import.

## 4. Verificación (checklist)
- [x] Todas las preguntas validan contra el tipo (campos presentes, `correcta` dentro del rango de `opciones`).
- [x] `dificultad` ∈ 1..5; hay preguntas de TODOS los niveles por materia/curso.
- [x] No hay `id` duplicados.
- [x] Los `tema` se reutilizan consistentemente (no sinónimos sueltos).
- [x] Muestra revisada a mano (10 por materia): la correcta es correcta y el enunciado no es ambiguo.
- [x] Ninguna pregunta pide conocimiento fuera del currículum del curso.

## 5. Integración (lo hace el equipo de la app, no Gema)
Cuando `banco.json` exista, en la app se cambia el import del banco semilla por el banco real en `Diagnostico.tsx` / donde se consuma. El motor NO cambia.

## 6. Reporte final
Informar: nº de preguntas por materia y por dificultad, cursos cubiertos, y resultado de la revisión manual de la muestra.
