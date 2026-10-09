import type { SearchParams } from "@/lib/search";
import { searchQuery, toRange } from "@/lib/search";
import type { LocalDateTime } from "@/lib/types";
import { addDays } from "@/lib/datetime";

/** Período elegido por el conductor, en el mismo formato que la URL de la búsqueda ("/"). */
export type RangeValue = Pick<SearchParams, "fecha" | "desde" | "fechaHasta" | "hasta">;

export const DEFAULT_FROM = "10:00";
export const DEFAULT_TO = "14:00";

export function defaultRange(today: string): RangeValue {
  return { fecha: today, desde: DEFAULT_FROM, fechaHasta: today, hasta: DEFAULT_TO };
}

type Readable = { get(name: string): string | null };

/** Lee el período desde la query; los campos ausentes quedan vacíos. */
export function readRange(params: Readable): Partial<RangeValue> {
  const out: Partial<RangeValue> = {};
  for (const key of ["fecha", "desde", "fechaHasta", "hasta"] as const) {
    const v = params.get(key);
    if (v) out[key] = v;
  }
  return out;
}

/**
 * Día sugerido para la búsqueda por defecto: hoy si todavía no son las 9,
 * si no mañana (así el "10 a 14 h" por defecto nunca queda en el pasado).
 */
export function defaultDay(now: LocalDateTime | null): string {
  if (!now) return "";
  const date = now.slice(0, 10);
  return Number(now.slice(11, 13)) < 9 ? date : addDays(date, 1);
}

/** Completa el período con los valores por defecto (hoy, 10 a 14 h). */
export function withDefaults(partial: Partial<RangeValue>, today: string): RangeValue {
  const d = defaultRange(today);
  const fecha = partial.fecha || d.fecha;
  return {
    fecha,
    desde: partial.desde || d.desde,
    fechaHasta: partial.fechaHasta || fecha,
    hasta: partial.hasta || d.hasta,
  };
}

export function rangeToInterval(r: RangeValue): { start: LocalDateTime; end: LocalDateTime } | null {
  return toRange({ zona: "", ...r });
}

export function rangeQuery(r: Partial<SearchParams>): string {
  const qs = searchQuery(r);
  return qs ? `?${qs}` : "";
}
