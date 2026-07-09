# Plan de investigación: Base documental oficial MINEDUC — mepreparo

> **Para:** agente constructor que ejecutará la investigación y descarga.
> **Objetivo:** construir la base documental oficial y verificable que servirá de conocimiento base (RAG) para el tutor IA de la app **mepreparo**.
> **Alcance:** Educación **Básica, 1° a 8°**, 5 materias: **Matemática, Lenguaje (Lenguaje y Comunicación), Ciencias (Naturales), Historia (Historia, Geografía y Cs. Sociales), Inglés**.
> **Entregable:** PDFs oficiales descargados + un **índice maestro** que los organiza.

---

## 0. Reglas de oro (leer primero)

1. **Solo fuentes oficiales.** Únicamente `curriculumnacional.cl` (Unidad de Currículum y Evaluación, MINEDUC) y `bibliotecadigital.mineduc.cl`. NO usar educrea, recursosparaprofesores, blogs ni terceros — solo sirven como pista para llegar al oficial.
2. **Verificar antes de descargar.** Cada PDF debe corresponder a la materia y curso correctos, y ser la **versión vigente**. Anotar año/versión.
3. **No inventar URLs.** Si no encuentras la URL directa de un documento, márcalo como `PENDIENTE-MANUAL` en el índice en vez de adivinar.
4. **Registrar TODO en el índice** aunque un documento no exista para cierto curso.

---

## 1. Documentos a buscar por cada materia × curso

Para **cada una de las 5 materias**, y para **cada curso de 1° a 8° básico**, buscar estos documentos (en orden de prioridad):

| Prioridad | Documento | Por qué lo queremos |
|---|---|---|
| 1 | **Programa de Estudio** (por materia y curso) | Contiene los Objetivos de Aprendizaje (OA) desarrollados, unidades y actividades. Es el corazón del contenido. |
| 2 | **Bases Curriculares** (tramo 1°–6° y tramo 7°–8°) | Documento marco con los OA oficiales. Un PDF cubre varios cursos. |
| 3 | **Priorización Curricular / Fichas pedagógicas** (si existe por curso) | Qué OA son prioritarios — útil para enfocar el estudio hacia el examen libre. |
| 4 | **Temario de Exámenes de Validación de Estudios** (por curso) | MUY relevante: es lo que efectivamente evalúan los exámenes libres. Vive en ayudamineduc.cl / uce. |

> Nota estructural: Las **Bases Curriculares** se publican por tramos, no por curso:
> - Tramo **1° a 6° básico**: un documento por conjunto.
> - Tramo **7° básico a 2° medio**: otro documento (incluye 7° y 8°).
> No dupliques descargas: baja el documento de tramo una vez y refléjalo en el índice para todos los cursos que cubre.

---

## 2. Cómo encontrar cada documento (método verificado)

**Patrón de URL directa confirmado** para programas de estudio:
```
https://www.curriculumnacional.cl/614/articles-{ID}_programa.pdf
```
Ejemplo real verificado: Matemática 7° básico → `articles-18982_programa.pdf`.

**Patrón para Bases Curriculares:**
```
https://www.curriculumnacional.cl/614/articles-{ID}_bases.pdf
```
Ejemplo real verificado: Bases 1°–6° → `articles-22394_bases.pdf`.

**Procedimiento por documento:**
1. Buscar en web: `curriculumnacional.cl programa de estudio <materia> <curso> básico pdf`.
2. Entrar a la **página índice** de esa materia×curso, del tipo:
   `https://www.curriculumnacional.cl/curriculum/7o-basico-2o-medio/<materia>/<curso>-basico`
3. Extraer de esa página el enlace directo `...articles-{ID}_programa.pdf`.
4. Verificar (abrir/inspeccionar cabecera del PDF) que el título del documento coincide con materia y curso.
5. Anotar en el índice: materia, curso, tipo de documento, título oficial, año/versión, URL directa, y estado (`OK` / `PENDIENTE-MANUAL`).

---

## 3. Estructura de carpetas de destino

Descargar dentro de `base-documental/` (ya creada), con esta convención de nombres:

```
base-documental/
  matematica/
    programa_matematica_1basico.pdf
    programa_matematica_2basico.pdf
    ...
    bases_matematica_1a6.pdf        (o el archivo de tramo correspondiente)
  lenguaje/
  ciencias/
  historia/
  ingles/
  _bases_curriculares/              (documentos de tramo que cubren varias materias/cursos)
    bases_1a6basico.pdf
    bases_7basico_2medio.pdf
  _temarios_examenes_libres/        (temarios de validación de estudios por curso)
    temario_7basico.pdf
    ...
```

Nombre de archivo: `<tipo>_<materia>_<curso>.pdf`, todo en minúscula, sin tildes ni espacios.

---

## 4. El índice maestro (entregable principal)

Crear `base-documental/INDICE.md` **y** `base-documental/indice.json`.

### `INDICE.md` — legible para humanos
Una tabla por materia con columnas:
`Curso | Documento | Título oficial | Año/Versión | Archivo local | URL oficial | Estado`

Más un encabezado con: fecha de la investigación, fuente(s) oficiales usadas, y resumen de cuántos documentos se obtuvieron vs. pendientes.

### `indice.json` — para que la app lo consuma
Array de objetos, un objeto por documento:
```json
{
  "materia": "matematica",
  "curso": "7basico",
  "tipo": "programa_estudio",
  "titulo_oficial": "Programa de Estudio Matemática 7° básico",
  "anio": "2016",
  "archivo_local": "matematica/programa_matematica_7basico.pdf",
  "url_oficial": "https://www.curriculumnacional.cl/614/articles-18982_programa.pdf",
  "estado": "OK"
}
```

---

## 5. Verificación final (checklist antes de entregar)

- [ ] Existe una fila en el índice para cada materia × curso × tipo prioritario (aunque sea `PENDIENTE-MANUAL`).
- [ ] Todos los `estado: OK` tienen archivo local existente y de tamaño > 0.
- [ ] Ningún archivo pesa sospechosamente poco (posible página de error en vez del PDF).
- [ ] Las URLs son de dominio oficial (`curriculumnacional.cl` / `mineduc.cl`).
- [ ] `INDICE.md` e `indice.json` están sincronizados (mismos documentos).
- [ ] Se listaron explícitamente los documentos `PENDIENTE-MANUAL` para que el usuario los baje a mano.

---

## 6. Resumen del trabajo (reporte final que debe entregar el agente)

Al terminar, el agente reporta:
- Nº total de documentos objetivo, nº descargados OK, nº pendientes manuales.
- Cualquier hallazgo sobre versiones/vigencia (ej: "Bases de Ciencias 7°–8° están en el documento de tramo 7°–2°medio").
- Recomendación sobre qué falta para poder empezar la fase de RAG.
