/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Empaquetado autónomo para Docker: genera .next/standalone con solo lo
  // necesario para correr (server.js + deps), imagen mucho más liviana.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
