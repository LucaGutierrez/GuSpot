"use client";

import { useSyncExternalStore } from "react";
import type { LocalDateTime } from "@/lib/types";

const nowFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Fecha y hora actual en Argentina como LocalDateTime ("YYYY-MM-DDTHH:mm"). */
export function nowInArgentina(now: Date = new Date()): LocalDateTime {
  const parts = Object.fromEntries(nowFmt.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const subscribe = () => () => {};
const serverSnapshot = () => null;

/**
 * Hora actual en Argentina, calculada solo en el navegador. Durante el build
 * estático (y la hidratación) devuelve `null`, así la fecha no queda congelada
 * en el HTML generado.
 */
export function useNow(): LocalDateTime | null {
  return useSyncExternalStore(subscribe, nowInArgentina, serverSnapshot);
}
