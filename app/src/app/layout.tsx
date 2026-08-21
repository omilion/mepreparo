import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientLayout } from "./client-layout";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  metadataBase: new URL("https://examenes-libres.cl"),
  title: {
    default: "RAI - Exámenes Libres 2026 Chile | Prepara tu Examen con IA",
    template: "%s | RAI Exámenes Libres Chile",
  },
  description:
    "Prepara tus Exámenes Libres en Chile (1° a 8° básico) con Rai. Tutor inteligente con diagnóstico adaptativo, plan personalizado y bases curriculares del MINEDUC.",
  keywords: [
    "examenes libres chile",
    "examenes libres mineduc 2026",
    "preparar examenes libres",
    "tutor ia examenes libres",
    "validación de estudios chile",
    "temarios examenes libres 1 a 8 basico",
    "homeschool chile",
  ],
  authors: [{ name: "RAI - Exámenes Libres", url: "https://examenes-libres.cl" }],
  creator: "RAI",
  publisher: "RAI - Exámenes Libres Chile",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "RAI - Exámenes Libres 2026 Chile 📚🇨🇱",
    description:
      "Tutor de Inteligencia Artificial para preparar tus Exámenes Libres de 1° a 8° básico en Chile con el plan oficial del MINEDUC.",
    url: "https://examenes-libres.cl",
    siteName: "RAI - Exámenes Libres",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RAI - Exámenes Libres 2026 Chile 📚🇨🇱",
    description:
      "Prepara a tu hijo para sus Exámenes Libres en Chile con un tutor IA a su medida y temarios oficiales del MINEDUC.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RAI",
  },
};

export const viewport: Viewport = {
  themeColor: "#5b8a72",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Aplica el tema guardado antes del primer render para evitar parpadeo.
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem("mp-theme");
    if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <JsonLd />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
