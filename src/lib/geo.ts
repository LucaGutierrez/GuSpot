import type { LatLng } from "./types";

/** Centro de referencia por defecto: Obelisco, Buenos Aires. */
export const DEFAULT_CENTER: LatLng = { lat: -34.6037, lng: -58.3816 };

/** Zona que muestra el mapa cuando el conductor todavía no buscó nada. */
export const DEFAULT_MAP_ZONE = "Buenos Aires";

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
