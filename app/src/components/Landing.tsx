"use client";

import { useState, useEffect } from "react";
import { Reveal } from "./Reveal";
import { calcularPrecio, clp, DESCUENTO_ANUAL } from "@/lib/precios";
import { AuraOrb } from "./AuraOrb";
import { TextoRevelado } from "./TextoRevelado";
import { IconoZen } from "./IconoZen";

// Typewriter helper para la demo de Rai en el Hero
function TypewriterText({ texto, velocidad = 50 }: { texto: string; velocidad?: number }) {
  const [visible, setVisible] = useState("");
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < texto.length) {
        setVisible(texto.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, velocidad);
    return () => clearInterval(interval);
  }, [texto, velocidad]);

  return <span>{visible}</span>;
}

// Helper para animación de entrada palabra por palabra (fade-up por palabra)
function FadeUpWords({ texto, delayBase = 300, stagger = 180 }: { texto: string; delayBase?: number; stagger?: number }) {
  const words = texto.split(" ");
  return (
    <span className="inline-block">
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block opacity-0 animate-fade-up-word mr-[0.25em]"
          style={{
            animationDelay: `${delayBase + i * stagger}ms`,
            animationFillMode: "forwards",
          }}
        >
          {word}
        </span>
      ))}
      <style jsx>{`
        @keyframes fadeUpWord {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-up-word {
          animation: fadeUpWord 0.9s cubic-bezier(.22, 1, .36, 1);
        }
      `}</style>
    </span>
  );
}

import Link from "next/link";

export function Landing({
  onComenzar,
  onProbar,
  textoAccion,
}: {
  onComenzar: () => void;
  onProbar: () => void;
  textoAccion?: string;
}) {
  return (
    <div className="zen-page pb-28">
      <Hero onComenzar={onComenzar} onProbar={onProbar} textoAccion={textoAccion} />
      <RumboAlExamen />
      <SeccionTutor />
      <SeccionPlanExamen />
      <SeccionValorTypewriter />
      <SeccionApoderado />
      <ComoFunciona />
      <Precios onComenzar={onComenzar} textoAccion={textoAccion} />
      <SeccionSonidoFoco />
      <Faq />
      <CierreCTA onComenzar={onComenzar} textoAccion={textoAccion} />
      <SeccionFooterSEO />
    </div>
  );
}

function RumboAlExamen() {
  return (
    <section className="border-t border-hair py-20 text-center">
      <Reveal delay={150}>
        <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-clay">
          Respaldo Curricular
        </div>
      </Reveal>
      <Reveal delay={400}>
        <h2 className="mx-auto mb-8 max-w-[28ch] font-serif text-[32px] sm:text-[40px] leading-[1.15]">
          Preparación oficial y rigurosa alineada al currículum del MINEDUC
        </h2>
      </Reveal>
      <Reveal delay={800}>
        <p className="mx-auto mb-12 max-w-[62ch] text-[17px] leading-[1.6] text-ink-soft">
          El examen de validación de estudios es exigente y evalúa contenidos específicos.
          Por eso, estructuramos todo el material basándonos directamente en las <strong>Bases Curriculares vigentes de Chile</strong>
          y los temarios oficiales de la Unidad de Currículum y Evaluación (UCE) del Ministerio de Educación. Tu hijo no perderá tiempo
          con materias de relleno; estudiará exactamente lo que mide la prueba.
        </p>
      </Reveal>

      <div className="mx-auto flex max-w-[450px] flex-col items-center gap-4 text-center text-[16.5px] sm:text-[18px] font-medium text-ink">
        {[
          "100% Bases Curriculares MINEDUC",
          "Temarios oficiales vigentes",
          "Enfoque en rendimiento y aprobación",
          "Pensado para niños de todas las edades.",
          "Se estudia lo que el examen evalúa",
          "Primero, cerramos las brechas",
        ].map((bullet, i) => (
          <Reveal key={bullet} delay={1200 + i * 350}>
            <div className="flex items-center gap-2">
              <span className="text-sage-deep">✓</span> {bullet}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Hero
function Hero({
  onComenzar,
  onProbar,
  textoAccion,
}: {
  onComenzar: () => void;
  onProbar: () => void;
  textoAccion?: string;
}) {
  return (
    <section className="flex min-h-[100vh] flex-col items-center justify-center pt-14 pb-20 text-center">
      <Reveal variant="lead" delay={150}>
        <div className="mb-4 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-sage-deep">
          Exámenes libres · Educación básica 1° a 8° · Chile 2026
        </div>
      </Reveal>
      <Reveal variant="lead" delay={400}>
        <h1 className="max-w-[20ch] text-[40px] leading-[1.08] sm:text-[52px]">
          Exámenes Libres 2026: Que tu hijo apruebe con un plan a su medida
        </h1>
      </Reveal>
      <Reveal delay={900}>
        <p className="mt-6 max-w-[46ch] text-[16.5px] leading-[1.5] text-ink-soft">
          Con Rai, un tutor inteligente que lo acompaña con un plan a la medida
          y soporte oficial de las bases curriculares de los{" "}
          <strong>exámenes libres en Chile</strong>. Tu hijo estudiará en casa con rumbo,
          calma y confianza (¡con micrófono para responder hablando!).
        </p>
      </Reveal>
      <Reveal delay={1400}>
        <div className="mt-9 flex flex-col items-center gap-3">
          <button onClick={onComenzar} className="cta px-9">
            {textoAccion ?? "Comienza gratis"}
          </button>
          <button
            onClick={onProbar}
            className="text-[14px] font-[560] text-sage-deep underline underline-offset-4 hover:opacity-80"
          >
            o prueba una clase con Rai, sin registrarte →
          </button>
          <span className="text-[12.5px] text-ink-soft">
            Primer mes sin costo · sin tarjeta para empezar
          </span>
        </div>
      </Reveal>
    </section>
  );
}

// Valor y beneficios integrados directamente como secciones completas.

// ---------------------------------------------------------------- Cómo funciona
const PASOS = [
  {
    n: "1",
    titulo: "Configuras a tu hijo",
    texto: "Curso, materias del examen, fecha y cuánto tiempo tiene por semana.",
  },
  {
    n: "2",
    titulo: "Un diagnóstico lo conoce",
    texto: "Una prueba corta y adaptativa detecta su nivel real en cada materia.",
  },
  {
    n: "3",
    titulo: "Estudia con Rai",
    texto: "Recibe su plan y empieza a estudiar acompañado, día a día, hasta el examen.",
  },
];

function ComoFunciona() {
  return (
    <section className="border-t border-hair py-16">
      <Reveal delay={150}>
        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
          Cómo funciona
        </div>
      </Reveal>
      <Reveal delay={400}>
        <h2 className="mb-10 text-[28px]">En tres pasos simples</h2>
      </Reveal>
      <div className="grid gap-8 sm:grid-cols-3">
        {PASOS.map((p, i) => (
          <Reveal key={p.n} delay={800 + i * 400}>
            <div className="flex flex-col gap-2">
              <span className="font-serif text-[34px] text-sage">{p.n}</span>
              <h3 className="text-[18px]">{p.titulo}</h3>
              <p className="text-[14.5px] leading-[1.5] text-ink-soft">{p.texto}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Precios
function Precios({
  onComenzar,
  textoAccion,
}: {
  onComenzar: () => void;
  textoAccion?: string;
}) {
  const [anual, setAnual] = useState(true);
  const [n, setN] = useState(1);
  const precio = calcularPrecio(n, anual);

  return (
    <section className="border-t border-hair py-16">
      <Reveal delay={150}>
        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
          Precios
        </div>
      </Reveal>
      <Reveal delay={400}>
        <h2 className="mb-3 text-[28px]">Un precio justo por familia</h2>
      </Reveal>
      <Reveal delay={800}>
        <p className="mb-8 max-w-[44ch] text-[15px] leading-[1.5] text-ink-soft">
          {clp(9990)} por estudiante al mes. Con más de un hijo, cada uno paga
          menos. Y pagando al año, un {Math.round(DESCUENTO_ANUAL * 100)}%
          adicional de descuento. Opcional: Add-on de Voz Completa para pre-lectores por {clp(5990)} al mes.
        </p>
      </Reveal>

      <Reveal delay={1200}>
        <div className="rounded-[18px] border border-hair bg-surface/60 p-6 sm:p-8">
          {/* Toggle mensual / anual — muy claro */}
          <div className="mb-7 flex justify-center">
            <div className="relative inline-flex rounded-full border border-hair bg-paper p-1 text-[13.5px]">
              <span
                className="absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-sage-deep transition-transform duration-300"
                style={{ transform: anual ? "translateX(100%)" : "translateX(0)" }}
                aria-hidden
              />
              <button
                onClick={() => setAnual(false)}
                className={
                  "relative z-10 w-[92px] rounded-full py-1.5 font-[560] transition-colors " +
                  (!anual ? "text-white" : "text-ink-soft")
                }
              >
                Mensual
              </button>
              <button
                onClick={() => setAnual(true)}
                className={
                  "relative z-10 w-[92px] rounded-full py-1.5 font-[560] transition-colors " +
                  (anual ? "text-white" : "text-ink-soft")
                }
              >
                Anual
              </button>
            </div>
          </div>

          {anual && (
            <div className="mb-5 text-center">
              <span className="rounded-full bg-clay/12 px-3 py-1 text-[12px] font-semibold text-clay">
                Ahorras {clp(precio.ahorroAnual)} al año
              </span>
            </div>
          )}

          {/* Selector de cantidad de estudiantes */}
          <div className="mb-7 flex flex-col items-center gap-3">
            <span className="text-[12.5px] uppercase tracking-wider text-ink-soft">
              ¿Cuántos estudiantes?
            </span>
            <div className="flex items-center gap-3">
              <BotonN activo={n} valor={1} set={setN} />
              <BotonN activo={n} valor={2} set={setN} />
              <BotonN activo={n} valor={3} set={setN} />
              <BotonN activo={n} valor={4} set={setN} etiqueta="4+" />
            </div>
          </div>

          {/* Precio resultante */}
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-[44px] leading-none text-ink">
                {clp(precio.mensualEfectivo)}
              </span>
              <span className="text-[14px] text-ink-soft">/ mes</span>
            </div>
            {anual ? (
              <span className="text-[13px] text-ink-soft">
                facturado {clp(precio.totalCiclo)} al año
                {n > 1 ? ` · ${n} estudiantes` : ""}
              </span>
            ) : (
              <span className="text-[13px] text-ink-soft">
                {n > 1 ? `${n} estudiantes · ` : ""}sin permanencia, cancelas cuando quieras
              </span>
            )}
          </div>

          <button onClick={onComenzar} className="cta mt-7">
            {textoAccion ?? "Comienza gratis"}
          </button>
          <p className="mt-3 text-center text-[12px] text-ink-soft">
            Primer mes sin costo. Luego eliges tu plan.
          </p>
        </div>
      </Reveal>

      <Reveal delay={1600}>
        <p className="mt-5 text-center text-[12.5px] text-ink-soft">
          Descuento familiar: 2° estudiante 10% · 3° 15% · 4° o más 20% cada uno.
        </p>
      </Reveal>
    </section>
  );
}

function BotonN({
  activo,
  valor,
  set,
  etiqueta,
}: {
  activo: number;
  valor: number;
  set: (n: number) => void;
  etiqueta?: string;
}) {
  const on = activo === valor;
  return (
    <button
      onClick={() => set(valor)}
      className={
        "h-11 w-11 rounded-full border text-[15px] font-[560] transition-colors " +
        (on
          ? "border-sage-deep bg-sage-deep text-white"
          : "border-hair text-ink-soft hover:border-sage")
      }
    >
      {etiqueta ?? valor}
    </button>
  );
}

// ---------------------------------------------------------------- Seccion Tutor (Rai)
function SeccionTutor() {
  const [mostrarTexto, setMostrarTexto] = useState(false);

  return (
    <section className="border-t border-hair py-20 bg-surface/10 rounded-[24px] my-4 px-6 sm:px-10">
      <div className="flex flex-col items-center text-center">
        <Reveal delay={150}>
          <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
            El Acompañante de Estudio
          </div>
        </Reveal>
        <Reveal delay={400}>
          <h2 className="mb-6 text-[32px] sm:text-[40px] max-w-[24ch] font-serif">
            Te conoce, te escucha y te recuerda
          </h2>
        </Reveal>
        <Reveal delay={800}>
          <p className="mb-8 max-w-[62ch] text-[16.5px] leading-[1.6] text-ink-soft">
            Rai no es un software estático; es un tutor interactivo que acompaña de forma cercana a tu hijo en cada paso:
          </p>
        </Reveal>

        <div className="mb-10 flex flex-col items-center gap-4 text-[16px] text-ink-soft font-medium max-w-[500px]">
          <Reveal delay={1100}>
            <div className="flex items-start gap-2.5 text-left">
              <span className="text-sage-deep mt-0.5">✦</span>
              <span><strong className="text-ink">Plan Personalizado:</strong> Diseña y ajusta el ritmo de estudio según las fortalezas y necesidades de aprendizaje de tu hijo.</span>
            </div>
          </Reveal>
          <Reveal delay={1450}>
            <div className="flex items-start gap-2.5 text-left">
              <span className="text-sage-deep mt-0.5">✦</span>
              <span><strong className="text-ink">Ejercicios Interactivos:</strong> Genera dinámicas dinámicas (como sopas de letras y conectores) para evitar la fatiga y mantener el foco.</span>
            </div>
          </Reveal>
          <Reveal delay={1800}>
            <div className="flex items-start gap-2.5 text-left">
              <span className="text-sage-deep mt-0.5">✦</span>
              <span><strong className="text-ink">Responder hablando:</strong> Los niños más pequeños (1° y 2° básico) pueden contestarle a Rai por micrófono, sin tener que escribir.</span>
            </div>
          </Reveal>
        </div>

        <Reveal 
          delay={2600} 
          onVisible={() => {
            setTimeout(() => {
              setMostrarTexto(true);
            }, 800);
          }}
        >
          <div className="flex flex-col items-center gap-4 my-4 min-w-[280px] sm:min-w-[400px]">
            <AuraOrb materia="matematica" activa size={120} />
            <p className="font-serif text-[21px] text-sage-deep min-h-[32px] italic mt-2 text-center">
              {mostrarTexto ? <TextoRevelado texto="Hola, soy Rai. Hoy nos toca Matemática." stagger={0.25} /> : ""}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Plan según fecha
function SeccionPlanExamen() {
  return (
    <section className="border-t border-hair py-20 text-center">
      <Reveal delay={150}>
        <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-clay">
          Planificación Inteligente
        </div>
      </Reveal>
      <Reveal delay={400}>
        <h2 className="mx-auto mb-6 max-w-[24ch] font-serif text-[32px] sm:text-[40px]">
          Un plan según la fecha del examen
        </h2>
      </Reveal>
      <Reveal delay={800}>
        <p className="mx-auto mb-10 max-w-[62ch] text-[16.5px] leading-[1.6] text-ink-soft">
          Calculamos la ruta de estudio exacta para que tu hijo rinde con calma y preparación completa:
        </p>
      </Reveal>

      <div className="mx-auto flex max-w-[500px] flex-col items-center gap-4 text-center text-[16px] text-ink font-medium">
        <Reveal delay={1150}>
          <div className="flex items-start gap-3 text-left bg-surface/30 p-4 rounded-xl w-full">
            <span className="text-clay font-bold text-[18px]">1.</span>
            <div>
              <h4 className="text-[17px] font-semibold text-ink">Diagnóstico Adaptativo</h4>
              <p className="text-[14px] text-ink-soft mt-1 leading-[1.4]">Una prueba corta y guiada detecta el nivel real en cada asignatura en pocos minutos.</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={1500}>
          <div className="flex items-start gap-3 text-left bg-surface/30 p-4 rounded-xl w-full">
            <span className="text-clay font-bold text-[18px]">2.</span>
            <div>
              <h4 className="text-[17px] font-semibold text-ink">Cálculo de Horas Semanales</h4>
              <p className="text-[14px] text-ink-soft mt-1 leading-[1.4]">El motor procesa el tiempo disponible hasta el examen y planifica cuántas horas necesita estudiar por materia.</p>
            </div>
          </div>
        </Reveal>
        <Reveal delay={1850}>
          <div className="flex items-start gap-3 text-left bg-surface/30 p-4 rounded-xl w-full">
            <span className="text-clay font-bold text-[18px]">3.</span>
            <div>
              <h4 className="text-[17px] font-semibold text-ink">Alerta Preventiva</h4>
              <p className="text-[14px] text-ink-soft mt-1 leading-[1.4]">Si los plazos son demasiado cortos o el ritmo de estudio no es suficiente, te lo notificamos altiro para ajustar el rumbo.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Valor (Tutor AI vs App ejercicios)
function SeccionValorTypewriter() {
  return (
    <section className="border-t border-hair py-24 text-center bg-surface/5 rounded-[24px] my-4 px-6">
      <h2 className="mx-auto max-w-[32ch] text-[34px] sm:text-[46px] font-serif leading-[1.25] text-ink">
        <FadeUpWords 
          texto="No es una app de ejercicios. Es tutor que estudia con tu hijo hasta el examen." 
          delayBase={300}
          stagger={300}
        />
      </h2>
    </section>
  );
}

// ---------------------------------------------------------------- Apoderado
function SeccionApoderado() {
  return (
    <section className="border-t border-hair py-20 text-center">
      <Reveal delay={150}>
        <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
          Panel de Control
        </div>
      </Reveal>
      <Reveal delay={400}>
        <h2 className="mx-auto mb-6 max-w-[24ch] font-serif text-[32px] sm:text-[40px]">
          El apoderado ve todo
        </h2>
      </Reveal>
      <Reveal delay={800}>
        <p className="mx-auto mb-10 max-w-[62ch] text-[16.5px] leading-[1.6] text-ink-soft">
          Acompaña el progreso de tus hijos con total claridad y sin necesidad de supervisión intrusiva:
        </p>
      </Reveal>

      <div className="mx-auto flex max-w-[480px] flex-col items-center gap-5 text-center text-[16px] text-ink-soft font-medium">
        <Reveal delay={1150}>
          <div className="flex items-start gap-3 text-left">
            <span className="text-sage-deep text-[20px] leading-none">✓</span>
            <div>
              <strong className="text-ink">Reporte de Sesión:</strong> Un resumen pedagógico automático redactado por Rai al final de cada tutoría.
            </div>
          </div>
        </Reveal>
        <Reveal delay={1500}>
          <div className="flex items-start gap-3 text-left">
            <span className="text-sage-deep text-[20px] leading-none">✓</span>
            <div>
              <strong className="text-ink">Hábitos y Tiempos:</strong> Monitoreo simple del tiempo de estudio diario y cumplimiento de metas semanales.
            </div>
          </div>
        </Reveal>
        <Reveal delay={1850}>
          <div className="flex items-start gap-3 text-left">
            <span className="text-sage-deep text-[20px] leading-none">✓</span>
            <div>
              <strong className="text-ink">Foco en Brechas:</strong> Visualización directa de qué objetivos de aprendizaje (OA) específicos necesitan más apoyo.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Sonidos de Foco / Concentración
function SeccionSonidoFoco() {
  return (
    <section className="border-t border-hair py-20 text-center bg-surface/5 rounded-[24px] my-4 px-6 sm:px-10">
      <Reveal delay={150}>
        <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-clay">
          Foco y Calma
        </div>
      </Reveal>
      <Reveal delay={400}>
        <h2 className="mx-auto mb-6 max-w-[24ch] font-serif text-[32px] sm:text-[40px]">
          Sonido ambiental para la concentración
        </h2>
      </Reveal>
      <Reveal delay={800}>
        <p className="mx-auto mb-10 max-w-[62ch] text-[16.5px] leading-[1.6] text-ink-soft">
          Integramos un sistema de sonido con base científica diseñado para niños que necesitan aislar distracciones y calmar la ansiedad:
        </p>
      </Reveal>

      <div className="mx-auto flex max-w-[460px] flex-col items-center gap-4 text-[16px] text-ink-soft font-medium">
        <Reveal delay={1150}>
          <div className="flex items-center justify-between w-full bg-surface/30 px-5 py-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <IconoZen nombre="musica" size={20} className="text-sage-deep" />
              <span className="text-ink font-semibold">Lira Clásica</span>
            </div>
            <span className="text-[13.5px] text-ink-soft">Estímulo armónico y relajante</span>
          </div>
        </Reveal>
        <Reveal delay={1500}>
          <div className="flex items-center justify-between w-full bg-surface/30 px-5 py-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <IconoZen nombre="viento" size={20} className="text-sage-deep" />
              <span className="text-ink font-semibold">Ruido Blanco</span>
            </div>
            <span className="text-[13.5px] text-ink-soft">Aislamiento acústico del entorno</span>
          </div>
        </Reveal>
        <Reveal delay={1850}>
          <div className="flex items-center justify-between w-full bg-surface/30 px-5 py-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <IconoZen nombre="agua" size={20} className="text-sage-deep" />
              <span className="text-ink font-semibold">Lluvia Natural</span>
            </div>
            <span className="text-[13.5px] text-ink-soft">Sonido orgánico de fondo constante</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Q&A / FAQs
const PREGUNTAS_FRECUENTES = [
  {
    pregunta: "¿Qué son los Exámenes Libres y a quiénes están dirigidos?",
    respuesta:
      "Los exámenes libres son un mecanismo oficial del Ministerio de Educación de Chile (MINEDUC) que permite certificar estudios de educación básica o media a personas que no asisten al sistema regular escolar, ya sea por opción familiar (homeschooling, pedagogías alternativas), deporte de alto rendimiento, arte, o salud.",
  },
  {
    pregunta: "¿Cómo se asegura RAI de cubrir los temarios oficiales del MINEDUC?",
    respuesta:
      "RAI se conecta directamente con una base de datos documental que contiene las Bases Curriculares oficiales de Chile y los temarios vigentes publicados por la Unidad de Currículum del MINEDUC. El plan se adapta a esos objetivos de aprendizaje (OA) específicos.",
  },
  {
    pregunta: "¿Mi hijo puede responder hablando en vez de escribir en pantalla?",
    respuesta:
      "Sí. En el chat con RAI hay un botón de micrófono: el niño lo presiona, habla, y sus palabras aparecen escritas para enviarlas. Es especialmente útil para los estudiantes más pequeños de 1° a 4° básico que aún escriben lento.",
  },
  {
    pregunta: "¿El primer mes es realmente gratuito? ¿Necesito tarjeta de crédito?",
    respuesta:
      "Sí, el primer mes es 100% gratuito para que puedas probar la metodología y el tutor con tranquilidad. No solicitamos tarjetas de crédito ni datos bancarios para iniciar. Si decides continuar después del mes de prueba, eliges tu plan.",
  },
  {
    pregunta: "¿Qué control e información tiene el apoderado sobre el proceso?",
    respuesta:
      "Los padres tienen acceso a un panel de control exclusivo donde pueden ver en tiempo real la cantidad de sesiones realizadas, el tiempo de estudio diario, los resúmenes pedagógicos redactados por RAI, los temas dominados y las brechas a reforzar.",
  },
  {
    pregunta: "¿El certificado de Exámenes Libres es 100% válido en Chile?",
    respuesta:
      "Sí, el certificado de estudios es emitido directamente por el Ministerio de Educación de Chile (MINEDUC) con firma electrónica avanzada. Tiene la misma validez legal que la libreta de notas de un colegio tradicional para matricularse o certificar nivel.",
  },
  {
    pregunta: "¿En qué fechas y dónde se rinden las pruebas presenciales?",
    respuesta:
      "El MINEDUC fija dos periodos de evaluación al año (habitualmente junio/julio y octubre/noviembre). Las pruebas se rinden en colegios examinadores designados por la Secretaría Regional Ministerial (SECREDUC) correspondientes a tu comuna.",
  },
  {
    pregunta: "¿Cómo ayuda RAI a niños que se distraen o se aburren fácil?",
    respuesta:
      "RAI no usa PDFs largos. Las sesiones duran de 15 a 25 minutos y combinan conversación cercana, interactivos dinámicos (sopas de letras, conectores, ruedas, secuencias) y sonidos ambientales de foco (lira, ruido blanco, lluvia) para mantener la concentración.",
  },
  {
    pregunta: "¿Qué asignaturas se evalúan de 1° a 8° básico?",
    respuesta:
      "Las asignaturas troncales evaluadas son Matemática, Lenguaje y Comunicación, Ciencias Naturales e Historia, Geografía y Ciencias Sociales. Según el nivel (5° a 8° básico), también se incluye la asignatura de Idioma Extranjero Inglés.",
  },
  {
    pregunta: "¿Puedo registrar a varios de mis hijos en la misma cuenta?",
    respuesta:
      "Sí, la plataforma permite registrar múltiples hermanos en una sola cuenta de apoderado. Cada hijo tiene su propia sesión, avance independiente y tutor personalizado, además de descuentos familiares de 10%, 15% y 20% a partir del 2° hijo.",
  },
];

function Faq() {
  const [abierto, setAbierto] = useState<number | null>(null);

  // Divide las 10 preguntas en 2 columnas para escritorio
  const col1 = PREGUNTAS_FRECUENTES.slice(0, 5);
  const col2 = PREGUNTAS_FRECUENTES.slice(5, 10);

  function renderFaqItem(faq: typeof PREGUNTAS_FRECUENTES[0], index: number) {
    const isOpen = abierto === index;
    return (
      <div key={index} className="border-b border-hair/60 pb-4">
        <button
          type="button"
          onClick={() => setAbierto(isOpen ? null : index)}
          className="flex w-full items-center justify-between text-left py-2.5 focus:outline-none"
        >
          <span className="text-[16px] font-medium text-ink pr-3">{faq.pregunta}</span>
          <span className="text-[20px] font-semibold text-sage-deep shrink-0">
            {isOpen ? "−" : "+"}
          </span>
        </button>
        <div
          className={`mt-2 text-[14px] leading-[1.6] text-ink-soft overflow-hidden transition-all duration-300 ${
            isOpen ? "max-h-[350px] opacity-100 pb-2" : "max-h-0 opacity-0 pointer-events-none"
          }`}
        >
          {faq.respuesta}
        </div>
      </div>
    );
  }

  return (
    <section className="border-t border-hair py-20">
      <Reveal delay={150}>
        <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
          Preguntas Frecuentes
        </div>
      </Reveal>
      <Reveal delay={400}>
        <h2 className="mb-10 text-[32px] sm:text-[40px] font-serif">Dudas frecuentes</h2>
      </Reveal>

      <Reveal delay={600}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
          <div className="flex flex-col gap-4">
            {col1.map((faq, i) => renderFaqItem(faq, i))}
          </div>
          <div className="flex flex-col gap-4">
            {col2.map((faq, i) => renderFaqItem(faq, i + 5))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------- Cierre
function CierreCTA({
  onComenzar,
  textoAccion,
}: {
  onComenzar: () => void;
  textoAccion?: string;
}) {
  return (
    <section className="border-t border-hair py-16 text-center">
      <Reveal delay={150}>
        <h2 className="mx-auto max-w-[22ch] text-[30px]">
          El examen tiene fecha. La preparación empieza hoy.
        </h2>
      </Reveal>
      <Reveal delay={500}>
        <button onClick={onComenzar} className="cta mt-8 px-9">
          {textoAccion ?? "Crear mi cuenta"}
        </button>
      </Reveal>
    </section>
  );
}

function SeccionFooterSEO() {
  return (
    <footer className="border-t border-hair pt-14 pb-12 text-ink-soft">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="font-serif text-[20px] font-bold text-ink">RAI</div>
          <p className="mt-2 text-[13.5px] leading-[1.6]">
            Plataforma de Inteligencia Artificial para la preparación de Exámenes Libres de Educación Básica (1° a 8° básico) en Chile.
          </p>
          <div className="mt-3 text-[12px] text-sage-deep font-mono">
            examenes-libres.cl 🇨🇱
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink">
            Blog & Guías SEO
          </h4>
          <ul className="flex flex-col gap-2 text-[13.5px]">
            <li>
              <Link href="/blog" className="hover:text-sage-deep transition-colors">
                Blog Principal
              </Link>
            </li>
            <li>
              <Link
                href="/blog/guia-completa-examenes-libres-mineduc-2026"
                className="hover:text-sage-deep transition-colors"
              >
                Guía Exámenes Libres 2026
              </Link>
            </li>
            <li>
              <Link
                href="/blog/temarios-oficiales-examenes-libres-1-a-8-basico"
                className="hover:text-sage-deep transition-colors"
              >
                Temarios MINEDUC 1° a 8°
              </Link>
            </li>
            <li>
              <Link
                href="/blog/como-preparar-examenes-libres-en-casa-con-ia"
                className="hover:text-sage-deep transition-colors"
              >
                Estudio con IA en Casa
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink">
            Asignaturas Evaluadas
          </h4>
          <ul className="flex flex-col gap-2 text-[13.5px]">
            <li>Matemática (Bases Curriculares)</li>
            <li>Lenguaje y Comunicación</li>
            <li>Ciencias Naturales</li>
            <li>Historia, Geografía y C. Sociales</li>
            <li>Idioma Extranjero Inglés</li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink">
            Legales & Acceso
          </h4>
          <ul className="flex flex-col gap-2 text-[13.5px]">
            <li>
              <Link href="/terminos" className="hover:text-sage-deep transition-colors">
                Términos del Servicio
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="hover:text-sage-deep transition-colors">
                Política de Privacidad
              </Link>
            </li>
            <li>
              <Link href="/demo" className="hover:text-sage-deep transition-colors">
                Demo interactiva
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12 border-t border-hair/60 pt-6 text-center text-[12.5px]">
        © {new Date().getFullYear()} RAI — examenes-libres.cl · Todos los derechos reservados.
      </div>
    </footer>
  );
}
