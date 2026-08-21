import { describe, expect, it } from "vitest";
import { esRutaLibre } from "./rutasPublicas";

describe("esRutaLibre", () => {
  // El caso que originó esto: el enlace del correo de restablecer contraseña
  // rebotaba al landing, así que quien olvidaba su clave no podía recuperarla.
  it("deja pasar el enlace de restablecer contraseña que llega por correo", () => {
    expect(esRutaLibre("/auth/nueva-clave")).toBe(true);
  });

  it("deja pasar el resto del flujo de autenticación", () => {
    expect(esRutaLibre("/auth")).toBe(true);
    expect(esRutaLibre("/auth/recuperar")).toBe(true);
    expect(esRutaLibre("/auth/verificado")).toBe(true);
  });

  it("deja pasar las páginas legales que el registro obliga a aceptar", () => {
    expect(esRutaLibre("/terminos")).toBe(true);
    expect(esRutaLibre("/privacidad")).toBe(true);
  });

  it("deja pasar el blog y CADA artículo (llegan desde buscadores)", () => {
    expect(esRutaLibre("/blog")).toBe(true);
    expect(esRutaLibre("/blog/guia-completa-examenes-libres-mineduc-2026")).toBe(true);
  });

  it("deja pasar la demo, que es el CTA de la propia landing", () => {
    expect(esRutaLibre("/demo")).toBe(true);
  });

  it("mantiene publica la portada aunque exista una sesion", () => {
    expect(esRutaLibre("/")).toBe(true);
    expect(esRutaLibre("/landing")).toBe(true);
  });

  it("mantiene libres las rutas internas y el login por QR", () => {
    expect(esRutaLibre("/rai")).toBe(true);
    expect(esRutaLibre("/admin")).toBe(true);
    expect(esRutaLibre("/suscripcion")).toBe(true);
    expect(esRutaLibre("/alumno/login")).toBe(true);
  });

  // Lo contrario importa igual: el flujo del niño SÍ debe rutearse según su
  // estado, o alguien sin diagnóstico caería directo en el mapa.
  it("NO libera las pantallas del flujo del alumno ni del apoderado", () => {
    for (const r of ["/hoy", "/tutor", "/mapa", "/panel", "/prueba", "/wizard", "/registro"]) {
      expect(esRutaLibre(r)).toBe(false);
    }
  });

  it("no libera una ruta que solo EMPIEZA parecido a una pública", () => {
    expect(esRutaLibre("/blogueros")).toBe(false);
    expect(esRutaLibre("/autenticar")).toBe(false);
  });
});
