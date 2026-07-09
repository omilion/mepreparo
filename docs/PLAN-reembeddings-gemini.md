# Plan: Re-embeddings con Google Gemini (text-embedding-004)

> **Objetivo:** Actualizar los 9,899 chunks generados en la base de datos RAG local desde el codificador de respaldo (local-hashing) al modelo oficial multilingüe `text-embedding-004` de Google Gemini una vez que la clave de API esté disponible.
> **Destinatario:** Constructor de Inteligencia Artificial (Antigravity/Gema).

---

## 1. Contexto y Justificación
Actualmente, la base documental en `base-documental/_rag/chunks.jsonl` cuenta con embeddings generados localmente mediante un algoritmo determinista de hash *bag-of-words*. Aunque este método es útil para pruebas iniciales sin conexión a red y pasa con éxito test de palabras clave idénticas, **carece de entendimiento semántico profundo** (sinónimos, contexto o paráfrasis).

Para lograr que el tutor responda de forma fluida y comprenda las preguntas naturales de los niños, debemos migrar los vectores al modelo oficial `text-embedding-004` (dimensión 768) de Google.

---

## 2. Requisitos de la API de Gemini
Para realizar la codificación, llamaremos al endpoint oficial de embeddings de Gemini:
- **Modelo:** `text-embedding-004`
- **Dimensión:** 768
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${API_KEY}`
- **Payload de Entrada:**
  ```json
  {
    "content": {
      "parts": [{ "text": "Texto del chunk a vectorizar" }]
    }
  }
  ```
- **Respuesta Esperada:**
  ```json
  {
    "embedding": {
      "values": [0.012, -0.045, ...]
    }
  }
  ```

---

## 3. Pipeline de Actualización (Idempotente e incremental)
Dado que procesar 9,899 chunks por la red puede tomar tiempo y generar costos, el script de actualización debe ser robusto y seguir estos pasos:

1. **Detección de Clave de API:**
   - Verificar si `GEMINI_API_KEY` o `GOOGLE_API_KEY` está presente en las variables de entorno. De no estarlo, detener la ejecución con un mensaje explicativo claro.
2. **Lectura Incremental (Evitar duplicar costos):**
   - Leer el archivo actual [`base-documental/_rag/chunks.jsonl`](file:///c:/Users/flipe/OneDrive/Documentos/mepreparo/base-documental/_rag/chunks.jsonl).
   - Identificar qué chunks ya fueron vectorizados con `text-embedding-004` (verificación de metadato `modelo_embedding`).
3. **Control de Flujo y Rate Limiting:**
   - Gemini API tiene límites de cuota (ej: 1,500 solicitudes por minuto).
   - Implementar un retraso de cortesía (~40ms entre solicitudes) para mantenernos debajo del límite de velocidad.
   - Implementar manejo de errores con reintentos y retroceso exponencial (exponential backoff) para errores `429` (Too Many Requests).
4. **Escritura Segura:**
   - Escribir los resultados en un archivo temporal `chunks.jsonl.tmp`.
   - Reemplazar el archivo original una vez completado el procesamiento sin pérdidas de datos en caso de corte o interrupción.

---

## 4. Estructura de Metadatos del Chunk Actualizado
Cada línea en `chunks.jsonl` debe mantener la estructura oficial definida agregando la especificación del modelo:
```json
{
  "id": "matematica_7basico_programa_p12_c03",
  "materia": "matematica",
  "curso": "7basico",
  "tipo": "programa_estudio",
  "fuente_archivo": "matematica/programa_matematica_7basico.pdf",
  "pagina": 12,
  "texto": "…texto real del chunk…",
  "embedding": [ ... ],
  "modelo_embedding": "text-embedding-004"
}
```

---

## 5. Plan de Verificación (Checklist)
- [ ] El script inicia y finaliza correctamente detectando la API key.
- [ ] No se vuelven a procesar chunks que ya tienen el metadato `"modelo_embedding": "text-embedding-004"`.
- [ ] El número total de chunks en `chunks.jsonl` se mantiene exactamente en 9,899.
- [ ] **Prueba de Sinonimia / Semántica:** Buscar *"ejercicios de adición"* sin que el texto contenga exactamente esa palabra clave, debe emparejar con chunks que contengan *"sumas"* y *"adiciones"*.
- [ ] El archivo de reporte [`base-documental/_rag/reporte.json`](file:///c:/Users/flipe/OneDrive/Documentos/mepreparo/base-documental/_rag/reporte.json) se actualiza reflejando el nuevo modelo de embeddings utilizado.
