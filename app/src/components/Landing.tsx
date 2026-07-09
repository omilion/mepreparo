"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";
import { calcularPrecio, clp, DESCUENTO_ANUAL } from "@/lib/precios";

// Landing de venta. Se muestra en "/" a visitantes sin sesión. El CTA lleva al
// registro (AuthForm). Regla de marca: NUNCA decir "inteligencia artificial" —
// hablamos de un "tutor inteligente" que conoce a cada niño.

export function Landing({
  onComenzar,
  onProbar,
}: {
  onComenzar: () => void;
  onProbar: () => void;
}) {
  return (
    <div className="mx-auto max-w-zen px-[22px] pb-28">
      <Hero onComenzar={onComenzar} onProbar={onProbar} />
      <RumboAlExamen />
      <Valor />
      <ComoFunciona />
      <Precios onComenzar={onComenzar} />
      <CierreCTA onComenzar={onComenzar} />
    </div>
  );
}

// ---------------------------------------------------------------- Rumbo al examen
// El examen libre ES la meta: esta sección organiza la promesa alrededor de
// la fecha y los temarios oficiales, no del producto.
const RUMBO = [
  {
    titulo: "La fecha del examen manda",
    texto:
      "Ingresas la fecha en que tu hijo rinde y el plan calcula cuántas horas necesita por materia para llegar a tiempo. Si el tiempo aprieta, te lo decimos altiro.",
    urgente: true,
  },
  {
    titulo: "Se estudia lo que el examen evalúa",
    texto:
      "Trabajamos sobre los temarios oficiales de los exámenes de validación de estudios y las bases curriculares de cada curso. Nada de contenido de relleno.",
    urgente: false,
  },
  {
    titulo: "Primero, cerrar las brechas",
    texto:
      "Un diagnóstico corto detecta exactamente qué le falta a tu hijo para el examen, y el estudio parte por ahí: lo urgente primero.",
    urgente: false,
  },
];

function RumboAlExamen() {
  return (
    <section className="border-t border-hair py-16">
      <Reveal delay={80}>
        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-clay">
          La meta
        </div>
      </Reveal>
      <Reveal delay={140}>
        <h2 className="mb-10 max-w-[22ch] text-[28px]">
          Todo apunta a un solo día: el del examen
        </h2>
      </Reveal>

      <div className="flex flex-col gap-8">
        {RUMBO.map((r, i) => (
          <Reveal key={r.titulo} delay={220 + i * 100}>
            <div className="flex gap-4">
              <div
                className={
                  "mt-1.5 h-[10px] w-[10px] flex-none rounded-full " +
                  (r.urgente ? "bg-clay" : "bg-sage")
                }
                aria-hidden
              />
              <div>
                <h3 className="text-[18px]">{r.titulo}</h3>
                <p className="mt-1.5 max-w-[52ch] text-[14.5px] leading-[1.5] text-ink-soft">
                  {r.texto}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* franja de datos duros del examen */}
      <Reveal delay={560}>
        <div className="mt-10 flex flex-wrap gap-x-7 gap-y-2 border-t border-hair pt-6 text-[13px] text-ink-soft">
          <span>· 5 materias del examen</span>
          <span>· 1° a 8° básico</span>
          <span>· Temarios oficiales de validación de estudios</span>
          <span>· Plan calculado según tu fecha</span>
        </div>
      </Reveal>
    </section>
  );
}

// ---------------------------------------------------------------- Hero
function Hero({
  onComenzar,
  onProbar,
}: {
  onComenzar: () => void;
  onProbar: () => void;
}) {
  return (
    <section className="flex flex-col items-center pt-14 pb-20 text-center">
      <Reveal variant="lead" delay={60}>
        <div className="mb-4 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-sage-deep">
          Exámenes libres · Educación básica 1° a 8° · Chile 2026
        </div>
      </Reveal>
      <Reveal variant="lead" delay={120}>
        <h1 className="max-w-[15ch] text-[40px] leading-[1.08] sm:text-[52px]">
          Que tu hijo apruebe su examen libre
        </h1>
      </Reveal>
      <Reveal delay={480}>
        <p className="mt-6 max-w-[46ch] text-[16.5px] leading-[1.5] text-ink-soft">
          Con Rai, un tutor inteligente que lo conoce y lo acompaña con un plan
          a la medida hasta el día del examen. Con el respaldo de las bases
          curriculares vigentes y los temarios oficiales de los{" "}
          <strong>exámenes libres en Chile</strong>, tu hijo estudiará en casa
          con rumbo, calma y confianza.
        </p>
      </Reveal>
      <Reveal delay={640}>
        <div className="mt-9 flex flex-col items-center gap-3">
          <button onClick={onComenzar} className="cta px-9">
            Comienza gratis
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

// ---------------------------------------------------------------- Valor
const BENEFICIOS = [
  {
    titulo: "Te conoce y te recuerda",
    texto:
      "Rai arma contigo un horario semanal, recuerda de qué hablaron la última vez y retoma justo donde quedaron.",
  },
  {
    titulo: "Bases curriculares y profesores expertos",
    texto:
      "Nuestros tutores son expertos profesores que estructuran cada clase y explicación según las bases curriculares vigentes para cada curso y los temarios oficiales de exámenes libres en Chile para este año escolar 2026.",
  },
  {
    titulo: "Un plan según la fecha del examen",
    texto:
      "Un diagnóstico corto detecta el nivel de tu hijo y calcula cuántas horas necesita por materia para llegar a tiempo.",
  },
  {
    titulo: "El apoderado ve todo",
    texto:
      "Sigues el avance de cada hijo: horario, resumen de cada sesión, tiempo de estudio y en qué necesita apoyo.",
  },
];

function Valor() {
  return (
    <section className="border-t border-hair py-16">
      <Reveal delay={80}>
        <h2 className="mb-10 max-w-[22ch] text-[28px]">
          No es una app de ejercicios. Es alguien que estudia con tu hijo hasta
          el examen.
        </h2>
      </Reveal>
      <div className="grid gap-x-8 gap-y-9 sm:grid-cols-2">
        {BENEFICIOS.map((b, i) => (
          <Reveal key={b.titulo} delay={200 + i * 90}>
            <div>
              <div className="mb-2 h-[3px] w-8 rounded-full bg-sage" />
              <h3 className="text-[18px]">{b.titulo}</h3>
              <p className="mt-2 text-[14.5px] leading-[1.5] text-ink-soft">
                {b.texto}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

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
      <Reveal delay={80}>
        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
          Cómo funciona
        </div>
      </Reveal>
      <Reveal delay={140}>
        <h2 className="mb-10 text-[28px]">En tres pasos simples</h2>
      </Reveal>
      <div className="grid gap-8 sm:grid-cols-3">
        {PASOS.map((p, i) => (
          <Reveal key={p.n} delay={220 + i * 100}>
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
function Precios({ onComenzar }: { onComenzar: () => void }) {
  const [anual, setAnual] = useState(true);
  const [n, setN] = useState(1);
  const precio = calcularPrecio(n, anual);

  return (
    <section className="border-t border-hair py-16">
      <Reveal delay={80}>
        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
          Precios
        </div>
      </Reveal>
      <Reveal delay={140}>
        <h2 className="mb-3 text-[28px]">Un precio justo por familia</h2>
      </Reveal>
      <Reveal delay={200}>
        <p className="mb-8 max-w-[44ch] text-[15px] leading-[1.5] text-ink-soft">
          {clp(9990)} por estudiante al mes. Con más de un hijo, cada uno paga
          menos. Y pagando al año, un {Math.round(DESCUENTO_ANUAL * 100)}%
          adicional de descuento.
        </p>
      </Reveal>

      <Reveal delay={280}>
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
            Comienza gratis
          </button>
          <p className="mt-3 text-center text-[12px] text-ink-soft">
            Primer mes sin costo. Luego eliges tu plan.
          </p>
        </div>
      </Reveal>

      <Reveal delay={360}>
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

// ---------------------------------------------------------------- Cierre
function CierreCTA({ onComenzar }: { onComenzar: () => void }) {
  return (
    <section className="border-t border-hair py-16 text-center">
      <Reveal delay={80}>
        <h2 className="mx-auto max-w-[22ch] text-[30px]">
          El examen tiene fecha. La preparación empieza hoy.
        </h2>
      </Reveal>
      <Reveal delay={220}>
        <button onClick={onComenzar} className="cta mt-8 px-9">
          Crear mi cuenta
        </button>
      </Reveal>
    </section>
  );
}
