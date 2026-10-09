import type { LocalDateTime, Space } from "@/lib/types";
import { checkAvailability } from "@/lib/availability";
import { quote, type Quote } from "@/lib/pricing";
import { toMs } from "@/lib/datetime";
import { bookability, type Bookability } from "./availability-status";
import { rangeToInterval, type RangeValue } from "./range";

export interface BookingCheck {
  interval: { start: LocalDateTime; end: LocalDateTime } | null;
  quote: Quote;
  status: Bookability;
}

/**
 * Valida un período para un espacio con `quote` + `checkAvailability`.
 * Si se conoce la hora actual, rechaza entradas en el pasado.
 */
export function checkBooking(space: Space, range: RangeValue, now: LocalDateTime | null): BookingCheck {
  const interval = rangeToInterval(range);
  if (!interval) {
    const q: Quote = { ok: false, reason: "Elegí fecha y horario de entrada y salida." };
    return { interval: null, quote: q, status: { ok: false, label: q.reason } };
  }
  const q = quote(space, interval.start, interval.end);
  if (now && toMs(interval.start) < toMs(now)) {
    return {
      interval,
      quote: q,
      status: { ok: false, label: "El horario de entrada ya pasó. Elegí uno futuro." },
    };
  }
  const availability = checkAvailability(space, interval.start, interval.end);
  return { interval, quote: q, status: bookability(availability, q) };
}
