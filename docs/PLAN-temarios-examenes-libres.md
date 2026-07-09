# Plan: descargar los 8 Temarios de Exámenes de Validación de Estudios (Básica 1°–8°)

> **Para:** agente ejecutor (Gema).
> **Objetivo:** completar las 8 entradas `PENDIENTE-MANUAL` de la categoría `_temarios_examenes_libres` en la base documental.
> **Por qué importan:** el temario del Examen de Validación de Estudios es LO QUE EFECTIVAMENTE SE EVALÚA en el examen libre. Alinea el estudio al examen real; es contenido prioritario para el tutor.

---

## 0. Reglas
1. Solo fuente oficial: **ayudamineduc.cl** (y si redirige, dominios `mineduc.cl`).
2. Verificar que cada PDF corresponde al **curso correcto** (1° a 8° básico) y es la **versión vigente** (año escolar actual / más reciente publicado).
3. No inventar URLs: si un temario no tiene enlace directo estable, marcar el detalle en el índice.

---

## 1. Dónde buscar
- Página base conocida: `https://www.ayudamineduc.cl` → sección **Exámenes de Validación de Estudios** / **Educación Básica**.
- Pista de patrón de URL ya visto en la investigación previa:
  `https://ayudamineduc.cl/sites/default/files/temario_basica_<N>deg_basico_uce_0.pdf`
  (ejemplo real observado: `temario_basica_7deg_basico_uce_0.pdf` para 7° básico).
- Procedimiento por curso (1 a 8):
  1. Buscar: `ayudamineduc temario examenes validacion estudios <N> basico pdf`.
  2. Confirmar el enlace oficial y que el PDF abre con el temario del curso correcto.
  3. Anotar año/versión.

---

## 2. Destino y nombres
Descargar en `base-documental/_temarios_examenes_libres/` con nombre:
```
temario_1basico.pdf
temario_2basico.pdf
...
temario_8basico.pdf
```
(minúscula, sin tildes ni espacios — igual que el resto de la base).

---

## 3. Actualizar el índice
Por cada temario descargado, en `indice.json` **y** `INDICE.md`:
- Cambiar `estado` de `PENDIENTE-MANUAL` → `OK`.
- Poner la `url_oficial` real (reemplazar el placeholder `https://www.ayudamineduc.cl`).
- Poner el `anio` real del temario.
- Confirmar que `archivo_local` apunta al PDF descargado.

---

## 4. Verificación final (checklist)
- [x] Los 8 archivos existen y empiezan con `%PDF-` (son PDFs reales, no páginas de error).
- [x] Ningún archivo pesa sospechosamente poco.
- [x] Cada temario corresponde al curso que dice su nombre.
- [x] `INDICE.md` e `indice.json` sincronizados; el resumen de cobertura se actualiza (OK sube de 38, PENDIENTE baja de 12).
- [x] Si algún temario NO se pudo obtener, se deja registrado con el motivo (no se marca OK a la fuerza).


---

## 5. Reporte final
Informar: cuántos de los 8 se descargaron OK, cuáles quedaron pendientes y por qué, y el nuevo total de cobertura de la base.
