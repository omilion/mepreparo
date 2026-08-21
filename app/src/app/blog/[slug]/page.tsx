import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ARTICULOS_BLOG } from "@/lib/blog/articulos";

export async function generateStaticParams() {
  return ARTICULOS_BLOG.map((art) => ({
    slug: art.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const art = ARTICULOS_BLOG.find((a) => a.slug === slug);
  if (!art) return {};

  return {
    title: art.titulo,
    description: art.descripcion,
    keywords: art.keywords,
    alternates: {
      canonical: `/blog/${art.slug}`,
    },
    openGraph: {
      title: art.titulo,
      description: art.descripcion,
      url: `https://examenes-libres.cl/blog/${art.slug}`,
      type: "article",
      publishedTime: art.fecha,
      authors: [art.autor],
    },
    twitter: {
      card: "summary_large_image",
      title: art.titulo,
      description: art.descripcion,
    },
  };
}

export default async function PaginaArticulo({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const art = ARTICULOS_BLOG.find((a) => a.slug === slug);

  if (!art) notFound();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": art.titulo,
    "description": art.descripcion,
    "datePublished": art.fecha,
    "author": {
      "@type": "Organization",
      "name": art.autor,
      "url": "https://examenes-libres.cl"
    },
    "publisher": {
      "@type": "Organization",
      "name": "RAI - Exámenes Libres Chile",
      "logo": {
        "@type": "ImageObject",
        "url": "https://examenes-libres.cl/icon-512.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://examenes-libres.cl/blog/${art.slug}`
    }
  };

  return (
    <article className="zen-page min-h-screen pb-24 pt-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <nav className="mb-8 flex items-center gap-2 text-[13px] text-ink-soft">
        <Link href="/" className="hover:text-sage-deep">
          Inicio
        </Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-sage-deep">
          Blog
        </Link>
        <span>/</span>
        <span className="truncate text-ink">{art.categoria}</span>
      </nav>

      <header className="mb-10 border-b border-hair pb-8">
        <div className="flex items-center gap-3 text-[12.5px] text-sage-deep">
          <span className="rounded-full bg-sage-deep/10 px-3 py-1 font-semibold uppercase tracking-wider">
            {art.categoria}
          </span>
          <span>{art.fecha}</span>
          <span>·</span>
          <span>{art.tiempoLectura}</span>
        </div>

        <h1 className="mt-4 font-serif text-[32px] sm:text-[44px] leading-tight text-ink">
          {art.titulo}
        </h1>

        <p className="mt-4 font-serif text-[18px] italic leading-relaxed text-ink-soft">
          {art.contenido.resumen}
        </p>
      </header>

      <div className="flex flex-col gap-8 text-[16px] leading-[1.7] text-ink">
        {art.contenido.secciones.map((sec, idx) => (
          <section key={idx} className="flex flex-col gap-4">
            <h2 className="font-serif text-[26px] text-ink">{sec.subtitulo}</h2>
            {sec.parrafos.map((p, pIdx) => (
              <p key={pIdx} className="text-ink-soft">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <footer className="mt-16 rounded-zen border border-sage/30 bg-mist/30 p-8 text-center">
        <h3 className="font-serif text-[24px] text-ink">
          ¿Listo para preparar los Exámenes Libres de tu hijo?
        </h3>
        <p className="mx-auto mt-2 max-w-[46ch] text-[14.5px] text-ink-soft">
          Pruébalo gratis con Rai. Diagnóstico adaptativo, temarios del MINEDUC y voz lúdica.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/landing"
            className="rounded-full bg-sage-deep px-8 py-3 text-[14px] font-semibold text-paper shadow-sm hover:opacity-90 transition-opacity"
          >
            Comenzar Gratis en RAI →
          </Link>
          <Link
            href="/blog"
            className="rounded-full border border-hair px-6 py-3 text-[14px] text-ink hover:bg-hair/20"
          >
            Ver más artículos
          </Link>
        </div>
      </footer>
    </article>
  );
}
