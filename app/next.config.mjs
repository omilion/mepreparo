/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Empaquetado autónomo para Docker: genera .next/standalone con solo lo
  // necesario para correr (server.js + deps), imagen mucho más liviana.
  output: "standalone",
};

export default nextConfig;
