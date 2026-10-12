// Disponibilidad en vivo de un garaje comercial, lista para mostrar.
// Siempre se muestra texto + color (nunca solo color).

import type { LocalDateTime, Space } from "./types";
import { isOpenAt } from "./availability";

/** Después de este tiempo sin actualizar, se avisa al conductor. Decisión del usuario (2026-10-11). */
const STALE_MINUTES = 30;
/** Hasta cuántos lugares se considera "quedan pocos". */
const FEW_SPOTS = 3;

export type LiveTone = "ok" | "few" | "none" | "closed";

export interface LiveStatus {
  tone: LiveTone;
  /** "8 lugares", "Quedan 2", "Sin lugar", "Cerrado"… */
  label: string;
  /** Atiende ahora (horario + estado del operador). */
  open: boolean;
  /** Recibe conductores ("Voy a este"). */
  accepting: boolean;
  /** Minutos desde la última actualización (null si nunca informó). */
  minutesAgo: number | null;
  stale: boolean;
}

export function liveStatus(space: Space, now: LocalDateTime | null, nowMs: number = Date.now()): LiveStatus | null {
  const c = space.commercial;
  if (!c) return null;
  const minutesAgo = c.updatedAt ? Math.max(0, Math.round((nowMs - Date.parse(c.updatedAt)) / 60000)) : null;
  const stale = minutesAgo === null || minutesAgo > STALE_MINUTES;
  const scheduleOpen = now ? isOpenAt(space, now) : true;
  const open = scheduleOpen && c.state !== "cerrado";

  const base = { minutesAgo, stale, open };
  if (!open) return { ...base, tone: "closed", label: "Cerrado", accepting: false };
  if (!c.acceptingDrivers) return { ...base, tone: "closed", label: "No recibe conductores ahora", accepting: false };

  // Los lugares guardados por reservas no están libres para quien llega.
  const n = c.availableSpots === null ? null : Math.max(0, c.availableSpots - c.reservedNow);
  if (c.state === "sin_lugar" || n === 0) return { ...base, tone: "none", label: "Sin lugar", accepting: false };
  if (n !== null) {
    if (n <= FEW_SPOTS) return { ...base, tone: "few", label: n === 1 ? "Queda 1" : `Quedan ${n}`, accepting: true };
    if (c.state === "pocos") return { ...base, tone: "few", label: `Quedan pocos (${n})`, accepting: true };
    return { ...base, tone: "ok", label: `${n} lugares`, accepting: true };
  }
  if (c.state === "pocos") return { ...base, tone: "few", label: "Quedan pocos lugares", accepting: true };
  return { ...base, tone: "ok", label: "Hay lugar", accepting: true };
}

/** "hace 5 min", "hace 2 h", "hace 3 días". */
export function agoText(minutes: number): string {
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const h = Math.round(minutes / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

/** Clases de color por estado (siempre acompañadas de texto). */
export const LIVE_TONE_CLASS: Record<LiveTone, string> = {
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  few: "bg-amber-50 text-amber-900 ring-amber-200",
  none: "bg-red-50 text-red-800 ring-red-200",
  closed: "bg-ink-100 text-ink-700 ring-ink-200",
};

export const LIVE_DOT_CLASS: Record<LiveTone, string> = {
  ok: "bg-emerald-500",
  few: "bg-amber-400",
  none: "bg-red-500",
  closed: "bg-ink-400",
};
