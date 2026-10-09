// Copia el worker de MapLibre a public/vendor para que el sitio estático lo
// sirva desde su propio dominio (el bundler no lo empaqueta por sí solo).
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public/vendor", { recursive: true });
copyFileSync(
  "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
  "public/vendor/maplibre-gl-worker.mjs",
);
