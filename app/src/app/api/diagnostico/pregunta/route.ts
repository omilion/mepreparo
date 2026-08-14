import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import BANCO_PREGUNTAS from "@/lib/diagnostico/banco.json";
import type { BancoPreguntas, Pregunta, Dificultad } from "@/lib/diagnostico/tipos";
import type { Materia, Curso } from "@/lib/profile";
import { obtenerPreguntaGenerada } from "@/lib/diagnostico/generarPrueba";
import { getHmacSecret } from "@/lib/auth-student";

const banco = BANCO_PREGUNTAS as BancoPreguntas;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const materia = searchParams.get("materia") as Materia | null;
  const curso = searchParams.get("curso") as Curso | null;
  const dificultadParam = searchParams.get("dificultad");
  const excluirParam = searchParams.get("excluir") || "";
  // opcional: acotar a UN tema (lo usa la prueba de etapa del camino)
  const tema = searchParams.get("tema");

  if (!materia || !curso || !dificultadParam) {
    return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
  }

  const dificultad = parseInt(dificultadParam, 10) as Dificultad;
  const excluidas = new Set(excluirParam.split(",").filter(Boolean));

  // Filtrado de preguntas idéntico a iniciarDiag del motor
  const delCurso = banco.filter((p) => p.materia === materia && p.curso === curso);
  let pool = delCurso.length > 0
    ? delCurso
    : banco.filter((p) => p.materia === materia);

  // la prueba de etapa evalúa SOLO su tema (si no hay preguntas, devuelve null)
  if (tema) pool = pool.filter((p) => p.tema === tema);

  // Los enunciados que el niño YA vio en esta prueba (las excluidas que salen
  // del banco). Se le pasan al generador para que no invente la misma pregunta
  // con otra redacción, que era lo que hacía que 3 de 8 fueran la misma.
  const enunciadosUsados = banco
    .filter((p) => excluidas.has(p.id))
    .map((p) => p.enunciado);

  const candidatas = pool.filter((p) => !excluidas.has(p.id));
  if (candidatas.length === 0) {
    if (tema) {
      const gen = await obtenerPreguntaGenerada(
        materia,
        curso,
        tema,
        dificultad,
        excluidas,
        enunciadosUsados
      );
      if (gen) {
        const indices = gen.opciones.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const correctaShuffled = indices.indexOf(gen.correctaIndex);
        const hmac = crypto
          .createHmac("sha256", getHmacSecret())
          .update(`${gen.id}:${correctaShuffled}`)
          .digest("hex");

        return NextResponse.json({
          pregunta: {
            id: gen.id,
            materia,
            curso,
            dificultad,
            tema,
            enunciado: gen.enunciado,
            opciones: indices.map((i) => gen.opciones[i]),
            oa: tema,
          },
          token: hmac,
        });
      }
    }
    return NextResponse.json({ pregunta: null });
  }

  // Selección de la pregunta idónea según dificultad (criterio de distancia mínima)
  const distancia = (p: Pregunta) => Math.abs(p.dificultad - dificultad);
  const minDist = Math.min(...candidatas.map(distancia));
  const empatadas = candidatas.filter((p) => distancia(p) === minDist);
  const elegida = empatadas[Math.floor(Math.random() * empatadas.length)];

  // Barajar las opciones y calcular la nueva posición correcta
  const indices = elegida.opciones.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const correctaShuffled = indices.indexOf(elegida.correcta);

  // Generar HMAC token del ID de la pregunta y el índice de su opción correcta
  const hmac = crypto
    .createHmac("sha256", getHmacSecret())
    .update(`${elegida.id}:${correctaShuffled}`)
    .digest("hex");

  // Retornamos al cliente SIN la clave "correcta"
  const respuestaCliente = {
    id: elegida.id,
    materia: elegida.materia,
    curso: elegida.curso,
    dificultad: elegida.dificultad,
    tema: elegida.tema,
    enunciado: elegida.enunciado,
    opciones: indices.map((i) => elegida.opciones[i]),
    oa: elegida.oa,
  };

  return NextResponse.json({
    pregunta: respuestaCliente,
    token: hmac,
  });
}
