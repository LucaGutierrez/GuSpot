"use client";

// Garajes que muestra la búsqueda: los publicados en GuSpot (para todos los usuarios).

import { useEffect, useState } from "react";
import type { Space } from "@/lib/types";
import { listPublishedGarages } from "@/lib/data/garages";

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; spaces: Space[] };

/**
 * Cada cuánto se vuelven a leer los garajes con la pantalla a la vista, para
 * que los lugares libres que cambia el operador lleguen al mapa sin recargar.
 * Se lee la lista pública (sin Realtime sobre `garages`, que tiene columnas
 * privadas). Con la pestaña oculta no se consulta; al volver, se actualiza.
 */
const REFRESH_MS = 30_000;

/** Garajes publicados. `spaces` es null mientras cargan. */
export function useSearchSource(): { spaces: Space[] | null; failed: boolean } {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    const fetchAll = (first: boolean) =>
      listPublishedGarages()
        .then((spaces) => !cancelled && setLoad({ state: "ready", spaces }))
        // Si falla una actualización, se mantiene lo último que se vio.
        .catch(() => !cancelled && first && setLoad({ state: "error" }));

    fetchAll(true);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") fetchAll(false);
    }, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && fetchAll(false);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (load.state === "ready") return { spaces: load.spaces, failed: false };
  return { spaces: load.state === "error" ? [] : null, failed: load.state === "error" };
}

/** Enlace a la ficha del garaje. `query` empieza con "?" o es "". */
export function spaceHref(space: Space, query: string): string {
  return `/espacio/?id=${encodeURIComponent(space.id)}${query ? `&${query.slice(1)}` : ""}`;
}
