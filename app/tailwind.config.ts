import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Se resuelven desde variables CSS para soportar claro/oscuro (ver globals.css)
        paper: "var(--paper)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        sage: "var(--sage)",
        "sage-deep": "var(--sage-deep)",
        clay: "var(--clay)",
        mist: "var(--mist)",
        hair: "var(--hair)",
        // exclusivo de la sopa de letras (ver globals.css)
        gold: "var(--gold)",
        "gold-soft": "var(--gold-soft)",
      },
      fontFamily: {
        serif: ["var(--font-serif)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        zen: "18px",
      },
      maxWidth: {
        zen: "560px",
      },
    },
  },
  plugins: [],
};

export default config;
