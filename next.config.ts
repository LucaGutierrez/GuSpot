import type { NextConfig } from "next";

// La demo se exporta como sitio estático (carpeta `out/`): no hay servidor,
// base de datos ni funciones. Así puede publicarse gratis en Vercel o en
// cualquier hosting de archivos estáticos. Cuando se agreguen cuentas,
// reservas reales o pagos, habrá que quitar `output: "export"`.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
