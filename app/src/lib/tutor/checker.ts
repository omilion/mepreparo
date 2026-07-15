import { tieneClave, generar, MODELO_LITE } from "./gemini";

interface EjercicioGenerado {
  enunciado: string;
  datos: Record<string, any>;
  formula?: string;
  solucionPasoAPaso: string[];
  respuestaFinal: string;
  opciones?: string[];
  respuestasCorrectas?: string[]; // solo selección múltiple
  tipoPlantilla?: string;
}

// Evalúa una expresión matemática simple de forma segura
export function evaluarFormula(formula: string, datos: Record<string, number>): number | null {
  try {
    let expresion = formula;
    // Reemplazar variables en la fórmula con sus valores numéricos
    for (const [key, value] of Object.entries(datos)) {
      // Reemplazo exacto evitando colisiones de substrings parciales
      const regex = new RegExp(`\\b${key}\\b`, "g");
      expresion = expresion.replace(regex, value.toString());
    }

    // Validar que la expresión contenga únicamente números, operadores básicos y paréntesis
    if (!/^[0-9.+\-*/()\s]+$/.test(expresion)) {
      return null;
    }

    // Evaluar de forma segura
    // eslint-disable-next-line no-new-func
    const resultado = new Function(`return (${expresion});`)();
    if (typeof resultado === "number" && !Number.isNaN(resultado)) {
      return resultado;
    }
    return null;
  } catch (err) {
    console.error("Error al evaluar fórmula matemática:", err);
    return null;
  }
}

// Llama a Gemini Flash Lite para realizar una auditoría lingüística y lógica del ejercicio
export async function auditarConIA(
  materia: string,
  ejercicio: EjercicioGenerado
): Promise<{ esValido: boolean; razon: string }> {
  if (!tieneClave()) {
    return { esValido: true, razon: "Modo simulación: sin clave API" };
  }

  const sistema = `Eres un auditor pedagógico experto en el currículum escolar chileno.
Tu objetivo es analizar si el siguiente ejercicio es apto para niños de enseñanza básica.
Requisitos:
1. El enunciado debe ser claro, comprensible y sin errores ortográficos.
2. La respuestaFinal debe ser 100% correcta. Si es de opción múltiple, debe estar listada entre las opciones.
3. No debe haber ambigüedad en cuál es la opción correcta.

Responde únicamente con un objeto JSON con el siguiente formato exacto:
{
  "esValido": true o false,
  "razon": "Breve explicación de tu veredicto"
}`;

  const usuario = `Analiza este ejercicio de la materia "${materia}":\n${JSON.stringify(ejercicio)}`;

  try {
    const respuesta = await generar({
      sistema,
      usuario,
      maxTokens: 250,
      json: true,
      // auditoría = tarea simple y frecuente → modelo barato (C3)
      model: MODELO_LITE,
    });

    const data = JSON.parse(respuesta);
    return {
      esValido: !!data.esValido,
      razon: data.razon || "Sin razón especificada",
    };
  } catch (err) {
    console.error("Error en auditoría IA:", err);
    // En caso de fallo de red de la auditoría, asumimos que es válido si pasó el filtro determinista
    return { esValido: true, razon: "Error de red en auditoría; aprobado por defecto" };
  }
}

// Orquesta la validación del ejercicio
export async function validarEjercicio(
  materia: string,
  ejercicio: EjercicioGenerado
): Promise<{ esValido: boolean; razon: string }> {
  // 1. Validar integridad básica
  if (!ejercicio.enunciado || !ejercicio.respuestaFinal) {
    return { esValido: false, razon: "Formato de ejercicio incompleto" };
  }

  if (!Array.isArray(ejercicio.opciones)) {
    return { esValido: false, razon: "Opción de ejercicio no es un array en opción múltiple" };
  }

  // Selección múltiple: valida el conjunto de correctas (subconjunto de opciones,
  // al menos una) en vez de una única respuesta.
  if (ejercicio.tipoPlantilla === "seleccion_multiple") {
    const correctas = ejercicio.respuestasCorrectas;
    if (!Array.isArray(correctas) || correctas.length < 1) {
      return { esValido: false, razon: "Selección múltiple sin respuestasCorrectas" };
    }
    if (ejercicio.opciones.length < 3) {
      return { esValido: false, razon: "Selección múltiple con muy pocas opciones" };
    }
    if (!correctas.every((c) => ejercicio.opciones!.includes(c))) {
      return { esValido: false, razon: "Alguna respuesta correcta no está entre las opciones" };
    }
    // omitimos la validación matemática determinista (no aplica) y pasamos a la IA
    return auditarConIA(materia, ejercicio);
  }

  if (!ejercicio.opciones.includes(ejercicio.respuestaFinal)) {
    return { esValido: false, razon: "La respuesta correcta no se encuentra entre las opciones" };
  }

  // 2. Validación matemática determinista si aplica
  if (materia === "matematica" && ejercicio.formula && ejercicio.datos) {
    const esperado = evaluarFormula(ejercicio.formula, ejercicio.datos);
    if (esperado !== null) {
      const respNum = parseFloat(ejercicio.respuestaFinal);
      // Permitimos una tolerancia pequeña para decimales
      if (!Number.isNaN(respNum) && Math.abs(esperado - respNum) > 0.01) {
        return {
          esValido: false,
          razon: `Error aritmético determinista: fórmula evaluó ${esperado} pero la respuestaFinal indica ${respNum}`,
        };
      }
    }
  }

  // 3. Auditoría lingüística/lógica mediante IA
  return await auditarConIA(materia, ejercicio);
}
