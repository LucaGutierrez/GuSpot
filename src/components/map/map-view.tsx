"use client";

// PROVISORIO: lo reemplaza el agente de mapa con la implementación MapLibre.
// Respeta el contrato de ./types.ts para que las pantallas compilen mientras tanto.

import type { MapViewProps } from "./types";

export function MapView({ markers, selectedId, onSelect, className = "" }: MapViewProps) {
  return (
    <div className={`grid place-items-center bg-ink-100 text-sm text-ink-500 ${className}`}>
      <div className="flex flex-wrap gap-2 p-4">
        {markers.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-label={m.ariaLabel}
            onClick={() => onSelect(m.id)}
            className={`rounded-full px-2 py-1 ${m.id === selectedId ? "bg-brand-600 text-white" : "bg-white"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
