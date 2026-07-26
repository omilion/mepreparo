import { describe, it, expect } from "vitest";
import { elegirNoUsado } from "./variedad";

// La biblioteca guarda UN interactivo por tema, así que sin excluir lo ya visto
// el segundo juego de la misma lección salía idéntico al primero. Eso fue lo que
// vieron las dos niñas en la prueba real.

const filas = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("elegir contenido que el niño no haya visto", () => {
  it("sin nada visto, entrega cualquiera", () => {
    const elegido = elegirNoUsado(filas, new Set());
    expect(filas).toContain(elegido);
  });

  it("nunca devuelve algo ya visto en la sesión", () => {
    const vistos = new Set(["a", "b"]);
    // se repite porque la elección es al azar: ninguna vez puede salir 'a' ni 'b'
    for (let i = 0; i < 30; i++) {
      expect(elegirNoUsado(filas, vistos)?.id).toBe("c");
    }
  });

  it("devuelve null cuando ya los vio todos, para forzar contenido nuevo", () => {
    expect(elegirNoUsado(filas, new Set(["a", "b", "c"]))).toBeNull();
  });

  it("devuelve null si la biblioteca está vacía", () => {
    expect(elegirNoUsado([], new Set())).toBeNull();
  });
});
