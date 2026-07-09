"use client";

import { useEffect, useRef, useState } from "react";
import { MATERIAS, type Materia } from "@/lib/profile";
import { TUTOR } from "@/lib/tutor/personaje";
import { AuraOrb } from "./AuraOrb";
import { TextoRevelado } from "./TextoRevelado";
import { Reveal } from "./Reveal";

// Demo gratuita = mini-sesión guiada con goal propio:
// email (gate) → bienvenida → elegir materia → mini-lección → 5 ejercicios → cierre.
// No persiste progreso; su objetivo es enganchar y capturar el lead.

const TOTAL_EJERCICIOS = 5;
const MATERIAS_DEMO: Materia[] = ["matematica", "lenguaje", "ciencias"];

type Fase = "email" | "bienvenida" | "materia" | "leccion" | "ejercicios" | "cierre";

interface EjercicioDemo {
  enunciado: string;
  opciones: string[];
  respuestaFinal: string;
}

export function Demo({
  onRegistrarse,
  onSalir,
}: {
  onRegistrarse: () => void;
  onSalir: () => void;
}) {
  const [fase, setFase] = useState<Fase>("email");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [errorEmail, setErrorEmail] = useState("");
  const [materia, setMateria] = useState<Materia>("matematica");
  const [mensajeRai, setMensajeRai] = useState("");
  const [cargando, setCargando] = useState(false);

  const [ejercicio, setEjercicio] = useState<EjercicioDemo | null>(null);
  const [idxEjercicio, setIdxEjercicio] = useState(0); // 0..TOTAL
  const [aciertos, setAciertos] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const orbeActivo = cargando;

  // --- gate de email → guarda lead y arranca ---
  async function comenzarDemo() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorEmail("Escribe un correo válido (el de tu apoderado).");
      return;
    }
    setErrorEmail("");
    setCargando(true);
    try {
      await fetch("/api/demo/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), nombreNino: nombre.trim(), aceptaContacto: true }),
      });
    } catch {
      /* no bloqueamos la demo si el lead falla */
    }
    setFase("bienvenida");
    await pedirRai("bienvenida");
    setFase("materia");
    setCargando(false);
  }

  // --- llamada al tutor de demo ---
  async function pedirRai(
    faseRai: "bienvenida" | "leccion" | "chat",
    extra: Record<string, unknown> = {}
  ) {
    setCargando(true);
    try {
      const res = await fetch("/api/demo/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fase: faseRai, materia, nombre, ...extra }),
      });
      const data = await res.json();
      setMensajeRai(data.respuesta || "");
    } catch {
      setMensajeRai(`¡Sigamos, ${nombre || "amigo"}!`);
    } finally {
      setCargando(false);
    }
  }

  // --- elegir materia → mini-lección → primer ejercicio ---
  async function elegirMateria(m: Materia) {
    setMateria(m);
    setFase("leccion");
    setCargando(true);
    // pedimos la lección con la materia recién elegida (no esperamos al estado)
    try {
      const res = await fetch("/api/demo/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fase: "leccion", materia: m, nombre }),
      });
      const data = await res.json();
      setMensajeRai(data.respuesta || "");
    } catch {
      setMensajeRai("¡Vamos a practicar!");
    }
    setCargando(false);
  }

  async function empezarEjercicios() {
    setFase("ejercicios");
    setIdxEjercicio(0);
    await cargarEjercicio(materia);
  }

  async function cargarEjercicio(m: Materia) {
    setCargando(true);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/ejercicios/obtener?materia=${m}&curso=5basico&dificultad=2`
      );
      const data = await res.json();
      const e = data.ejercicio ?? data;
      setEjercicio({
        enunciado: rellenar(e.enunciado, e.datos?.variables),
        opciones: e.datos?.opciones ?? e.opciones ?? [],
        respuestaFinal: String(e.respuestaFinal ?? ""),
      });
    } catch {
      setEjercicio(null);
    } finally {
      setCargando(false);
    }
  }

  function responder(opcion: string) {
    if (feedback || !ejercicio) return;
    const ok = opcion === ejercicio.respuestaFinal;
    setFeedback(ok ? "ok" : "no");
    if (ok) setAciertos((a) => a + 1);
  }

  async function siguiente() {
    const nuevo = idxEjercicio + 1;
    if (nuevo >= TOTAL_EJERCICIOS) {
      setFase("cierre");
      return;
    }
    setIdxEjercicio(nuevo);
    await cargarEjercicio(materia);
  }

  // ------------------------------------------------------------------ render
  return (
    <div className="mx-auto flex min-h-[calc(100vh-58px)] max-w-zen flex-col px-[22px] pb-16">
      {/* barra: salir */}
      <div className="flex items-center py-2">
        <button
          onClick={onSalir}
          aria-label="Salir de la demostración"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:text-ink"
        >
          ←
        </button>
        <span className="ml-2 text-[12px] uppercase tracking-wider text-sage-deep">
          Clase de prueba
        </span>
      </div>

      {/* GATE DE EMAIL */}
      {fase === "email" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Reveal variant="lead" delay={80}>
            <h1 className="max-w-[16ch] text-[30px]">
              Prueba una clase con Rai, gratis
            </h1>
          </Reveal>
          <Reveal delay={420}>
            <p className="max-w-[38ch] text-[15px] leading-[1.5] text-ink-soft">
              Es una clase corta para que tu hijo conozca a Rai. Pídele a tu
              apoderado su correo para empezar.
            </p>
          </Reveal>
          <Reveal delay={560}>
            <div className="flex w-[300px] max-w-full flex-col gap-3 text-left">
              <input
                type="text"
                value={nombre}
                placeholder="¿Cómo te llamas? (opcional)"
                onChange={(e) => setNombre(e.target.value)}
                className="input w-full text-center"
              />
              <input
                type="email"
                value={email}
                placeholder="Correo del apoderado"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && comenzarDemo()}
                className="input w-full text-center"
              />
              {errorEmail && (
                <span className="text-[12.5px] text-clay">{errorEmail}</span>
              )}
              <button
                onClick={comenzarDemo}
                disabled={cargando}
                className="cta mt-1 disabled:opacity-40"
              >
                {cargando ? "Preparando…" : "Empezar la clase"}
              </button>
              <span className="text-center text-[11.5px] text-ink-soft">
                Usaremos el correo solo para contarte del avance. Sin spam.
              </span>
            </div>
          </Reveal>
        </div>
      )}

      {/* ESFERA + MENSAJE DE RAI (bienvenida / materia / lección / cierre) */}
      {fase !== "email" && fase !== "ejercicios" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <AuraOrb materia={materia} activa={orbeActivo} size={96} />
          {mensajeRai && (
            <p className="mx-auto max-w-[36ch] whitespace-pre-line font-serif text-[24px] leading-[1.35] text-ink">
              <TextoRevelado texto={mensajeRai} />
            </p>
          )}

          {/* elegir materia */}
          {fase === "materia" && !cargando && (
            <div className="flex flex-wrap justify-center gap-2.5">
              {MATERIAS_DEMO.map((m) => (
                <button
                  key={m}
                  onClick={() => elegirMateria(m)}
                  className="rounded-full border border-hair px-4 py-2 text-[14px] text-ink transition-colors hover:border-sage"
                >
                  {MATERIAS.find((x) => x.id === m)?.label}
                </button>
              ))}
            </div>
          )}

          {/* pasar de la lección a los ejercicios */}
          {fase === "leccion" && !cargando && (
            <button onClick={empezarEjercicios} className="cta px-8">
              ¡Vamos a practicar!
            </button>
          )}

          {/* cierre que engancha */}
          {fase === "cierre" && (
            <div className="flex flex-col items-center gap-4">
              <p className="max-w-[34ch] text-[15px] text-ink-soft">
                Resolviste {aciertos} de {TOTAL_EJERCICIOS}. Rai puede acompañar
                a {nombre || "tu hijo"} cada día, con un plan a su medida hasta
                el examen.
              </p>
              <button onClick={onRegistrarse} className="cta px-8">
                Crear mi cuenta y seguir
              </button>
              <button
                onClick={onSalir}
                className="text-[13px] text-sage-deep underline underline-offset-4"
              >
                Volver al inicio
              </button>
            </div>
          )}
        </div>
      )}

      {/* EJERCICIOS */}
      {fase === "ejercicios" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="text-[12px] uppercase tracking-wider text-sage-deep">
            Ejercicio {idxEjercicio + 1} de {TOTAL_EJERCICIOS}
          </div>
          {cargando || !ejercicio ? (
            <p className="text-[15px] italic text-ink-soft">{TUTOR.nombre} prepara tu ejercicio…</p>
          ) : (
            <>
              <p className="mx-auto max-w-[34ch] font-serif text-[22px] leading-[1.3] text-ink">
                {ejercicio.enunciado}
              </p>
              <div className="flex w-full max-w-[340px] flex-col gap-2.5">
                {ejercicio.opciones.map((op, i) => {
                  const esCorrecta = op === ejercicio.respuestaFinal;
                  const marcar = feedback && esCorrecta;
                  const marcarMal = feedback === "no" && !esCorrecta;
                  return (
                    <button
                      key={i}
                      onClick={() => responder(op)}
                      disabled={!!feedback}
                      className={
                        "rounded-xl border px-4 py-3 text-[15px] transition-colors " +
                        (marcar
                          ? "border-sage bg-sage/10 text-ink"
                          : marcarMal
                            ? "border-hair text-ink-soft opacity-50"
                            : "border-hair text-ink hover:border-sage")
                      }
                    >
                      {op}
                    </button>
                  );
                })}
              </div>
              {feedback && (
                <div className="flex flex-col items-center gap-3">
                  <p className={"text-[15px] " + (feedback === "ok" ? "text-sage-deep" : "text-clay")}>
                    {feedback === "ok" ? "¡Muy bien! 🎉" : `Casi. La respuesta era ${ejercicio.respuestaFinal}.`}
                  </p>
                  <button onClick={siguiente} className="cta px-8">
                    {idxEjercicio + 1 >= TOTAL_EJERCICIOS ? "Ver resultado" : "Siguiente"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// rellena "{cajas} cajas" con datos.variables.cajas
function rellenar(enunciado: string, variables?: Record<string, unknown>): string {
  if (!variables) return enunciado;
  return enunciado.replace(/\{(\w+)\}/g, (_, k) =>
    variables[k] !== undefined ? String(variables[k]) : `{${k}}`
  );
}
