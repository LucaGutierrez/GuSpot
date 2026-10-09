import type { Interval, LocalDateTime } from "./types";

// Las fechas se manejan como hora "de pared" argentina ("YYYY-MM-DDTHH:mm").
// Internamente se convierten a milisegundos tratándolas como UTC, lo que evita
// que la zona horaria del navegador o del servidor de build altere los cálculos.
// Argentina no aplica horario de verano, así que 1 hora = 3.600.000 ms siempre.

export const HOUR_MS = 60 * 60 * 1000;

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function toMs(value: LocalDateTime): number {
  const m = LOCAL_RE.exec(value);
  if (!m) return NaN;
  const [, y, mo, d, h, mi] = m.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi);
}

export function fromMs(ms: number): LocalDateTime {
  return new Date(ms).toISOString().slice(0, 16);
}

export function isValidLocal(value: string | null | undefined): value is LocalDateTime {
  return !!value && !Number.isNaN(toMs(value));
}

export function combine(date: string, time: string): LocalDateTime {
  return `${date}T${time}`;
}

/** Fecha de hoy en Argentina, "YYYY-MM-DD". */
export function todayInArgentina(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  return fromMs(toMs(`${date}T00:00`) + days * 24 * HOUR_MS).slice(0, 10);
}

/** Duración en horas, redondeada hacia arriba a horas enteras. */
export function durationHours(start: LocalDateTime, end: LocalDateTime): number {
  return Math.ceil((toMs(end) - toMs(start)) / HOUR_MS);
}

export function overlaps(a: Interval, b: Interval): boolean {
  return toMs(a.start) < toMs(b.end) && toMs(b.start) < toMs(a.end);
}
