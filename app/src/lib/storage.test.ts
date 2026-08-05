import { describe, it, expect, beforeEach } from "vitest";
import {
  leerOnboarding,
  guardarOnboarding,
  borrarOnboarding,
  leerDiagnosticoEnCurso,
  guardarDiagnosticoEnCurso,
  borrarDiagnosticoEnCurso,
  leerFoco,
  guardarFoco,
  borrarFoco,
  leerClaseEnCurso,
  guardarClaseEnCurso,
  borrarClaseEnCurso,
} from "./storage";
import { nuevoPerfil } from "./profile";
import type { ResultadoMateria } from "./diagnostico/tipos";

// El onboarding a medias es lo único que se pierde si el apoderado recarga
// mientras configura a sus hijos. Estas pruebas cubren que se recupere bien y,
// sobre todo, que un estado corrupto NO deje el wizard apuntando a un hijo que
// no existe (eso lo dejaría en una pantalla en blanco).

// localStorage mínimo: el entorno de pruebas es node, no navegador.
beforeEach(() => {
  const datos = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => datos.set(k, v),
      removeItem: (k: string) => datos.delete(k),
    },
  };
});

describe("onboarding pendiente", () => {
  it("no hay nada al empezar", () => {
    expect(leerOnboarding()).toBeNull();
  });

  it("recupera los hijos anotados y en qué va el wizard", () => {
    const pupilos = [nuevoPerfil("Emilia"), nuevoPerfil("Josefa")];
    guardarOnboarding({ pupilos, idx: 1 });

    const leido = leerOnboarding();
    expect(leido?.idx).toBe(1);
    expect(leido?.pupilos.map((p) => p.nombre)).toEqual(["Emilia", "Josefa"]);
  });

  it("borrarlo lo deja limpio (wizard terminado o cierre de sesión)", () => {
    guardarOnboarding({ pupilos: [nuevoPerfil("Emilia")], idx: 0 });
    borrarOnboarding();
    expect(leerOnboarding()).toBeNull();
  });

  it("descarta un índice fuera de rango en vez de apuntar a un hijo inexistente", () => {
    guardarOnboarding({ pupilos: [nuevoPerfil("Emilia")], idx: 5 });
    expect(leerOnboarding()).toBeNull();
  });

  it("descarta una lista vacía y un JSON corrupto", () => {
    guardarOnboarding({ pupilos: [], idx: 0 });
    expect(leerOnboarding()).toBeNull();

    window.localStorage.setItem("mp-onboarding", "{roto");
    expect(leerOnboarding()).toBeNull();
  });
});

// Lo rendido en el diagnóstico y la etapa elegida son de UN niño. En una tablet
// familiar, filtrar el progreso de una hermana a la otra es peor que perderlo:
// por eso todo se lee pidiendo el id y se ignora si no calza.

const resultado = (materia: string): ResultadoMateria => ({
  materia: materia as ResultadoMateria["materia"],
  nivel: 0.6,
  brechas: ["fracciones"],
  preguntasHechas: 8,
  aciertos: 5,
});

describe("diagnóstico a medias", () => {
  it("recupera las materias ya rendidas por ese niño", () => {
    guardarDiagnosticoEnCurso("nina-1", { matematica: resultado("matematica") });
    expect(Object.keys(leerDiagnosticoEnCurso("nina-1") ?? {})).toEqual(["matematica"]);
  });

  it("NO entrega el progreso de una hermana a la otra", () => {
    guardarDiagnosticoEnCurso("nina-1", { matematica: resultado("matematica") });
    expect(leerDiagnosticoEnCurso("nina-2")).toBeNull();
  });

  it("se borra al entregar los resultados", () => {
    guardarDiagnosticoEnCurso("nina-1", { matematica: resultado("matematica") });
    borrarDiagnosticoEnCurso();
    expect(leerDiagnosticoEnCurso("nina-1")).toBeNull();
  });

  it("aguanta un JSON corrupto", () => {
    window.localStorage.setItem("mp-diagnostico-en-curso", "{roto");
    expect(leerDiagnosticoEnCurso("nina-1")).toBeNull();
  });
});

describe("etapa enfocada", () => {
  it("recupera la etapa de ese niño", () => {
    guardarFoco("nina-1", { materia: "matematica", tema: "fracciones" });
    expect(leerFoco("nina-1")).toEqual({ materia: "matematica", tema: "fracciones" });
  });

  it("NO entrega la etapa de una hermana a la otra", () => {
    guardarFoco("nina-1", { materia: "matematica", tema: "fracciones" });
    expect(leerFoco("nina-2")).toBeNull();
  });

  it("se borra al soltar el foco", () => {
    guardarFoco("nina-1", { materia: "ciencias", tema: "ciclo_del_agua" });
    borrarFoco();
    expect(leerFoco("nina-1")).toBeNull();
  });
});

// La clase con Rai vivía SOLO en el estado del componente: si el niño tocaba
// inicio sin querer o se bloqueaba la tablet, la conversación entera se perdía
// y al volver Rai saludaba de cero. Estas pruebas cubren que se retome, y —más
// importante— que NO se retome cuando sería confuso o de otro niño.
describe("clase en curso (la conversación con Rai)", () => {
  const mensajes = [
    { de: "rai", texto: "Hola, veamos fracciones" },
    { de: "nino", texto: "ya" },
  ];

  it("se recupera si es el mismo niño, materia y tema", () => {
    guardarClaseEnCurso({
      pupiloId: "nina-1",
      materia: "matematica",
      temaFoco: "fracciones",
      mensajes,
      inicioSesion: Date.now(),
    });
    const r = leerClaseEnCurso<(typeof mensajes)[number]>("nina-1", "matematica", "fracciones");
    expect(r?.mensajes).toHaveLength(2);
  });

  it("NO se filtra a otro niño de la misma tablet", () => {
    guardarClaseEnCurso({
      pupiloId: "nina-1",
      materia: "matematica",
      temaFoco: "fracciones",
      mensajes,
      inicioSesion: Date.now(),
    });
    expect(leerClaseEnCurso("nina-2", "matematica", "fracciones")).toBeNull();
  });

  it("no se retoma una clase de otra materia ni de otro tema", () => {
    guardarClaseEnCurso({
      pupiloId: "nina-1",
      materia: "matematica",
      temaFoco: "fracciones",
      mensajes,
      inicioSesion: Date.now(),
    });
    expect(leerClaseEnCurso("nina-1", "lenguaje", "fracciones")).toBeNull();
    expect(leerClaseEnCurso("nina-1", "matematica", "geometria")).toBeNull();
  });

  it("una clase de hace más de 3 horas se descarta", () => {
    guardarClaseEnCurso({
      pupiloId: "nina-1",
      materia: "matematica",
      temaFoco: "fracciones",
      mensajes,
      inicioSesion: Date.now(),
    });
    // envejecemos el guardado a mano
    const crudo = JSON.parse(window.localStorage.getItem("mp-clase-en-curso")!);
    crudo.guardadoEn = Date.now() - 4 * 60 * 60 * 1000;
    window.localStorage.setItem("mp-clase-en-curso", JSON.stringify(crudo));
    expect(leerClaseEnCurso("nina-1", "matematica", "fracciones")).toBeNull();
  });

  it("al cerrar la sesión de verdad, no queda nada que retomar", () => {
    guardarClaseEnCurso({
      pupiloId: "nina-1",
      materia: "matematica",
      temaFoco: "fracciones",
      mensajes,
      inicioSesion: Date.now(),
    });
    borrarClaseEnCurso();
    expect(leerClaseEnCurso("nina-1", "matematica", "fracciones")).toBeNull();
  });
});
