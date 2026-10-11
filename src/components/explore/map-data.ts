import type { MapMarker } from "@/components/map/types";
import type { SearchResult } from "@/lib/search";
import type { LatLng } from "@/lib/types";
import { DEFAULT_CENTER, centroid } from "@/lib/geo";
import { formatARS } from "@/lib/format";
import { isBookable, liveOf } from "@/components/driver/filters";

/** Resultados que se pueden solicitar en el período (los únicos que van al mapa). */
export function bookableResults(results: SearchResult[]): SearchResult[] {
  return results.filter(isBookable);
}

/** Marcadores del mapa: solo disponibles con precio; el label es el total del período. */
export function toMarkers(results: SearchResult[]): MapMarker[] {
  return results.flatMap((r) => {
    // Garages comerciales: siempre en el mapa, con nombre, precio por hora y disponibilidad.
    const live = liveOf(r);
    if (live) {
      const price = `${formatARS(r.space.hourlyPrice)}/h`;
      return [
        {
          id: r.space.id,
          position: r.space.coords,
          label: `${r.space.title} · ${price}`,
          ariaLabel: `${r.space.title}, ${r.space.neighborhood}. ${price}. ${live.label}.`,
          variant: "garage" as const,
          tone: live.tone,
        },
      ];
    }
    if (!isBookable(r) || !r.quote.ok) return [];
    const price = formatARS(r.quote.total);
    return [
      {
        id: r.space.id,
        position: r.space.coords,
        label: price,
        ariaLabel: `${r.space.title}, ${r.space.neighborhood}. ${price} en total por ${r.quote.hours} h. Disponible.`,
      },
    ];
  });
}

/** Centro a usar sin marcadores: el de los espacios de la zona o el de referencia. */
export function zoneCenter(results: SearchResult[]): LatLng {
  return centroid(results.map((r) => r.space.coords)) ?? DEFAULT_CENTER;
}
