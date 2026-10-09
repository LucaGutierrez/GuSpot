import type { LocalDateTime, Space } from "./types";
import { checkAvailability, type AvailabilityResult } from "./availability";
import { quote, type Quote } from "./pricing";
import { publishedSpaces } from "./demo-data";
import { combine, isValidLocal } from "./datetime";

/** Parámetros de búsqueda tal como viajan en la URL de la búsqueda (/). */
export interface SearchParams {
  /** Texto libre: ciudad o barrio ("Palermo", "Córdoba"…). */
  zona: string;
  fecha: string; // YYYY-MM-DD (entrada)
  desde: string; // HH:mm
  fechaHasta: string; // YYYY-MM-DD (salida)
  hasta: string; // HH:mm
}

export interface SearchResult {
  space: Space;
  availability: AvailabilityResult;
  quote: Quote;
}

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Formas habituales de nombrar la Ciudad de Buenos Aires. */
const ZONE_ALIASES: [RegExp, string][] = [
  [/\b(ciudad (autonoma )?de buenos aires|capital federal|buenos aires)\b/g, "caba"],
];

export function matchesZone(space: Space, zona: string): boolean {
  let q = normalize(zona);
  for (const [re, to] of ZONE_ALIASES) q = q.replace(re, to);
  if (!q) return true;
  const haystack = normalize(`${space.neighborhood} ${space.city}`);
  return q.split(/[\s,]+/).every((word) => haystack.includes(word));
}

export function toRange(p: SearchParams): { start: LocalDateTime; end: LocalDateTime } | null {
  const start = combine(p.fecha, p.desde);
  const end = combine(p.fechaHasta || p.fecha, p.hasta);
  return isValidLocal(start) && isValidLocal(end) ? { start, end } : null;
}

/** Busca en una lista de garages. Disponibles primero, luego por precio. */
export function searchSpaces(
  p: SearchParams,
  /** Lista donde buscar: por defecto los garages de ejemplo. Nunca mezclar reales y de ejemplo. */
  source: Space[] = publishedSpaces(),
): SearchResult[] {
  const range = toRange(p);
  return source
    .filter((s) => matchesZone(s, p.zona))
    .map((space) => ({
      space,
      availability: range
        ? checkAvailability(space, range.start, range.end)
        : ({ available: false, reason: "fuera_de_horario" } as const),
      quote: range
        ? quote(space, range.start, range.end)
        : ({ ok: false, reason: "Elegí fecha y horario." } as const),
    }))
    .sort((a, b) => {
      const av = Number(b.availability.available && b.quote.ok) - Number(a.availability.available && a.quote.ok);
      if (av !== 0) return av;
      const pa = a.quote.ok ? a.quote.total : a.space.hourlyPrice;
      const pb = b.quote.ok ? b.quote.total : b.space.hourlyPrice;
      return pa - pb;
    });
}

/** Construye la query string de la búsqueda (/) a partir de los parámetros. */
export function searchQuery(p: Partial<SearchParams>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) qs.set(k, v);
  return qs.toString();
}
