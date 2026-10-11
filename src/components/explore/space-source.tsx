"use client";

// Garages que muestra la búsqueda: los publicados en GuSpot (para todos los usuarios).

import { useEffect, useState } from "react";
import type { Space } from "@/lib/types";
import { listPublishedGarages } from "@/lib/data/garages";

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; spaces: Space[] };

/** Garages publicados. `spaces` es null mientras cargan. */
export function useSearchSource(): { spaces: Space[] | null; failed: boolean } {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    listPublishedGarages()
      .then((spaces) => !cancelled && setLoad({ state: "ready", spaces }))
      .catch(() => !cancelled && setLoad({ state: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (load.state === "ready") return { spaces: load.spaces, failed: false };
  return { spaces: load.state === "error" ? [] : null, failed: load.state === "error" };
}

/** Enlace a la ficha del garage. `query` empieza con "?" o es "". */
export function spaceHref(space: Space, query: string): string {
  return `/espacio/?id=${encodeURIComponent(space.id)}${query ? `&${query.slice(1)}` : ""}`;
}
