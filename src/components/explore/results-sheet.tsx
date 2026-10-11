"use client";

import Link from "next/link";
import { useId } from "react";
import type { SearchResult } from "@/lib/search";
import { SPACE_TYPE_LABEL, formatARS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { SpacePhoto } from "@/components/ui/space-photo";
import { CommercialCard } from "@/components/garage/garage-summary";
import { AvailabilityBadge, bookability } from "@/components/driver/availability-status";
import { ListIcon, MapIcon } from "./icons";

/**
 * Hoja inferior de la exploración en celular. Plegada muestra el resumen
 * ("N disponibles · Ver lista"); desplegada es la lista completa, alternativa
 * accesible al mapa.
 */
export function ResultsSheet({
  available,
  unavailable,
  zona,
  loading = false,
  failed = false,
  noZoneMatch,
  filtersActive,
  expanded,
  onExpandedChange,
  onShowOnMap,
  hrefFor,
  distanceFor,
  onChangeSearch,
  onClearFilters,
}: {
  available: SearchResult[];
  unavailable: SearchResult[];
  zona: string;
  loading?: boolean;
  failed?: boolean;
  noZoneMatch: boolean;
  filtersActive: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onShowOnMap: (id: string) => void;
  hrefFor: (id: string) => string;
  distanceFor: (r: SearchResult) => string | null;
  onChangeSearch: () => void;
  onClearFilters: () => void;
}) {
  const id = useId();
  const n = available.length;
  const listId = `${id}-lista`;

  if (loading || failed) {
    return (
      <div className="rounded-t-2xl border-t border-ink-200 bg-white p-4 text-sm shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        {loading ? (
          <p className="text-ink-500">Cargando garages…</p>
        ) : (
          <p className="text-red-800">No pudimos cargar los garages. Revisá tu conexión y probá de nuevo.</p>
        )}
      </div>
    );
  }

  if (n === 0 && unavailable.length === 0) {
    return (
      <div className="rounded-t-2xl border-t border-ink-200 bg-white p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <p className="font-semibold text-ink-900">
          {noZoneMatch
            ? `Todavía no hay garages publicados en «${zona}».`
            : "Ningún garage coincide con los filtros elegidos."}
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {noZoneMatch ? "Probá con otra zona o buscá cerca tuyo." : "Probá ampliar los filtros o cambiar la zona."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {filtersActive && (
            <Button variant="secondary" onClick={onClearFilters}>
              Limpiar filtros
            </Button>
          )}
          <Button onClick={onChangeSearch}>Cambiar zona</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col rounded-t-2xl border-t border-ink-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] ${
        expanded ? "max-h-[min(70dvh,calc(100dvh_-_var(--mobile-nav-height)_-_6rem))]" : ""
      }`}
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink-200" aria-hidden="true" />
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => onExpandedChange(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500"
      >
        <span>
          <span className="block font-semibold text-ink-900">
            {n === 0
              ? "No hay garages con lugar ahora"
              : `${n} ${n === 1 ? "disponible" : "disponibles"}`}
          </span>
          {!expanded && unavailable.length > 0 && (
            <span className="block text-xs text-ink-500">
              {unavailable.length} {unavailable.length === 1 ? "garage sin lugar o cerrado" : "garages sin lugar o cerrados"}
            </span>
          )}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700">
          {expanded ? (
            <>
              <MapIcon width={18} height={18} /> Ver mapa
            </>
          ) : (
            <>
              <ListIcon width={18} height={18} /> Ver lista
            </>
          )}
        </span>
      </button>

      {!expanded && n === 0 && (
        <div className="px-4 pb-4">
          <Button onClick={onChangeSearch} className="w-full">
            Cambiar zona
          </Button>
        </div>
      )}

      <div id={listId} hidden={!expanded} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {n > 0 && (
          <ul className="space-y-3" aria-label="Garages disponibles">
            {available.map((r) => (
              <li key={r.space.id}>
                <ListItem result={r} href={hrefFor(r.space.id)} distance={distanceFor(r)} onShowOnMap={onShowOnMap} />
              </li>
            ))}
          </ul>
        )}
        {unavailable.length > 0 && (
          <section aria-labelledby={`${id}-nodisp`} className="mt-5">
            <h3 id={`${id}-nodisp`} className="text-sm font-semibold text-ink-900">
              Sin lugar o cerrados ahora
            </h3>
            <p className="mt-0.5 text-xs text-ink-500">
              Se ven en el mapa con su estado.
            </p>
            <ul className="mt-3 space-y-3">
              {unavailable.map((r) => (
                <li key={r.space.id}>
                  <ListItem result={r} href={hrefFor(r.space.id)} distance={distanceFor(r)} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-4 text-xs text-ink-500">
          La disponibilidad la informa cada garage. Avisar que vas no reserva el lugar: para asegurártelo, reservá y pagá
          desde la ficha del garage.
        </p>
      </div>
    </div>
  );
}

function ListItem({
  result,
  href,
  distance,
  onShowOnMap,
}: {
  result: SearchResult;
  href: string;
  distance: string | null;
  onShowOnMap?: (id: string) => void;
}) {
  if (result.space.commercial) return <CommercialCard result={result} href={href} distance={distance} />;
  const { space, quote } = result;
  const status = bookability(result.availability, quote);
  const photo = space.photos[0];
  return (
    <article className="relative flex gap-3 rounded-xl border border-ink-200 bg-white p-2.5 focus-within:ring-2 focus-within:ring-brand-500">
      {photo ? (
        <SpacePhoto variant={photo.variant} url={photo.url} label={photo.url ? photo.caption : "Ilustración"} className="h-20 w-20 shrink-0 rounded-lg" />
      ) : (
        <div className="h-20 w-20 shrink-0 rounded-lg bg-ink-100" />
      )}
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-sm leading-snug font-semibold text-ink-900">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {space.title}
          </Link>
        </h4>
        <p className="mt-0.5 truncate text-xs text-ink-500">
          {SPACE_TYPE_LABEL[space.type]} · {space.neighborhood}
          {distance ? ` · ${distance}` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          {status.ok && quote.ok ? (
            <p className="text-sm font-bold text-ink-900">
              {formatARS(quote.total)} <span className="text-xs font-normal text-ink-500">total · {quote.hours} h</span>
            </p>
          ) : (
            <AvailabilityBadge status={status} />
          )}
          {onShowOnMap && (
            <button
              type="button"
              onClick={() => onShowOnMap(space.id)}
              className="relative z-10 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <MapIcon width={14} height={14} /> Ver en el mapa
              <span className="sr-only">: {space.title}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
