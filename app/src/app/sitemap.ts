import { MetadataRoute } from "next";
import { ARTICULOS_BLOG } from "@/lib/blog/articulos";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://examenes-libres.cl";

  const rutasEstaticas = [
    "",
    "/landing",
    "/demo",
    "/blog",
    "/terminos",
    "/privacidad",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  const rutasBlog = ARTICULOS_BLOG.map((art) => ({
    url: `${baseUrl}/blog/${art.slug}`,
    lastModified: new Date(art.fecha),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...rutasEstaticas, ...rutasBlog];
}
