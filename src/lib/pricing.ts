import type { Centavos, LocalDateTime, Space } from "./types";
import { durationHours, toMs } from "./datetime";

export type Quote =
  | {
      ok: true;
      hours: number;
      days: number;
      remainingHours: number;
      total: Centavos;
    }
  | { ok: false; reason: string };

/**
 * Regla de precio propuesta (pendiente de confirmación):
 * - La duración se redondea hacia arriba a horas enteras.
 * - Debe cumplir el mínimo de horas del espacio.
 * - Cada bloque completo de 24 h se cobra a la tarifa diaria, si existe.
 * - Las horas restantes se cobran por hora, sin superar una tarifa diaria.
 */
export function quote(
  space: Pick<Space, "hourlyPrice" | "dailyPrice" | "minHours">,
  start: LocalDateTime,
  end: LocalDateTime,
): Quote {
  if (Number.isNaN(toMs(start)) || Number.isNaN(toMs(end))) {
    return { ok: false, reason: "Fecha u horario inválido." };
  }
  if (toMs(end) <= toMs(start)) {
    return { ok: false, reason: "La salida debe ser posterior a la entrada." };
  }
  const hours = durationHours(start, end);
  if (hours < space.minHours) {
    return {
      ok: false,
      reason: `Este espacio requiere un mínimo de ${space.minHours} h.`,
    };
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const daily = space.dailyPrice ?? space.hourlyPrice * 24;
  const remainder = remainingHours * space.hourlyPrice;
  const total =
    days * daily +
    (space.dailyPrice ? Math.min(remainder, space.dailyPrice) : remainder);
  return { ok: true, hours, days, remainingHours, total };
}
