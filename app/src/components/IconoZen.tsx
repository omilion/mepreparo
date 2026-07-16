"use client";

import { useEffect, useState } from "react";
import { ICONOS_VALIDOS, normalizarIcono } from "@/lib/tutor/iconos";

// Caché en memoria a nivel de módulo para evitar re-fetch del mismo icono en la sesión
const cacheIconos = new Map<string, string>();

interface IconoZenProps {
  nombre: string;
  size?: number;
  stroke?: number;
  className?: string;
}

export function IconoZen({
  nombre,
  size = 24,
  stroke = 1.5,
  className = "",
}: IconoZenProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  // Normalizar: minúsculas SIN tildes (los archivos y la whitelist son sin
  // tilde). Así "círculo" → "circulo" y "átomo" → "atomo" también matchean.
  const nombreLimpio = normalizarIcono(nombre);

  useEffect(() => {
    // Si no está en la lista de iconos válidos, caemos al fallback (retorna null)
    if (!ICONOS_VALIDOS.includes(nombreLimpio)) {
      setSvgContent(null);
      return;
    }

    if (cacheIconos.has(nombreLimpio)) {
      setSvgContent(cacheIconos.get(nombreLimpio) || null);
      return;
    }

    let activo = true;

    async function cargarIcono() {
      try {
        const res = await fetch(`/iconos/${nombreLimpio}.svg`);
        if (!res.ok) throw new Error("Icono no encontrado");
        const rawSvg = await res.text();
        
        if (activo) {
          cacheIconos.set(nombreLimpio, rawSvg);
          setSvgContent(rawSvg);
        }
      } catch (err) {
        console.warn(`Error cargando icono [${nombreLimpio}]:`, err);
        if (activo) setSvgContent(null);
      }
    }

    void cargarIcono();

    return () => {
      activo = false;
    };
  }, [nombreLimpio]);

  if (!svgContent) return null;

  // Ajustar dinámicamente width, height y stroke-width del SVG crudo
  const svgAjustado = svgContent
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`)
    .replace(/stroke-width="[^"]*"/, `stroke-width="${stroke}"`);

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svgAjustado }}
    />
  );
}
