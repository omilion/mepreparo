import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/cuenta", "/panel", "/tutor", "/hoy", "/estudiante/"],
      },
    ],
    sitemap: "https://examenes-libres.cl/sitemap.xml",
  };
}
