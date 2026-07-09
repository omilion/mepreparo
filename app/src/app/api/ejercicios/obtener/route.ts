import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { contenidoValidado } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { recuperar } from "@/lib/tutor/rag";
import { generar, tieneClave } from "@/lib/tutor/gemini";
import { validarEjercicio } from "@/lib/tutor/checker";
import type { Materia, Curso } from "@/lib/profile";

// Semilla de ejercicios de respaldo si falla Gemini o no hay clave
const SEMILLA_EJERCICIOS = [
  {
    id: "seed-mat-1",
    materia: "matematica",
    curso: "5basico",
    oa: "OA 4",
    dificultad: 1,
    tipo: "ejercicio",
    enunciado: "Si tienes {cajas} cajas y en cada una hay {manzanas} manzanas, ¿cuántas manzanas tienes en total?",
    datos: {
      variables: { cajas: 4, manzanas: 6 },
      opciones: ["24", "10", "16", "20"],
      formula: "cajas * manzanas",
    },
    solucionPasoAPaso: [
      "Identifica la cantidad de cajas: 4.",
      "Identifica las manzanas por caja: 6.",
      "Multiplica las cajas por las manzanas: 4 x 6 = 24 manzanas.",
    ],
    respuestaFinal: "24",
    estado: "publicada",
  },
  {
    id: "seed-mat-2",
    materia: "matematica",
    curso: "6basico",
    oa: "OA 2",
    dificultad: 2,
    tipo: "ejercicio",
    enunciado: "Un ciclista recorre {distancia} kilómetros en {horas} horas. ¿Cuál es su velocidad promedio en km/h?",
    datos: {
      variables: { distancia: 45, horas: 3 },
      opciones: ["15", "12", "20", "18"],
      formula: "distancia / horas",
    },
    solucionPasoAPaso: [
      "Tomas la distancia total recorrida: 45 km.",
      "Tomas el tiempo empleado: 3 horas.",
      "Divides la distancia por el tiempo: 45 / 3 = 15 km/h.",
    ],
    respuestaFinal: "15",
    estado: "publicada",
  },
  {
    id: "seed-len-1",
    materia: "lenguaje",
    curso: "5basico",
    oa: "OA 3",
    dificultad: 1,
    tipo: "ejercicio",
    enunciado: "¿Cuál de las siguientes palabras es un sustantivo propio?",
    datos: {
      variables: {},
      opciones: ["Chile", "correr", "hermoso", "ciudad"],
      formula: "",
    },
    solucionPasoAPaso: [
      "Los sustantivos propios designan de manera particular a personas, países o lugares.",
      "La palabra 'Chile' designa a un país específico, por lo que comienza con mayúscula y es un sustantivo propio.",
    ],
    respuestaFinal: "Chile",
    estado: "publicada",
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const materia = searchParams.get("materia") || "matematica";
  const curso = searchParams.get("curso") || "5basico";
  const dificultad = parseInt(searchParams.get("dificultad") || "1", 10);
  const oa = searchParams.get("oa") || "General";

  try {
    // 1. Intentar buscar un ejercicio ya validado y publicado en la BD Postgres
    const existentes = await db
      .select()
      .from(contenidoValidado)
      .where(
        and(
          eq(contenidoValidado.materia, materia),
          eq(contenidoValidado.curso, curso),
          eq(contenidoValidado.dificultad, dificultad),
          eq(contenidoValidado.estado, "publicada")
        )
      );

    if (existentes.length > 0) {
      // Retornar un ejercicio aleatorio de los coincidentes (ahorro 100% de tokens)
      const elegido = existentes[Math.floor(Math.random() * existentes.length)];
      return NextResponse.json({ ejercicio: elegido, fuente: "biblioteca_compartida" });
    }

    // 2. Si no hay, y no tenemos API key de Gemini, devolvemos uno de la semilla local
    if (!tieneClave()) {
      const deSemilla = SEMILLA_EJERCICIOS.find(
        (x) => x.materia === materia && x.curso === curso && x.dificultad === dificultad
      ) || SEMILLA_EJERCICIOS[0];
      return NextResponse.json({ ejercicio: deSemilla, fuente: "semilla_offline" });
    }

    // 3. Recuperar contexto curricular (RAG) usando embeddings
    const queryRAG = `Objetivos de aprendizaje y ejercicios de ${materia} para ${curso} dificultad ${dificultad}`;
    const fragmentos = await recuperar(queryRAG, { materia: materia as Materia, curso: curso as Curso, k: 2 });
    const contextoRAG = fragmentos.map((f, i) => `[${i + 1}] ${f.texto}`).join("\n\n");

    // 4. Intentar generar mediante Gemini Flash + checker
    let intentos = 0;
    while (intentos < 2) {
      intentos++;
      try {
        const sistemaPrompt = `Eres un generador premium de ejercicios y evaluaciones escolares para educación básica en Chile.
Genera un ejercicio adaptado al curso, materia, dificultad y contexto pedagógico provisto.
Debes responder con un objeto JSON en el siguiente formato exacto:
{
  "enunciado": "Enunciado del ejercicio. Puedes incluir variables entre llaves como {cajas} y {manzanas}.",
  "datos": {
    "nombre_variable": valor_numerico
  },
  "formula": "Fórmula matemática simple para calcular la respuesta final usando las variables en 'datos' (ej. cajas * manzanas). Dejar vacío si no es matemática.",
  "solucionPasoAPaso": [
    "Paso 1: Explicación...",
    "Paso 2: Explicación..."
  ],
  "respuestaFinal": "La respuesta exacta y correcta (ej: 24)",
  "opciones": [
    "Opción correcta (idéntica a respuestaFinal)",
    "Opción incorrecta 1",
    "Opción incorrecta 2",
    "Opción incorrecta 3"
  ]
}`;

        const usuarioPrompt = `Genera un ejercicio para:
Materia: ${materia}
Curso: ${curso}
Dificultad: ${dificultad} (escala 1 a 3)
Contexto Curricular (RAG):
${contextoRAG || "No hay información curricular específica disponible."}`;

        const respuesta = await generar({
          sistema: sistemaPrompt,
          usuario: usuarioPrompt,
          maxTokens: 600,
          json: true,
        });

        const ejercicioObj = JSON.parse(respuesta);

        // Validar el ejercicio generado con nuestro Checker de dos niveles
        const check = await validarEjercicio(materia, ejercicioObj);

        if (check.esValido) {
          const nuevoId = `validated-${crypto.randomUUID()}`;
          const insertData = {
            id: nuevoId,
            materia,
            curso,
            oa,
            dificultad,
            tipo: "ejercicio",
            enunciado: ejercicioObj.enunciado,
            datos: {
              variables: ejercicioObj.datos || {},
              opciones: ejercicioObj.opciones || [],
              formula: ejercicioObj.formula || "",
            },
            solucionPasoAPaso: ejercicioObj.solucionPasoAPaso || [],
            respuestaFinal: ejercicioObj.respuestaFinal,
            estado: "publicada",
          };

          // Guardar en la base de datos para futuras consultas
          await db.insert(contenidoValidado).values(insertData);

          return NextResponse.json({ ejercicio: insertData, fuente: "generado_y_validado" });
        } else {
          console.warn(`Ejercicio rechazado por checker (intento ${intentos}):`, check.razon);
          // Registrar como candidata inválida para depuración
          await db.insert(contenidoValidado).values({
            id: `failed-${crypto.randomUUID()}`,
            materia,
            curso,
            oa,
            dificultad,
            tipo: "ejercicio",
            enunciado: ejercicioObj.enunciado || "N/A",
            datos: {
              variables: ejercicioObj.datos || {},
              opciones: ejercicioObj.opciones || [],
              errorLog: check.razon,
            },
            solucionPasoAPaso: ejercicioObj.solucionPasoAPaso || [],
            respuestaFinal: ejercicioObj.respuestaFinal || "N/A",
            estado: "candidata",
          });
        }
      } catch (err) {
        console.error(`Fallo en el intento ${intentos} de generación:`, err);
      }
    }

    // 5. Fallback definitivo si fallan las generaciones
    const deSemilla = SEMILLA_EJERCICIOS.find(
      (x) => x.materia === materia && x.curso === curso && x.dificultad === dificultad
    ) || SEMILLA_EJERCICIOS[0];
    return NextResponse.json({ ejercicio: deSemilla, fuente: "fallback_semilla" });
  } catch (err) {
    console.error("Error en obtener ejercicio:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
