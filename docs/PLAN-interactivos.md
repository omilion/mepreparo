# PLAN — Decisiones de Interactivos de Estudio (El Qué y El Porqué)

Este documento registra las decisiones estratégicas y de arquitectura técnica para la implementación de ejercicios interactivos en el tutor de IA (Rai) de `mepreparo`.

---

## 0. ⭐ EL ROL: EL DULCE, NO LA COMIDA (decisión del usuario — manda sobre todo)
Los interactivos son un **condimento ocasional**, NO el mainstream. El CORE del
estudio sigue siendo la conversación + opción múltiple + respuesta escrita.
- **Dosis: 1 o 2 por sesión**, integrados en el RITMO de la clase (como un profe
  que alterna explicar / preguntar / hacer una actividad). NO son un premio
  colgado al final ni algo en cada turno. La rareza ES la feature.
- **RAI ELIGE** cuándo lanzarlos y de qué tipo, por criterio pedagógico (no un
  tema→juego fijo, no al azar). En el código: el marcador
  `<<EJERCICIO:tema:formato>>` lleva el formato que Rai decide.
- **NO construir los 6 tipos.** El "escrito" se DESCARTÓ (2026-07-15): era
  redundante con el chat normal — pregunta-respuesta ya lo hace la conversación,
  no hace falta una tarjeta para eso. Los interactivos son SOLO lo visual/táctil,
  donde la mecánica misma es el punto (arrastrar, pintar, buscar en un grid). El
  CORE de pregunta-respuesta queda cubierto por conversación + opción múltiple.
- **Primer (y único, por ahora) interactivo visual: SOPA DE LETRAS.** El resto
  (pinta-fracción, arrastra-palabra, tabla-excel, laberinto, conectar-puntos)
  queda POSPUESTO — el catálogo de abajo es el universo POSIBLE, no una lista de
  tareas. Construir la sopa, verificar en tablet, y recién ahí decidir el segundo.

## 1. El Objetivo y la Filosofía Zen

El tutor de IA (Rai) puede complementar la conversación escrita con **algún
ejercicio dinámico ocasional** (ver dosis en §0). El catálogo posible incluye
completar tablas, sopa de letras, conectar puntos, arrastrar palabras, laberintos
— pero solo se construyen 2-3, no todos.

Para no traicionar la **estética Zen** (minimalista, limpia y enfocada en evitar la sobreestimulación de los niños), nos autoimponemos las siguientes reglas de diseño:
*   **Mecánica, nunca apariencia:** Las librerías externas se eligen exclusivamente por su motor de cálculo o eventos (lógica). La apariencia visual (colores salvia, tipografías, bordes sutiles, espaciados) es 100% controlada por nosotros con CSS Vanilla o SVG nativos.
*   **Cero distractores:** No usaremos animaciones ruidosas, colores estridentes ni barras de herramientas comerciales (como las que traen Handsontable o Jspreadsheet).

---

## 2. Decisiones de Arquitectura Clave

### Decisión A: Plantillas React Fijas (IA Parametrizada, no Generativa)
La IA de Gemini **nunca generará código (React, JS o HTML) al vuelo**. Esto es costoso, lento de renderizar, inseguro y propenso a romper la UI.
*   **El Modelo:** Diseñamos plantillas fijas en React (ej. plantilla de sopa de letras, plantilla de arrastrar palabras). 
*   **Los Parámetros:** La IA solo genera los parámetros en formato JSON (ej. la lista de palabras, la oración con huecos). El cliente React recibe el JSON y lo monta sobre el molde correspondiente de forma instantánea y segura.

### Decisión B: Biblioteca de Ejercicios (Embudo de Costos / Caché de Costo Cero)
Para no consumir la cuota de la API de Gemini innecesariamente:
1.  La primera vez que un niño solicita ejercitar un tema, Rai genera el ejercicio (JSON parametrizado) mediante IA.
2.  Este JSON se valida en el backend y se guarda en la base de datos de la **biblioteca de ejercicios**.
3.  Las siguientes veces que cualquier niño pida ejercitar el mismo tema, el sistema sirve el ejercicio desde la base de datos de manera inmediata y gratuita, reduciendo los costos de la API a cero para el 80% de los casos.

### Decisión C: Aislamiento del Final 20% (Iframes Sandbox)
Para el 80% de los casos usaremos las plantillas React fijas. Para el 20% restante de minijuegos visuales complejos o código externo de seguimiento:
*   Se aíslan en un `<iframe>` usando `srcdoc` con atributos de seguridad `sandbox`.
*   El iframe se comunica con el contenedor React mediante mensajes seguros (`window.parent.postMessage`).
*   **Regla de Oro:** Ningún HTML dinámico llega al cliente sin haber sido validado previamente en la biblioteca.

---

## 3. Catálogo de Librerías Seleccionadas (Internet Research)

Tras investigar el ecosistema de paquetes NPM, seleccionamos las siguientes herramientas para resolver las mecánicas sin reinventar la rueda:

### 1. Arrastre de Palabras (Drag & Drop) → **`@dnd-kit/core`**
*   **Por qué:** Es una librería *headless* (sin estilos) y extremadamente ligera.
*   **Soporte Tablets:** Es la única que maneja sensores de tacto de forma nativa sin requerir plugins complejos. Nos permite configurar una restricción de activación (`delay` de 250ms y `tolerance` de 10px) para que el niño pueda hacer scroll en la tablet de forma natural sin que el arrastre de elementos bloquee la página.

### 2. Sopa de Letras → **`@blex41/word-search`**
*   **Por qué:** A diferencia de otras librerías básicas, esta nos devuelve un array de objetos detallado con las coordenadas de inicio, fin y el camino de celdas que recorre cada palabra oculta. Esto facilita el pintado del resaltador en React.
*   **Seguridad:** Incluye un filtro nativo de palabras prohibidas (`forbiddenWords`) para evitar que la generación aleatoria de letras forme insultos por accidente.

### 3. Laberintos → **`generate-maze`**
*   **Por qué:** Implementa el algoritmo de Eller (mazes perfectos sin bucles). Nos devuelve una matriz limpia con booleanos indicando qué paredes están activas (`top`, `bottom`, `left`, `right`), la cual podemos renderizar fácilmente usando SVG o CSS Grid.

### 4. Tablas Tipo Excel → **`@tanstack/react-table`**
*   **Por qué:** Handsontable y jExcel son extremadamente pesadas y traen estilos visuales rígidos. TanStack Table maneja la lógica pura de la edición de celdas, navegación y estados, dejándonos el control del diseño de los inputs a nosotros.

### 5. Conectar Puntos → **SVG Nativo + React**
*   **Por qué:** Las librerías de NPM están pensadas para flujogramas dinámicos (como `react-xarrows`), no para juegos escolares estáticos. Un SVG en React con coordenadas de 0 a 100 y líneas dinámicas es la solución más ligera y responsive posible.
