import type { LatLng } from "./types";

/** Centro de referencia por defecto: Obelisco, Buenos Aires. */
export const DEFAULT_CENTER: LatLng = { lat: -34.6037, lng: -58.3816 };

/** Zona que muestra el mapa cuando el conductor todavía no buscó nada. */
export const DEFAULT_MAP_ZONE = "CABA";

/** Distancia en km entre dos puntos (fórmula de Haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "≈ 450 m" o "≈ 2,3 km". */
export function formatDistance(km: number): string {
  if (km < 1) return `≈ ${Math.max(100, Math.round((km * 1000) / 50) * 50)} m`;
  return `≈ ${km.toLocaleString("es-AR", { maximumFractionDigits: 1 })} km`;
}

/** Centro geométrico simple de varios puntos (o `null` si no hay puntos). */
export function centroid(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/** Hash FNV-1a de 32 bits: estable entre builds y navegadores. */
function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Punto público aproximado: desplaza la ubicación exacta entre `minM` y `maxM`
 * metros en una dirección que depende solo de `seed` (el id del espacio), así
 * el punto es siempre el mismo y no se puede promediar para encontrar el real.
 *
 * En producción esto se calcula en el servidor y la coordenada exacta nunca se
 * envía al navegador antes de que la reserva esté confirmada y pagada.
 */
export function approximatePoint(seed: string, exact: LatLng, minM = 100, maxM = 200): LatLng {
  const h = hash32(seed);
  const angle = ((h & 0xffff) / 0x10000) * 2 * Math.PI;
  const meters = minM + ((h >>> 16) / 0x10000) * (maxM - minM);
  const dLat = (meters * Math.cos(angle)) / 111_320;
  const dLng = (meters * Math.sin(angle)) / (111_320 * Math.cos((exact.lat * Math.PI) / 180));
  return { lat: exact.lat + dLat, lng: exact.lng + dLng };
}
