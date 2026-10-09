"use client";

import { useState } from "react";
import { defaultDay, withDefaults, type RangeValue } from "./range";
import { useNow } from "./use-now";

/**
 * Estado del período elegido. Arranca con lo que vino en la URL y completa lo
 * que falte con "hoy, 10 a 14 h" calculado en el navegador.
 */
export function useRange(initial: Partial<RangeValue>) {
  const now = useNow();
  const today = now ? now.slice(0, 10) : "";
  const [edited, setEdited] = useState<RangeValue | null>(null);
  const value = edited ?? withDefaults(initial, defaultDay(now));
  return { value, setValue: setEdited, now, today };
}
