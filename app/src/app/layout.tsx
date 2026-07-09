import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mepreparo",
  description:
    "Estudia con calma y prepara tu examen libre con un tutor que te conoce.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
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
    // El themeScript ajusta data-theme en <html> antes de hidratar (evita
    // parpadeo). Eso hace que el atributo difiera del HTML del servidor:
    // suppressHydrationWarning le dice a React que es esperado en este nodo.
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
