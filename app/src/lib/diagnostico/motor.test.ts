import { describe, expect, it } from "vitest";
import {
  iniciarDiag,
  barajarOpciones,
  responder,
  terminado,
  resultado,
} from "./motor";
import type { BancoPreguntas, Pregunta } from "./tipos";

const mockPregunta: Pregunta = {
  id: "test_q1",
  materia: "matematica",
  curso: "5basico",
  dificultad: 3,
  tema: "fracciones",
  enunciado: "¿Cuánto es 1/2 + 1/2?",
  opciones: ["1", "1/2", "2", "0"],
  correcta: 0,
};

const mockBanco: BancoPreguntas = [
  mockPregunta,
  {
    id: "test_q2",
    materia: "matematica",
    curso: "5basico",
    dificultad: 4,
    tema: "fracciones",
    enunciado: "Pregunta dificil",
    opciones: ["A", "B", "C", "D"],
    correcta: 1,
  },
  {
    id: "test_q3",
    materia: "matematica",
    curso: "5basico",
    dificultad: 2,
    tema: "conteo",
    enunciado: "Pregunta facil",
    opciones: ["A", "B", "C", "D"],
    correcta: 2,
  },
];

describe("Motor de Diagnóstico", () => {
  it("debe iniciar el diagnóstico con valores iniciales correctos", () => {
    const estado = iniciarDiag(mockBanco, "matematica", "5basico");
    expect(estado.materia).toBe("matematica");
    expect(estado.curso).toBe("5basico");
    expect(estado.dificultad).toBe(3);
    expect(estado.hechas).toHaveLength(0);
    expect(estado.aciertos).toHaveLength(0);
  });

  it("debe barajar opciones sin cambiar el contenido correcto", () => {
    const original = { ...mockPregunta };
    const barajada = barajarOpciones(mockPregunta);

    // No debe mutar la original
    expect(mockPregunta.correcta).toBe(original.correcta);

    // Las opciones deben tener el mismo contenido
    expect([...barajada.opciones].sort()).toEqual([...mockPregunta.opciones].sort());

    // El índice 'correcta' debe apuntar al mismo valor
    const valorOriginalCorrecto = mockPregunta.opciones[mockPregunta.correcta];
    const valorBarajadoCorrecto = barajada.opciones[barajada.correcta];
    expect(valorBarajadoCorrecto).toBe(valorOriginalCorrecto);
  });

  it("debe responder y ajustar la dificultad hacia arriba en aciertos y abajo en fallos", () => {
    const estadoInicial = iniciarDiag(mockBanco, "matematica", "5basico");

    // Acierto: de dificultad 3 pasa a 4
    const estado1 = responder(estadoInicial, mockPregunta, true);
    expect(estado1.dificultad).toBe(4);
    expect(estado1.aciertos).toEqual([true]);
    expect(estado1.hechas).toHaveLength(1);

    // Fallo: de dificultad 4 baja a 3
    const estado2 = responder(estado1, mockBanco[1], false);
    expect(estado2.dificultad).toBe(3);
    expect(estado2.aciertos).toEqual([true, false]);
  });

  it("debe detenerse según las condiciones de parada y estabilización", () => {
    const estadoInicial = iniciarDiag(mockBanco, "matematica", "5basico");

    // Menos del mínimo de preguntas no debe terminar
    expect(terminado(estadoInicial)).toBe(false);

    // Alternar aciertos/fallos para estabilizar
    let estado = responder(estadoInicial, mockPregunta, true); // 1. Ok (dif -> 4)
    estado = responder(estado, mockBanco[1], false);            // 2. Fallo (dif -> 3)
    estado = responder(estado, mockPregunta, true);             // 3. Ok (dif -> 4)
    expect(terminado(estado)).toBe(false); // n=3, menor a MIN_PREGUNTAS (5)

    estado = responder(estado, mockBanco[1], false);            // 4. Fallo (dif -> 3)
    estado = responder(estado, mockPregunta, true);             // 5. Ok (dif -> 4)

    // Últimas 3 respuestas: Fallo (F), Ok (V), Fallo (F) o similar
    // aciertos = [V, F, V, F, V] -> ult 3 = [V, F, V] (alterna)
    expect(terminado(estado)).toBe(true);
  });

  it("debe calcular el resultado final de la materia estimando nivel y mapeando brechas", () => {
    const estadoInicial = iniciarDiag(mockBanco, "matematica", "5basico");
    
    // Simular un diagnóstico donde se fallan preguntas de conteo pero se aciertan de fracciones
    let estado = responder(estadoInicial, mockPregunta, true); // acierto fracciones (3)
    estado = responder(estado, mockBanco[2], false); // fallo conteo (2)
    
    const res = resultado(estado);
    expect(res.materia).toBe("matematica");
    expect(res.preguntasHechas).toBe(2);
    expect(res.aciertos).toBe(1);
    expect(res.brechas).toContain("conteo");
    expect(res.brechas).not.toContain("fracciones");
    expect(res.nivel).toBeGreaterThanOrEqual(0);
    expect(res.nivel).toBeLessThanOrEqual(1);
  });
});
