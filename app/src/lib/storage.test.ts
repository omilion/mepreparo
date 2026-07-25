import { describe, it, expect, beforeEach } from "vitest";
import { leerOnboarding, guardarOnboarding, borrarOnboarding } from "./storage";
import { nuevoPerfil } from "./profile";

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
