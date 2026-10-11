import type { SearchParams } from "@/lib/search";
import { searchQuery, toRange } from "@/lib/search";
import type { LocalDateTime } from "@/lib/types";
import { fromMs, toMs } from "@/lib/datetime";

/** Período elegido por el conductor, en el mismo formato que la URL de la búsqueda ("/"). */
export type RangeValue = Pick<SearchParams, "fecha" | "desde" | "fechaHasta" | "hasta">;

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

/** El período tal como vino en la URL, sin completar (vacío = "cualquier horario"). */
export function rangeOrEmpty(partial: Partial<RangeValue>): RangeValue {
  return {
    fecha: partial.fecha ?? "",
    desde: partial.desde ?? "",
    fechaHasta: partial.fechaHasta ?? partial.fecha ?? "",
    hasta: partial.hasta ?? "",
  };
}

/** Desde ahora (redondeado a los próximos 15 min) por `hours` horas. */
export function rangeFromNow(now: LocalDateTime, hours: number): RangeValue {
  const step = 15 * 60_000;
  const start = Math.ceil(toMs(now) / step) * step;
  const s = fromMs(start);
  const e = fromMs(start + hours * 3_600_000);
  return { fecha: s.slice(0, 10), desde: s.slice(11, 16), fechaHasta: e.slice(0, 10), hasta: e.slice(11, 16) };
}

export function rangeToInterval(r: RangeValue): { start: LocalDateTime; end: LocalDateTime } | null {
  return toRange({ zona: "", ...r });
}

export function rangeQuery(r: Partial<SearchParams>): string {
  const qs = searchQuery(r);
  return qs ? `?${qs}` : "";
}
