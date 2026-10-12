"use client";

import { useEffect, useState } from "react";
import { findPlace, type Place } from "@/lib/geocoding";

/**
 * Ubicación de la zona escrita, solo si hace falta (`enabled`): cuando ningún
 * garaje la nombra, se busca dentro de la ciudad o barrio en el mapa.
 */
export function usePlace(zona: string, enabled: boolean): Place | null {
  const [found, setFound] = useState<{ zona: string; place: Place | null } | null>(null);

  useEffect(() => {
    if (!enabled || !zona.trim()) return;
    const ctrl = new AbortController();
    findPlace(zona, ctrl.signal)
      .then((place) => setFound({ zona, place }))
      .catch(() => {});
    return () => ctrl.abort();
  }, [zona, enabled]);

  return enabled && found?.zona === zona ? found.place : null;
}
