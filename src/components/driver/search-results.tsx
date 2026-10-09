"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { searchSpaces, type SearchParams } from "@/lib/search";
import { cities } from "@/lib/demo-data";
import { formatRange } from "@/lib/format";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { DemoNotice } from "@/components/ui/demo-notice";
import { ResultsMap } from "@/components/explore/results-map";
import { FilterSelects, NO_FILTERS, isBookable, matchesFilters, type ResultFilters } from "./filters";
import { defaultDay, rangeQuery, rangeToInterval, readRange, withDefaults } from "./range";
import { fieldInput, fieldLabel } from "./range-fields";
import { SearchForm } from "./search-form";
import { SpaceCard } from "./space-card";
import { useNow } from "./use-now";

type Order = "recomendado" | "precio_asc" | "precio_desc";

/**
 * Resultados de /buscar/ en escritorio: lista (búsqueda, filtros, tarjetas) a
 * la izquierda y mapa fijo a la derecha. En celulares /buscar/ usa `Explore`.
 */
export function SearchResults() {
  const params = useSearchParams();
  const now = useNow();
  const zona = params.get("zona")?.trim() ?? "";
  const { fecha, desde, fechaHasta, hasta } = withDefaults(readRange(params), defaultDay(now));
  const search = useMemo<SearchParams>(
    () => ({ zona, fecha, desde, fechaHasta, hasta }),
    [zona, fecha, desde, fechaHasta, hasta],
  );

  return (
    <Results search={search} hasDates={!!fecha} queryKey={params.toString()}>
      <PageHeader
        title="Buscar cocheras"
        subtitle="Elegí zona y horario. Ves el precio total antes de solicitar."
      />
      <Card className="p-4">
        <h2 className="sr-only">Modificar búsqueda</h2>
        <SearchForm key={params.toString()} initial={search} variant="compact" />
      </Card>
    </Results>
  );
}

function Results({
  search,
  hasDates,
  queryKey,
  children,
}: {
  search: SearchParams;
  hasDates: boolean;
  queryKey: string;
  children: ReactNode;
}) {
  const id = useId();
  const [filters, setFilters] = useState<ResultFilters>(NO_FILTERS);
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [orden, setOrden] = useState<Order>("recomendado");
  // Marcador destacado: el de la tarjeta bajo el mouse/foco o el último tocado en el mapa.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLLIElement>());

  const all = useMemo(() => searchSpaces(search), [search]);
  const matching = useMemo(() => all.filter((r) => matchesFilters(r, filters)), [all, filters]);
  const filtered = soloDisponibles ? matching.filter(isBookable) : matching;
  const results =
    orden === "recomendado"
      ? filtered
      : [...filtered].sort((a, b) => {
          // Los que no tienen precio para el período van siempre al final.
          if (!a.quote.ok || !b.quote.ok) return Number(!a.quote.ok) - Number(!b.quote.ok);
          return orden === "precio_asc" ? a.quote.total - b.quote.total : b.quote.total - a.quote.total;
        });

  const onMapSelect = useCallback((spaceId: string | null) => {
    setSelectedId(spaceId);
    if (!spaceId) return;
    const el = cardRefs.current.get(spaceId);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, []);

  const filtersActive = !!filters.tipo || !!filters.vehiculo || soloDisponibles;
  const clearFilters = () => {
    setFilters(NO_FILTERS);
    setSoloDisponibles(false);
  };
  const detailQuery = rangeQuery(search);
  const period = hasDates ? rangeToInterval(search) : null;
  const onMap = new Set(matching.filter(isBookable).map((r) => r.space.id));
  const highlighted = hoveredId && onMap.has(hoveredId) ? hoveredId : selectedId;

  return (
    <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,48rem)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6 px-4 pb-10 sm:px-6">
        {children}

        <section aria-labelledby={`${id}-filtros`} className="space-y-3">
          <h2 id={`${id}-filtros`} className="text-sm font-semibold text-ink-900">
            Filtros
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <FilterSelects idPrefix={id} value={filters} onChange={setFilters} />
            <div>
              <label htmlFor={`${id}-orden`} className={fieldLabel}>
                Ordenar por
              </label>
              <select
                id={`${id}-orden`}
                value={orden}
                onChange={(e) => setOrden(e.target.value as Order)}
                className={fieldInput}
              >
                <option value="recomendado">Disponibles primero</option>
                <option value="precio_asc">Precio: menor a mayor</option>
                <option value="precio_desc">Precio: mayor a menor</option>
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-3 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={soloDisponibles}
                onChange={(e) => setSoloDisponibles(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 accent-brand-600"
              />
              Solo disponibles
            </label>
          </div>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              Limpiar filtros
            </button>
          )}
        </section>

        <section aria-labelledby={`${id}-resultados`} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id={`${id}-resultados`} className="text-lg font-semibold text-ink-900" aria-live="polite">
              {results.length} {results.length === 1 ? "espacio" : "espacios"}
              {search.zona ? ` en «${search.zona}»` : ""}
            </h2>
            <DemoBadge label="Datos de ejemplo" />
          </div>
          {period && (
            <p className="text-sm text-ink-500">Período: {formatRange(period.start, period.end)}</p>
          )}
          <p className="text-xs text-ink-500">
            En el mapa aparecen solo los espacios disponibles en ese período, en una ubicación
            aproximada de ejemplo.
          </p>

          {results.length > 0 ? (
            <ul className="@container space-y-4">
              {results.map((r) => (
                <li
                  key={r.space.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(r.space.id, el);
                    else cardRefs.current.delete(r.space.id);
                  }}
                  onMouseEnter={() => setHoveredId(r.space.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(r.space.id)}
                  onBlur={() => setHoveredId(null)}
                  className={`scroll-mt-24 rounded-2xl transition-shadow ${
                    highlighted === r.space.id ? "ring-2 ring-brand-500 ring-offset-2" : ""
                  }`}
                >
                  <SpaceCard result={r} href={`/espacios/${r.space.id}/${detailQuery}`} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              zona={search.zona}
              noZoneMatch={all.length === 0}
              onClearFilters={filtersActive ? clearFilters : undefined}
              query={search}
            />
          )}

          <DemoNotice>
            Los espacios, precios y calificaciones son de ejemplo. Reservar es solo una solicitud:
            el propietario tiene que aceptarla.
          </DemoNotice>
        </section>
      </div>

      <div className="hidden border-l border-ink-200 md:block">
        {/* 65px = header fijo (h-16 + borde). */}
        <div className="sticky top-[65px] h-[calc(100dvh-65px)]">
          <ResultsMap
            results={matching}
            selectedId={highlighted}
            onSelect={onMapSelect}
            fitKey={`${queryKey}|${filters.tipo}|${filters.vehiculo}`}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  zona,
  noZoneMatch,
  onClearFilters,
  query,
}: {
  zona: string;
  noZoneMatch: boolean;
  onClearFilters?: () => void;
  query: SearchParams;
}) {
  return (
    <Card className="space-y-3 p-6 text-center">
      <p className="font-semibold text-ink-900">
        {noZoneMatch
          ? `No encontramos espacios en «${zona}».`
          : "Ningún espacio coincide con los filtros elegidos."}
      </p>
      <p className="text-sm text-ink-500">
        {noZoneMatch
          ? "Probá con otra ciudad o barrio. En la demo hay espacios en estas ciudades:"
          : "Probá ampliar los filtros o cambiar el horario."}
      </p>
      {noZoneMatch ? (
        <ul className="flex flex-wrap justify-center gap-2">
          {cities().map(({ city }) => (
            <li key={city}>
              <Link
                href={`/buscar/${rangeQuery({ ...query, zona: city })}`}
                className="inline-flex rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-900 hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                {city}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        onClearFilters && (
          <Button variant="secondary" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        )
      )}
    </Card>
  );
}
