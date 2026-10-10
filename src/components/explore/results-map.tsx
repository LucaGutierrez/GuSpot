"use client";

import { useMemo, useState } from "react";
import { MapView } from "@/components/map/map-view";
import type { Area, SearchResult } from "@/lib/search";
import { SearchIcon } from "@/components/ui/icons";
import { SourceBadge } from "./space-source";
import { RecenterIcon } from "./icons";
import { toMarkers, zoneCenter } from "./map-data";

/**
 * Mapa de la columna derecha de la búsqueda ("/") en escritorio. Muestra como marcador
 * solo los resultados disponibles y con precio para el período.
 */
export function ResultsMap({
  results,
  selectedId,
  onSelect,
  fitKey,
  onUserMove,
  canSearchArea = false,
  onSearchArea,
}: {
  /** Resultados ya filtrados (los no disponibles se descartan acá). */
  results: SearchResult[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  fitKey: string;
  onUserMove?: (area: Area) => void;
  /** Muestra el botón "Buscar en esta zona" (la persona movió el mapa). */
  canSearchArea?: boolean;
  onSearchArea?: () => void;
}) {
  const [nonce, setNonce] = useState(0);
  const markers = useMemo(() => toMarkers(results), [results]);
  const fallbackCenter = useMemo(() => zoneCenter(results), [results]);
  const n = markers.length;

  return (
    <div className="relative h-full w-full bg-ink-100">
      <MapView
        className="absolute inset-0 h-full w-full"
        markers={markers}
        selectedId={selectedId}
        onSelect={onSelect}
        fitKey={`${fitKey}|${nonce}`}
        fallbackCenter={fallbackCenter}
        userLocation={null}
        padding={{ top: 64, right: 32, bottom: 32, left: 32 }}
        onUserMove={onUserMove}
      />
      {canSearchArea && (
        <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center">
          <button
            type="button"
            onClick={onSearchArea}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-ink-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <SearchIcon width={16} height={16} /> Buscar en esta zona
          </button>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge />
          <span className="pointer-events-auto rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-ink-900 shadow-sm ring-1 ring-ink-200">
            {n} {n === 1 ? "garage disponible" : "garages disponibles"} en el mapa
          </span>
        </div>
        <button
          type="button"
          onClick={() => setNonce((x) => x + 1)}
          aria-label="Volver a centrar el mapa"
          title="Volver a centrar"
          className="pointer-events-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-ink-700 shadow-md ring-1 ring-ink-200 hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <RecenterIcon />
        </button>
      </div>
    </div>
  );
}
