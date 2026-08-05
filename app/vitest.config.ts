import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // `npm run build` (output: "standalone") copia todo src/ dentro de
    // .next/standalone, incluidos los *.test.ts. Sin excluir esa carpeta,
    // vitest los vuelve a correr como si fueran fuente y compara contra un
    // snapshot congelado del build anterior (falsos fallos "de ayer").
    exclude: ["**/node_modules/**", "**/.next/**"],
  },
});
