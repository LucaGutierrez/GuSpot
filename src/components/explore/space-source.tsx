"use client";

// Qué garages muestra la búsqueda: los de ejemplo o los reales publicados.
// NUNCA se mezclan. La elección se recuerda en este navegador. Sin Supabase
// configurado (modo demo) solo existen los de ejemplo.

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Space } from "@/lib/types";
import { publishedSpaces } from "@/lib/demo-data";
import { listPublishedGarages } from "@/lib/data/garages";
import { isBackendConfigured } from "@/lib/supabase/config";
import { DemoBadge } from "@/components/ui/badge";

export type SpaceMode = "ejemplo" | "reales";

const KEY = "guspot:datos";
const listeners = new Set<() => void>();

function read(): SpaceMode {
  if (!isBackendConfigured) return "ejemplo";
  try {
    return window.localStorage.getItem(KEY) === "reales" ? "reales" : "ejemplo";
  } catch {
    return "ejemplo";
  }
}

export function setSpaceMode(mode: SpaceMode) {
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    // Sin almacenamiento: no se recuerda, pero tampoco cambia; avisamos igual.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSpaceMode(): SpaceMode {
  return useSyncExternalStore(subscribe, read, () => "ejemplo");
}

type RealLoad = { state: "loading" } | { state: "error" } | { state: "ready"; spaces: Space[] };

/** Garages a buscar según el modo. `spaces` es null mientras cargan los reales. */
export function useSearchSource(): { mode: SpaceMode; spaces: Space[] | null; failed: boolean } {
  const mode = useSpaceMode();
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

/**
 * Etiqueta del origen de los datos. Con cuentas habilitadas es un selector
 * Reales / Ejemplos; en modo demo, la etiqueta "Datos de demostración".
 */
export function SpaceModeSwitch() {
  const mode = useSpaceMode();
  if (!isBackendConfigured) {
    return (
      <span className="pointer-events-auto rounded-full bg-white shadow-sm">
        <DemoBadge label="Datos de demostración" />
      </span>
    );
  }
  const option = (value: SpaceMode, label: string) => (
    <button
      type="button"
      onClick={() => setSpaceMode(value)}
      aria-pressed={mode === value}
      className={`rounded-full px-3 py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand-500 ${
        mode === value
          ? value === "ejemplo"
            ? "bg-fuchsia-600 text-white"
            : "bg-brand-600 text-white"
          : "text-ink-700 hover:bg-ink-100"
      }`}
    >
      {label}
    </button>
  );
  return (
    <span
      role="group"
      aria-label="Qué garages mostrar"
      className="pointer-events-auto inline-flex rounded-full bg-white p-0.5 shadow-sm ring-1 ring-ink-200"
    >
      {option("reales", "Garages reales")}
      {option("ejemplo", "Ejemplos")}
    </span>
  );
}
