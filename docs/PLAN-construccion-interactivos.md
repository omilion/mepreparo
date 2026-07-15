# PLAN — Construcción de Interactivos de Estudio (La Ejecución Paso a Paso)

Este documento detalla la guía de implementación técnica para construir las plantillas fijas de ejercicios interactivos en `mepreparo`.

> ⚠️ ALCANCE (decisión del usuario, ver PLAN-interactivos.md §0): los interactivos
> son EL DULCE, NO LA COMIDA (1-2 por sesión, Rai elige). **NO se construyen los 6
> tipos.**
>
> ESTADO (2026-07-15): el "escrito" se DESCARTÓ y se quitó del código — era
> redundante con el chat (pregunta-respuesta ya lo hace la conversación). Los
> interactivos quedan SOLO para lo visual/táctil. El marcador volvió a
> `<<EJERCICIO:tema>>` (siempre opción múltiple). PRÓXIMO Y ÚNICO por ahora:
> **Paso 2 — Sopa de Letras**. Los Pasos de conectar-puntos, arrastre, tabla-excel
> y laberinto de abajo son REFERENCIA TÉCNICA, NO tareas pendientes. Construir la
> sopa, verificar en tablet, commitear, y recién ahí decidir si hay un segundo.

---

## Paso 1 — ~~Ejercicio de Respuesta Escrita~~ (DESCARTADO 2026-07-15)
Se implementó y luego se **quitó**: era redundante con el chat. Pregunta-respuesta
ya lo resuelve la conversación normal, no aporta poner una tarjeta con input +
"Comprobar" para eso. Un interactivo solo justifica su andamiaje cuando la
mecánica no se puede hacer conversando (arrastrar, pintar, buscar en un grid).
Lección: no envolver en tarjeta lo que el chat ya hace.

---

## Paso 2 — Sopa de Letras con `@blex41/word-search`

### A. Contrato de Datos (Generado por Backend)
El backend instala `@blex41/word-search`. Al recibir las palabras seleccionadas por Rai para el tema, genera el grid y retorna:
```json
{
  "tipo": "sopa_letras",
  "datos": {
    "palabras": ["AGUA", "OXIGENO", "HIDROGENO"],
    "grid": [
      ["A", "G", "U", "A", "X", "Y"],
      ["H", "I", "D", "R", "O", "G"],
      // ... filas de la grilla
    ],
    "placements": [
      {"word": "AGUA", "start": [0, 0], "end": [0, 3]},
      {"word": "HIDROGENO", "start": [1, 0], "end": [1, 8]}
    ]
  }
}
```

### B. Frontend e Interacción Táctil (CSS Grid + PointerEvents)
*   **Grid:** Renderizar usando `display: grid; grid-template-columns: repeat(cols, 1fr);`.
*   **Selección:** Usar `onPointerDown`, `onPointerEnter` y `onPointerUp` en las celdas para registrar la selección por coordenadas.
*   **Renderizado Zen:** Pintar un trazo semitransparente color salvia (`rgba(91, 138, 114, 0.2)`) sobre las palabras que el alumno va seleccionando.

---

## Paso 3 — Conectar Puntos (SVG Nativo)

### A. Contrato de Datos (JSON Schema)
Las coordenadas de los puntos se expresan de `0 a 100` (relativas al ancho/alto del SVG):
```json
{
  "tipo": "conectar_puntos",
  "datos": {
    "puntos": [
      {"x": 10, "y": 20, "label": "1"},
      {"x": 30, "y": 50, "label": "2"},
      {"x": 70, "y": 50, "label": "3"},
      {"x": 50, "y": 10, "label": "4"}
    ]
  }
}
```

### B. Checker e Interacción
*   El usuario debe hacer clic o touch en los puntos en el orden del array (del índice `0` al `N`).
*   **Líneas:** Se renderiza una etiqueta `<line>` en SVG entre cada punto consecutivamente conectado.
*   **Éxito:** Cuando `puntosConectados.length === puntos.length`.

---

## Paso 4 — Arrastre de Palabras (Drag & Drop) con `@dnd-kit/core`

### A. Instalación y Sensores Táctiles
Instalar la librería principal de DnD-Kit:
```bash
npm install @dnd-kit/core
```

Configurar los sensores en el contenedor principal de la plantilla para asegurar que la tablet distinga el arrastre del scroll:
```typescript
import { useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 10 }
  })
);
```

### B. Componentes Draggable y Droppable
*   **Huecos (Droppable):** Bloques con borde punteado sutil que reciben la palabra.
*   **Fichas (Draggable):** Elementos con la propiedad CSS `touch-action: none;` aplicada condicionalmente durante el arrastre, con fondo salvia suave y esquinas redondeadas.

---

## Paso 5 — Completar Tablas (Excel Zen)

### A. Contrato de Datos (JSON Schema)
```json
{
  "tipo": "tabla_excel",
  "datos": {
    "cabeceras": ["Pregunta", "Respuesta"],
    "filas": [
      {"celdas": ["¿Cuánto es 8x7?", ""], "editables": [false, true], "soluciones": ["", "56"]},
      {"celdas": ["¿Cuánto es 9x6?", ""], "editables": [false, true], "soluciones": ["", "54"]}
    ]
  }
}
```

### B. Navegación y Estilos
*   Pintar con etiquetas nativas `<table>`, `<thead>` y `<tbody>`.
*   Usar un input sin bordes visibles, excepto un sutil borde salvia cuando tiene el `:focus`.
*   Manejar la navegación con flechas de cursor (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`) enfocando los inputs adyacentes según sus coordenadas en la matriz.

---

## Paso 6 — Laberintos con `generate-maze`

### A. Lógica en el Servidor / Creador
Instalar la librería de laberintos:
```bash
npm install generate-maze
```
El backend genera la cuadrícula y nos entrega un laberinto en formato de celdas con paredes:
```json
{
  "tipo": "laberinto",
  "datos": {
    "width": 8,
    "height": 8,
    "grid": [
      [{"x":0, "y":0, "top":true, "left":true, "bottom":false, "right":false}, ...]
    ]
  }
}
```

### B. Movimiento y Colisiones en el Cliente
*   Dibujar el laberinto como un SVG con líneas para representar las paredes activas (`top: true` dibuja una línea arriba, etc.).
*   El jugador controla una esfera verde. Con el teclado (flechas) o deslizando el dedo en la tablet (Swipe), intenta mover la esfera.
*   Antes de mover al jugador de la celda `(x, y)` a `(x', y')`, se verifica el booleano de la pared correspondiente. Si la pared está activa, el movimiento se bloquea.

---

## Paso 7 — Integración en el Chat de Rai

### A. Modificación de `Tutor.tsx`
El componente `<TarjetaEjercicioChat />` se expande con un selector dinámico:
```tsx
function TarjetaEjercicioChat({ ejercicio, onResponder }) {
  switch (ejercicio.tipo) {
    case 'escrito':
      return <PlantillaEscrita datos={ejercicio.datos} onComplete={onResponder} />;
    case 'sopa_letras':
      return <PlantillaSopaLetras datos={ejercicio.datos} onComplete={onResponder} />;
    case 'conectar_puntos':
      return <PlantillaConectarPuntos datos={ejercicio.datos} onComplete={onResponder} />;
    case 'drag_drop':
      return <PlantillaDragDrop datos={ejercicio.datos} onComplete={onResponder} />;
    case 'tabla_excel':
      return <PlantillaTablaExcel datos={ejercicio.datos} onComplete={onResponder} />;
    case 'laberinto':
      return <PlantillaLaberinto datos={ejercicio.datos} onComplete={onResponder} />;
    default:
      return <p>Tipo de ejercicio no soportado.</p>;
  }
}
```
