# Plan: procesar la base documental para RAG (cerebro del tutor)

> **Para:** agente constructor (Gema).
> **Objetivo:** convertir los 46 PDFs oficiales de `base-documental/` en una base de conocimiento consultable (chunks + embeddings) que el tutor use para responder anclado al currículum, sin alucinar.
> **Entregable:** un dataset de chunks con metadatos + sus embeddings, más un reporte.

---

## 0. Reglas de oro
1. **Fidelidad al texto oficial.** No resumir ni reescribir el contenido de los PDFs al extraer. El chunk debe contener texto real del documento (limpio, pero no parafraseado).
2. **Todo chunk lleva metadatos** que permitan filtrar antes de buscar (materia, curso, tipo). Esto reduce el costo y mejora la precisión.
3. **Manejar los PDFs consolidados con cuidado** (ver §3): los de 1° y 4° básico contienen VARIAS materias en un mismo archivo; hay que separarlas.
4. **Idempotente:** poder re-ejecutar sin duplicar chunks (usar un id estable por chunk).

---

## 1. Entrada
- Carpeta `base-documental/` con los PDFs.
- `base-documental/indice.json` como fuente de verdad de qué es cada archivo (materia, curso, tipo, estado). Procesar SOLO las entradas con `estado: "OK"`.

## 2. Pipeline por documento
Para cada entrada `OK` del índice:
1. **Extraer texto** del PDF (por página, conservando el nº de página).
2. **Limpiar**: quitar encabezados/pies repetidos, numeración suelta, saltos de línea rotos a media palabra. NO borrar el contenido curricular (Objetivos de Aprendizaje, indicadores, actividades).
3. **Chunkear** en trozos de ~500–800 tokens con solapamiento de ~80 tokens, respetando límites naturales (no cortar a mitad de un OA). Preferir cortar por secciones/OA cuando el documento lo permita.
4. **Adjuntar metadatos** a cada chunk (ver §4).
5. **Generar embedding** de cada chunk (ver §5) y guardarlo.

## 3. Caso especial: PDFs consolidados (1° y 4° básico)
Archivos `_bases_curriculares/programa_consolidado_1basico.pdf` y `..._4basico.pdf` (y Historia 2° en `..._2basico.pdf`) agrupan varias materias en un solo PDF.
- Detectar dentro del texto las secciones por materia (buscar títulos como "Matemática", "Lenguaje y Comunicación", "Ciencias Naturales", "Historia, Geografía y Ciencias Sociales").
- Al chunkear, asignar a cada chunk la **materia correcta** según la sección donde cae, NO la del nombre de archivo.
- Si una sección no se puede delimitar con confianza, marcar esos chunks con `materia: "revisar"` en vez de adivinar.

## 4. Metadatos por chunk (obligatorio)
```json
{
  "id": "matematica_7basico_programa_p12_c03",
  "materia": "matematica",
  "curso": "7basico",
  "tipo": "programa_estudio",        // o "bases_curriculares" | "temario_examen_libre"
  "fuente_archivo": "matematica/programa_matematica_7basico.pdf",
  "pagina": 12,
  "texto": "…texto real del chunk…"
}
```
- `materia`, `curso`, `tipo`, `fuente_archivo` se toman del `indice.json` (salvo consolidados, §3).
- El `tipo: "temario_examen_libre"` es PRIORITARIO: marca lo que se evalúa en el examen. Conviene poder darle más peso en la búsqueda.

## 5. Embeddings
- Usar un modelo de embeddings **económico y multilingüe** (español). Sugerencia: `text-embedding-004` de Google (coherente con que el tutor usa Gemini) u otro equivalente. Confirmar dimensión y guardarla.
- Generar embeddings **una sola vez** (costo fijo). Guardar junto al chunk.

## 6. Salida / almacenamiento
Elegir UNA y dejarla documentada:
- **Opción A (recomendada para la app):** tabla en Postgres/Supabase con `pgvector` — columnas = los metadatos de §4 + `embedding vector`.
- **Opción B (portátil):** un archivo `base-documental/_rag/chunks.jsonl` (un chunk por línea con su embedding) + índice vectorial local (ej. FAISS/hnswlib).
Dejar el resultado en `base-documental/_rag/`.

## 7. Verificación (checklist)
- [x] Nº de chunks > 0 para cada entrada `OK` del índice.
- [x] Todo chunk tiene los 6 campos de metadatos y un `texto` no vacío.
- [x] Los consolidados quedaron repartidos por materia (spot-check de 3 chunks por materia).
- [x] Ninguna materia quedó con 0 chunks salvo las esperadas.
- [x] Prueba de búsqueda: para la consulta *"cómo sumar fracciones"* los primeros resultados son de `materia: matematica`.
- [x] Prueba de filtro: buscar con filtro `tipo: temario_examen_libre, curso: 7basico` devuelve solo ese temario.


## 8. Reporte final
Informar: nº total de chunks, nº por materia y por tipo, modelo de embeddings y dimensión usados, dónde quedó almacenado (A o B), y cualquier chunk marcado `materia: "revisar"` para revisión humana.
