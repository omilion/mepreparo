import type { Metadata } from "next";
import Link from "next/link";
import { ARTICULOS_BLOG } from "@/lib/blog/articulos";

export const metadata: Metadata = {
  title: "Blog & Guías Exámenes Libres Chile 2026",
  description:
    "Artículos, guías oficiales del MINEDUC, temarios de 1° a 8° básico y consejos para preparar los Exámenes Libres en Chile con éxito.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog & Guías Exámenes Libres Chile | RAI",
    description:
      "Información oficial, calendarios MINEDUC y estrategias de preparación para Exámenes Libres de educación básica en Chile.",
    url: "https://examenes-libres.cl/blog",
  },
};

export default function BlogIndexPage() {
  return (
    <main className="zen-page min-h-screen pb-24 pt-10">
      <header className="mb-12 border-b border-hair pb-8">
        <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-sage-deep">
          Recursos Pedagógicos & Guías MINEDUC
        </div>
        <h1 className="font-serif text-[36px] sm:text-[44px] leading-tight text-ink">
          Exámenes Libres Chile: Blog & Orientación
        </h1>
        <p className="mt-4 max-w-[55ch] text-[16px] leading-[1.5] text-ink-soft">
          Artículos preparados por educadores para orientar a apoderados y estudiantes sobre el proceso de validación de estudios en Chile.
        </p>
      </header>

      <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {ARTICULOS_BLOG.map((art) => (
          <article
            key={art.slug}
            className="flex flex-col justify-between rounded-zen border border-hair p-6 transition-colors hover:border-sage/50"
          >
            <div>
              <div className="flex items-center justify-between gap-2 text-[12px] text-sage-deep">
                <span className="font-semibold uppercase tracking-wider">{art.categoria}</span>
                <span>{art.tiempoLectura}</span>
              </div>
              <h2 className="mt-3 font-serif text-[22px] leading-snug text-ink hover:text-sage-deep">
                <Link href={`/blog/${art.slug}`}>{art.titulo}</Link>
              </h2>
              <p className="mt-3 text-[14px] leading-[1.5] text-ink-soft">
                {art.descripcion}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-hair/60 pt-4 text-[12.5px] text-ink-soft">
              <span>{art.fecha}</span>
              <Link
                href={`/blog/${art.slug}`}
                className="font-semibold text-sage-deep underline underline-offset-4 hover:opacity-80"
              >
                Leer guía →
              </Link>
            </div>
          </article>
        ))}
      </section>

      <footer className="mt-16 rounded-zen bg-mist/40 p-8 text-center">
        <h3 className="font-serif text-[24px] text-ink">
          ¿Quieres preparar los Exámenes Libres con un plan personalizado?
        </h3>
        <p className="mx-auto mt-2 max-w-[48ch] text-[14.5px] text-ink-soft">
          Descubre a Rai, el tutor inteligente adaptado a las Bases Curriculares oficiales de Chile.
        </p>
        <div className="mt-6">
          <Link
            href="/landing"
            className="inline-block rounded-full bg-sage-deep px-8 py-3 text-[14px] font-semibold text-paper shadow-sm hover:opacity-90 transition-opacity"
          >
            Conoce RAI gratis →
          </Link>
        </div>
      </footer>
    </main>
  );
}
