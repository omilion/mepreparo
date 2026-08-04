// Genera los PNG que faltan para que la PWA sea instalable en iOS/Android
// (Safari no acepta SVG en apple-touch-icon; Android pide "maskable" con
// zona segura). Se corre una vez y no queda en el build de producción.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");

const ICONO_BASE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" rx="6" fill="#f5f3ee"/>
  <path d="M5 7.5C5 6.5 5.7 6 6.7 6H12v12H6.7C5.7 18 5 17.5 5 16.5V7.5Z" fill="#5b8a72"/>
  <path d="M19 7.5C19 6.5 18.3 6 17.3 6H12v12h5.3c1 0 1.7-.5 1.7-1.5V7.5Z" fill="#c97b5a"/>
  <path d="M12 6v12" stroke="#f5f3ee" stroke-width="1.2"/>
</svg>`;

// Version "maskable": fondo a sangre completa + libro reducido dentro de la
// zona segura (~80% central) para que el recorte circular de Android no se
// coma las esquinas del icono.
const ICONO_MASKABLE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" fill="#f5f3ee"/>
  <g transform="translate(12 12) scale(0.72) translate(-12 -12)">
    <path d="M5 7.5C5 6.5 5.7 6 6.7 6H12v12H6.7C5.7 18 5 17.5 5 16.5V7.5Z" fill="#5b8a72"/>
    <path d="M19 7.5C19 6.5 18.3 6 17.3 6H12v12h5.3c1 0 1.7-.5 1.7-1.5V7.5Z" fill="#c97b5a"/>
    <path d="M12 6v12" stroke="#f5f3ee" stroke-width="1.2"/>
  </g>
</svg>`;

mkdirSync(publicDir, { recursive: true });

async function generar(svg, nombre, tamano) {
  const salida = path.join(publicDir, nombre);
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(tamano, tamano)
    .png()
    .toFile(salida);
  console.log("generado:", nombre, `${tamano}x${tamano}`);
}

await generar(ICONO_BASE, "icon-192.png", 192);
await generar(ICONO_BASE, "icon-512.png", 512);
await generar(ICONO_BASE, "apple-touch-icon.png", 180);
await generar(ICONO_MASKABLE, "icon-maskable-512.png", 512);

console.log("listo.");
