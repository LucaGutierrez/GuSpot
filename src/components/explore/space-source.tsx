"use client";

// Qué garages muestra la búsqueda. Con Supabase configurado: SOLO los reales
// publicados (para todos los usuarios). En modo demo (sin Supabase): solo los
// de ejemplo. Nunca se mezclan.

import { useEffect, useState } from "react";
import type { Space } from "@/lib/types";
import { publishedSpaces } from "@/lib/demo-data";
import { listPublishedGarages } from "@/lib/data/garages";
import { isBackendConfigured } from "@/lib/supabase/config";
import { DemoBadge } from "@/components/ui/badge";

export type SpaceMode = "ejemplo" | "reales";

export const SPACE_MODE: SpaceMode = isBackendConfigured ? "reales" : "ejemplo";

type RealLoad = { state: "loading" } | { state: "error" } | { state: "ready"; spaces: Space[] };

/** Garages a buscar según el modo. `spaces` es null mientras cargan los reales. */
export function useSearchSource(): { mode: SpaceMode; spaces: Space[] | null; failed: boolean } {
  const mode = SPACE_MODE;
  const [real, setReal] = useState<RealLoad>({ state: "loading" });

  useEffect(() => {
    if (mode !== "reales") return;
    let cancelled = false;
    listPublishedGarages()
      .then((spaces) => !cancelled && setReal({ state: "ready", spaces }))
      .catch(() => !cancelled && setReal({ state: "error" }));
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (mode === "ejemplo") return { mode, spaces: publishedSpaces(), failed: false };
  if (real.state === "ready") return { mode, spaces: real.spaces, failed: false };
  return { mode, spaces: real.state === "error" ? [] : null, failed: real.state === "error" };
}

/** Enlace al detalle según el origen del garage. `query` empieza con "?" o es "". */
export function spaceHref(space: Space, query: string): string {
  if (space.source === "real") {
    return `/espacio/?id=${encodeURIComponent(space.id)}${query ? `&${query.slice(1)}` : ""}`;
  }
  return `/espacios/${space.id}/${query}`;
}

/** En modo demo, la etiqueta "Datos de demostración"; con garages reales, nada. */
export function SourceBadge() {
  if (SPACE_MODE === "reales") return null;
  return (
    <span className="pointer-events-auto rounded-full bg-white shadow-sm">
      <DemoBadge label="Datos de demostración" />
    </span>
  );
}
