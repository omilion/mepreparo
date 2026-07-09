# Arquitectura técnica — mepreparo

> PWA de estudio con tutor IA para exámenes libres (educación básica, Chile).
> Principio rector: **"IA in the middle"** — la app hace el trabajo pesado con contenido pregenerado y reglas; la IA solo entra cuando aporta valor real, con prompts cortos.

---

## 1. Visión de una frase

Una PWA zen donde el **padre configura** con precisión → la app hace un **diagnóstico adaptativo** → se genera un **perfil del niño** → un **plan de estudio con fecha límite** → y un **tutor IA (Gemini Flash + RAG)** acompaña, gastando pocos tokens.

---

## 2. Stack propuesto

| Capa | Elección | Por qué |
|---|---|---|
| **Frontend / PWA** | **Next.js (App Router) + React + TypeScript**, instalable como PWA | SSR/SSG, buen offline, un solo lenguaje front+back. Estética zen con Tailwind. |
| **UI / estilo** | **Tailwind CSS** + componentes propios minimalistas | Control total del look "zen": mucho espacio, tipografía calma, pocas acciones por pantalla. |
| **Estado local / perfil** | **IndexedDB** (vía Dexie) para perfil y progreso offline | El perfil del niño vive local primero → privacidad y 0 llamadas de red para leerlo. |
| **Backend / API** | **Next.js Route Handlers** (serverless) | El "middle" vive aquí: decide caché vs. IA, arma prompts, nunca expone la API key. |
| **Base de datos** | **Supabase (Postgres)** o SQLite si se quiere ultraligero | Cuentas, perfiles, progreso sincronizado, caché de respuestas IA. |
| **Auth** | Supabase Auth (email del padre) | El padre es el dueño de la cuenta; los hijos son perfiles bajo esa cuenta. |
| **Motor IA** | **Gemini Flash** vía API, detrás del backend | Económico. Ver §6 para elección de variante y control de costo. |
| **Contenido base (RAG)** | PDFs oficiales MINEDUC → chunked + embeddings | La base documental que ya se está preparando. Fuente de verdad del tutor. |

> Nota: el stack es una recomendación sensata; si prefieres algo más simple (ej. Vite + React sin Next), se puede. Next se elige por PWA + backend en un solo proyecto.

---

## 3. Las 3 capas del "IA in the middle" (el corazón)

Cada vez que el niño necesita algo, el **middle** (en el backend) resuelve en este orden:

```
Petición del niño
      │
      ▼
┌─────────────────────────────────────────────┐
│ CAPA 1 — Contenido pregenerado (0 tokens)   │
│ Lecciones, ejercicios, explicaciones base    │
│ ya creadas desde el currículum. ¿Responde?   │──sí──▶ devolver
└─────────────────────────────────────────────┘
      │ no
      ▼
┌─────────────────────────────────────────────┐
│ CAPA 2 — Caché semántica (0 tokens)         │
│ ¿Alguien ya preguntó algo muy parecido?      │──sí──▶ devolver respuesta cacheada
│ (búsqueda por embedding de la pregunta)      │
└─────────────────────────────────────────────┘
      │ no
      ▼
┌─────────────────────────────────────────────┐
│ CAPA 3 — Gemini en vivo (tokens acotados)   │
│ Prompt = perfil resumido (2-3 líneas)        │
│        + fragmento RAG relevante             │
│        + la pregunta                          │
│ Respuesta se GUARDA en caché (capa 2)        │
└─────────────────────────────────────────────┘
```

Efecto: con el uso, la capa 2 crece y las llamadas reales a Gemini bajan. El costo tiende a la baja.

---

## 4. El perfil del niño (lo mantiene la APP, no la IA)

Objeto que vive en IndexedDB + sincronizado a Postgres. Se actualiza con **reglas simples**, sin gastar tokens:

```json
{
  "id": "hijo-1",
  "nombre": "Sofía",
  "curso": "5basico",
  "examen": { "fecha": "2026-11-20", "materias": ["matematica","lenguaje","ciencias"] },
  "disponibilidad": { "horas_semana": 6 },
  "contexto": { "intereses": ["animales","dibujo"], "aprende_mejor": "con ejemplos visuales" },
  "diagnostico": {
    "matematica": { "nivel": 0.42, "brechas": ["fracciones","division"] },
    "lenguaje":   { "nivel": 0.71, "brechas": ["inferencias"] }
  },
  "ritmo": { "aciertos_seguidos": 3, "velocidad_media_seg": 24 },
  "plan": { "horas_estimadas_total": 48, "horas_hechas": 5, "en_ritmo": true }
}
```

Cuando SÍ llamamos a Gemini, le pasamos solo un **resumen** de esto (ej: *"Sofía, 5° básico, se traba en fracciones, le gustan los animales, aprende con ejemplos visuales"*) → prompt corto, personalización alta.

---

## 5. Flujo de la app (orden que definiste)

1. **Setup del padre** (preciso → calibra todo):
   - Datos del hijo + **curso**.
   - **Materias a rendir** (subset de las 5).
   - **Fecha del examen**.
   - **Horas disponibles/semana**.
   - **Contexto del niño** (intereses, fortalezas, cómo aprende).
2. **Diagnóstico adaptativo** (por materia):
   - Preguntas **pregeneradas** que ajustan dificultad según respuestas (0 tokens).
   - Produce `diagnostico.nivel` y `brechas` por materia.
3. **Cálculo del plan**:
   - `horas_estimadas = f(brechas, nivel, materias)`; se contrasta con `horas_semana` y `fecha_examen`.
   - Resultado: "necesitas X horas → con tus 6 h/semana llegas con holgura / justo / apretado".
4. **Home del tutor (zen)**:
   - Qué toca hoy, progreso hacia la fecha, y el tutor disponible para dudas.
5. **Estudio + tutor**:
   - Lecciones/ejercicios pregenerados; el tutor IA (capas 1→2→3) resuelve dudas.

---

## 6. Control de costo de Gemini (decisión de variante)

Precios de referencia (jul 2026, verificar al integrar):

| Modelo | Input /1M | Output /1M | Uso sugerido |
|---|---|---|---|
| **Gemini 2.5 Flash-Lite** | ~$0.10 | ~$0.40 | Dudas simples, reformulaciones. El caballo de batalla. |
| **Gemini 2.5 Flash** | ~$0.30 | ~$2.50 | Explicaciones complejas donde se nota la calidad. |
| **Gemini 3 Flash** | ~$0.50 | (verificar) | Opcional, si se quiere más capacidad. |

Estrategia de costo:
- **Enrutar por dificultad**: la mayoría de dudas → Flash-Lite; solo lo difícil → Flash.
- **Caché de contexto** de Gemini (~10x más barato) para el bloque de sistema/RAG estable.
- **Cap de tokens de salida** por respuesta (respuestas concisas y claras, no ensayos).
- **Límite diario por hijo** configurable por el padre (evita sorpresas de gasto).

---

## 7. RAG sobre la base documental

1. Tomar los PDFs oficiales (`base-documental/`) → extraer texto → **chunkear** por OA/sección.
2. Generar **embeddings** de cada chunk → guardar en Postgres (pgvector) o índice local.
3. En una duda, buscar los 2-3 chunks más relevantes → inyectarlos en el prompt de capa 3.
4. Así el tutor responde **anclado al currículum oficial** (no alucina) y con poco texto.

> Los embeddings se generan **una sola vez** al ingerir la base → costo fijo bajo, no recurrente.

---

## 8. Privacidad (son niños — importa)

- Datos mínimos, el padre es el titular de la cuenta.
- El perfil vive local (IndexedDB) y se sincroniza cifrado.
- La API key de Gemini **nunca** en el frontend: siempre detrás del backend.
- Sin publicidad ni tracking de terceros.

---

## 9. Orden de construcción sugerido (fases)

1. **Fase 0** — Base documental lista (en curso por el equipo).
2. **Fase 1** — Setup del padre + modelo de perfil (sin IA todavía).
3. **Fase 2** — Diagnóstico adaptativo + cálculo del plan (sin IA, pregenerado).
4. **Fase 3** — Home zen + estudio con contenido pregenerado (capa 1).
5. **Fase 4** — Tutor IA: RAG + capas 2 y 3 (entra Gemini).
6. **Fase 5** — Caché semántica, enrutado por costo, límites del padre.

Cada fase entrega algo usable. La IA recién aparece en Fase 4, cuando la base ya sostiene todo.
```
