import type { Interval, LocalDateTime, Space } from "./types";
import { HOUR_MS, fromMs, overlaps, toMs } from "./datetime";

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** ¿El minuto `minute` del día `weekday` cae dentro de alguna franja? */
function inRules(space: Pick<Space, "availability">, weekday: number, minute: number) {
  return space.availability.some(
    (r) =>
      r.days.includes(weekday) &&
      minute >= minutesOf(r.from) &&
      minute < minutesOf(r.to),
  );
}

export type AvailabilityResult =
  | { available: true }
  | { available: false; reason: "fuera_de_horario" | "ocupado" };

/**
 * Verifica que todo el intervalo esté dentro del horario semanal del espacio
 * y que no se superponga con intervalos ocupados. Se revisa cada hora (y el
 * último minuto) del intervalo; alcanza porque las franjas usan horas enteras
 * o medias horas y las reservas se cobran por hora.
 */
export function checkAvailability(
  space: Pick<Space, "availability" | "busy">,
  start: LocalDateTime,
  end: LocalDateTime,
): AvailabilityResult {
  const s = toMs(start);
  const e = toMs(end);
  const checkpoints: number[] = [];
  for (let t = s; t < e; t += HOUR_MS / 2) checkpoints.push(t);
  checkpoints.push(e - 60 * 1000);

  for (const t of checkpoints) {
    const d = new Date(t);
    const minute = d.getUTCHours() * 60 + d.getUTCMinutes();
    if (!inRules(space, d.getUTCDay(), minute)) {
      return { available: false, reason: "fuera_de_horario" };
    }
  }
  const wanted: Interval = { start: fromMs(s), end: fromMs(e) };
  if (space.busy.some((b) => overlaps(wanted, b))) {
    return { available: false, reason: "ocupado" };
  }
  return { available: true };
}

const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Resumen legible del horario, p. ej. "Lun a Vie, 07:00–21:00". */
export function describeAvailability(space: Pick<Space, "availability">): string[] {
  return space.availability.map((r) => {
    const days = [...r.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const consecutive = days.every(
      (d, i) => i === 0 || (d - days[i - 1] + 7) % 7 === 1,
    );
    const label =
      days.length === 7
        ? "Todos los días"
        : consecutive && days.length > 2
          ? `${DAY_SHORT[days[0]]} a ${DAY_SHORT[days[days.length - 1]]}`
          : days.map((d) => DAY_SHORT[d]).join(", ");
    const hours =
      r.from === "00:00" && r.to === "24:00" ? "24 h" : `${r.from}–${r.to}`;
    return `${label}, ${hours}`;
  });
}
