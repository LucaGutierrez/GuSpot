// Estilo GuSpot sobre el mapa base (pedido del usuario 2026-10-14: "que tenga
// nuestra huella"). Recolorea las capas del estilo "liberty" de OpenFreeMap con
// la paleta de la marca y saca los íconos de comercios para que los garajes sean
// lo que más se ve. Se aplica al cargar el estilo (antes del primer dibujo).
// Si se usa otro proveedor (NEXT_PUBLIC_MAP_STYLE_URL), las capas que no
// existen se ignoran y el mapa queda con sus colores originales.

import type { Map as MapLibreMap } from "maplibre-gl";

// Paleta (globals.css): brand-*, accent-*, ink-*.
const C = {
  land: "#f3f5fa",
  residential: "#eceff5",
  green: "#d5ebdb",
  greenDark: "#c6e2cd",
  water: "#c3d5fb",
  waterLine: "#a9c1f7",
  waterText: "#1c41bd", // brand-700
  building: "#e2e6ee",
  buildingLine: "#d2d8e4",
  road: "#ffffff",
  casingMinor: "#dde1e8", // ink-200
  casingSecondary: "#c9d2e6",
  casingMajor: "#93b4fd", // brand-300
  motorway: "#fff4cc", // accent-100
  casingMotorway: "#f5b301", // accent-500
  rail: "#c3c9d4", // ink-300
  boundary: "#8d95a5", // ink-400
  text: "#121722", // ink-900
  textSoft: "#5f6879", // ink-500
  transit: "#1c41bd", // brand-700
  halo: "#ffffff",
} as const;

type Paint = Record<string, string | number>;

/** Pintura por capa (ids del estilo liberty / OpenMapTiles). */
const PAINT: Record<string, Paint> = {
  background: { "background-color": C.land },
  natural_earth: { "raster-saturation": -0.7, "raster-opacity": 0.6 },
  park: { "fill-color": C.green, "fill-outline-color": C.green },
  park_outline: { "line-color": C.greenDark },
  landuse_residential: { "fill-color": C.residential },
  landcover_wood: { "fill-color": C.greenDark, "fill-opacity": 0.7 },
  landcover_grass: { "fill-color": C.green },
  landcover_sand: { "fill-color": "#f4efdc" },
  landuse_pitch: { "fill-color": C.green },
  landuse_track: { "fill-color": C.green },
  landuse_cemetery: { "fill-color": C.green },
  landuse_hospital: { "fill-color": "#f7e8ee" },
  landuse_school: { "fill-color": "#eceef6" },
  water: { "fill-color": C.water },
  waterway_tunnel: { "line-color": C.waterLine },
  waterway_river: { "line-color": C.waterLine },
  waterway_other: { "line-color": C.waterLine },
  aeroway_fill: { "fill-color": "#e6e9f0" },
  aeroway_runway: { "line-color": "#ffffff" },
  aeroway_taxiway: { "line-color": "#ffffff" },
  building: { "fill-color": C.building, "fill-outline-color": C.buildingLine },
  "building-3d": { "fill-extrusion-color": C.building },
  boundary_3: { "line-color": C.boundary },
  boundary_2: { "line-color": C.boundary },
  boundary_disputed: { "line-color": C.boundary },
  waterway_line_label: { "text-color": C.waterText, "text-halo-color": C.halo },
  water_name_point_label: { "text-color": C.waterText, "text-halo-color": C.halo },
  water_name_line_label: { "text-color": C.waterText, "text-halo-color": C.halo },
  poi_transit: { "text-color": C.transit, "text-halo-color": C.halo },
  "highway-name-path": { "text-color": C.textSoft, "text-halo-color": C.halo },
  "highway-name-minor": { "text-color": C.textSoft, "text-halo-color": C.halo },
  "highway-name-major": { "text-color": C.text, "text-halo-color": C.halo },
  airport: { "text-color": C.textSoft, "text-halo-color": C.halo },
};

/** Comercios y lugares de interés: se ocultan (quedan los garajes y el transporte). */
const HIDDEN = new Set(["poi_r1", "poi_r7", "poi_r20"]);

/** Calles: color de relleno y de borde según la jerarquía (vale para túnel, calle y puente). */
function roadPaint(id: string): Paint | null {
  const m = /^(tunnel|road|bridge)_(.+?)(_casing)?$/.exec(id);
  if (!m) return null;
  const [, , kind, casing] = m;
  if (/rail/.test(kind)) return { "line-color": C.rail };
  if (/path_pedestrian/.test(kind)) return casing ? { "line-color": C.casingMinor } : { "line-color": C.road };
  const motorway = /motorway/.test(kind);
  const major = /trunk_primary/.test(kind);
  const secondary = /secondary_tertiary|^link$/.test(kind);
  if (casing) {
    const color = motorway ? C.casingMotorway : major ? C.casingMajor : secondary ? C.casingSecondary : C.casingMinor;
    return { "line-color": color };
  }
  return { "line-color": motorway ? C.motorway : C.road };
}

export function applyGuSpotStyle(map: MapLibreMap): void {
  const layers = map.getStyle()?.layers ?? [];
  for (const layer of layers) {
    const id = layer.id;
    try {
      if (HIDDEN.has(id)) {
        map.setLayoutProperty(id, "visibility", "none");
        continue;
      }
      let paint = PAINT[id] ?? (layer.type === "line" ? roadPaint(id) : null);
      if (!paint && layer.type === "symbol" && id.startsWith("label_")) {
        paint = {
          "text-color": /city|town|village|country/.test(id) ? C.text : C.textSoft,
          "text-halo-color": C.halo,
        };
      }
      if (!paint) continue;
      for (const [prop, value] of Object.entries(paint)) {
        map.setPaintProperty(id, prop as Parameters<MapLibreMap["setPaintProperty"]>[1], value);
      }
    } catch {
      // Propiedad que no aplica a esta capa (otro proveedor): se deja como está.
    }
  }
}
