// Datos de prueba SOLO para desarrollo. Permiten saltar el llenado manual
// del onboarding y revisar cualquier pantalla (plan, tutor…) al instante.
// No se importa en producción: el DevPanel que lo usa se oculta si NODE_ENV
// no es "development".

import { nuevaCuenta, nuevoPerfil, type Cuenta, type PerfilNino } from "@/lib/profile";

// Fecha de examen ~45 días en el futuro (relativa a hoy, siempre válida).
function enDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Niño CON diagnóstico completo → sirve para entrar directo al plan y al tutor.
function pupiloDiagnosticado(): PerfilNino {
  const p = nuevoPerfil("Emilia (test)");
  p.id = "dev-emilia";
  p.curso = "5basico";
  p.examen = { fecha: enDias(45), materias: ["matematica", "lenguaje", "ciencias"] };
  p.disponibilidad = { horasSemana: 8 };
  p.contexto = {
    intereses: ["Animales", "Dibujo"],
    estilos: ["Ejemplos visuales", "Paso a paso"],
  };
  p.diagnostico = {
    matematica: { nivel: 0.42, brechas: ["fracciones", "multiplicacion"] },
    lenguaje: { nivel: 0.71, brechas: ["comprension_lectora"] },
    ciencias: { nivel: 0.58, brechas: ["sistema_solar"] },
  };
  return p;
}

// Niño recién configurado (sin diagnóstico) → sirve para probar el diagnóstico.
function pupiloSinDiagnostico(): PerfilNino {
  const p = nuevoPerfil("Tomás (test)");
  p.id = "dev-tomas";
  p.curso = "3basico";
  p.examen = { fecha: enDias(30), materias: ["matematica", "historia"] };
  p.disponibilidad = { horasSemana: 5 };
  p.contexto = {
    intereses: ["Deportes", "Videojuegos"],
    estilos: ["Con juegos"],
  };
  return p;
}

// Cuenta de prueba con ambos niños.
export function cuentaDePrueba(): Cuenta {
  const c = nuevaCuenta([pupiloDiagnosticado(), pupiloSinDiagnostico()]);
  c.id = "dev-cuenta";
  c.apoderado = { nombre: "Apoderado de prueba", email: "test@mepreparo.dev" };
  return c;
}
