// LIMPIEZA ÚNICA de la memoria por tema ya guardada.
//
// Antes de los arreglos R1.3, siete de los ocho interactivos guardaban como
// clave del tema cualquier cosa: el enunciado cortado a 40 caracteres, una
// palabra de la sopa, la respuesta de la rueda. Esta pasada limpia lo que
// quedó escrito, con una regla conservadora:
//
//   - ENUNCIADOS de actividad ("une cada órgano con su función") → se BORRAN.
//     No dicen qué aprendió el niño; son inservibles por definición.
//   - Temas REALES fuera de la ruta (sustantivos, semilla, balanza) → se
//     CONSERVAN. No son etapas del banco, pero son aprendizaje genuino: el
//     apoderado los ve en "En qué va" y Rai puede recordarlos.
//   - Variantes del mismo tema (articulos / artículos) → se FUSIONAN,
//     conservando el mejor estado y juntando las evidencias.
//
// Por defecto solo INFORMA. Escribe SQL únicamente con --aplicar.
//
//   npx tsx scripts/limpiar-memoria-temas.ts <dump.json> [--aplicar]

import fs from "node:fs";
import { normalizarClaveTema, pareceEnunciado } from "../src/lib/plan/claveTema";
import { rutaDeTemas } from "../src/lib/plan/etapas";
import type { Curso, Materia } from "../src/lib/profile";
import type { EstadoTema, TemaDominio } from "../src/lib/tutor/acuerdo";

interface PupiloDump {
  id: string;
  curso: string;
  temas: TemaDominio[];
}

// superado gana; entre los otros dos, el que tenga evidencia más reciente.
const RANGO: Record<EstadoTema, number> = { superado: 3, le_cuesta: 2, en_proceso: 1 };

function fusionar(a: TemaDominio, b: TemaDominio): TemaDominio {
  const ganador = RANGO[a.estado] >= RANGO[b.estado] ? a : b;
  const evidencias = [...a.evidencias, ...b.evidencias]
    .filter((e, i, arr) => arr.findIndex((x) => x.fecha === e.fecha && x.nota === e.nota) === i)
    .sort((x, y) => x.fecha.localeCompare(y.fecha))
    .slice(-8);
  return {
    ...ganador,
    tema: normalizarClaveTema(ganador.tema),
    evidencias,
    actualizadoEn: a.actualizadoEn > b.actualizadoEn ? a.actualizadoEn : b.actualizadoEn,
  };
}

const dump: PupiloDump[] = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const aplicar = process.argv.includes("--aplicar");

const sql: string[] = [];
let totalBorrados = 0;
let totalFusionados = 0;
let totalConservados = 0;

for (const p of dump) {
  const borrados: string[] = [];
  const conservados = new Map<string, TemaDominio>();

  for (const t of p.temas) {
    const ruta = rutaDeTemas(t.materia as Materia, p.curso as Curso);
    const esCanonico = ruta.includes(t.tema);

    // los canónicos jamás se tocan; los enunciados se van
    if (!esCanonico && pareceEnunciado(t.tema)) {
      borrados.push(t.tema);
      continue;
    }

    const clave = esCanonico ? t.tema : normalizarClaveTema(t.tema);
    if (!clave) {
      borrados.push(t.tema);
      continue;
    }
    const llave = `${t.materia}|${clave}`;
    const previo = conservados.get(llave);
    if (previo) {
      conservados.set(llave, fusionar(previo, { ...t, tema: clave }));
      totalFusionados++;
    } else {
      conservados.set(llave, { ...t, tema: clave });
    }
  }

  const finales = [...conservados.values()];
  totalBorrados += borrados.length;
  totalConservados += finales.length;

  console.log(`\nniño ${p.id.slice(0, 6)} (${p.curso})`);
  console.log(`  antes: ${p.temas.length} temas  →  después: ${finales.length}`);
  if (borrados.length) {
    console.log(`  se borran ${borrados.length} enunciados:`);
    borrados.forEach((b) => console.log(`     - "${b.slice(0, 46)}"`));
  }

  if (aplicar) {
    const json = JSON.stringify(finales).replace(/\$\$/g, "");
    sql.push(
      `UPDATE pupilos SET tutoria = jsonb_set(tutoria, '{temas}', $$${json}$$::jsonb), updated_at = now() WHERE id = '${p.id}';`
    );
  }
}

console.log(
  `\n=== RESUMEN: ${totalBorrados} enunciados borrados · ${totalFusionados} fusionados · ${totalConservados} conservados ===`
);

if (aplicar) {
  const salida = process.argv[2].replace(/\.json$/, "") + "-limpieza.sql";
  fs.writeFileSync(salida, "BEGIN;\n" + sql.join("\n") + "\nCOMMIT;\n");
  console.log(`SQL escrito en: ${salida}`);
} else {
  console.log("(simulación — no se escribió nada; usa --aplicar para generar el SQL)");
}
