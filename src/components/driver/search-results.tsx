"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { searchSpaces, type Area, type SearchParams } from "@/lib/search";
import { cities } from "@/lib/demo-data";
import { setLastZone } from "@/lib/last-zone";
import { formatRange } from "@/lib/format";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { DemoNotice } from "@/components/ui/demo-notice";
import { ResultsMap } from "@/components/explore/results-map";
import { useInitialZone } from "@/components/explore/use-initial-zone";
import { useLockBodyScroll } from "@/components/explore/use-element-height";
import { spaceHref, useSearchSource } from "@/components/explore/space-source";
import { FilterSelects, NO_FILTERS, isBookable, matchesFilters, type ResultFilters } from "./filters";
import { defaultDay, rangeQuery, rangeToInterval, readRange, withDefaults } from "./range";
import { fieldInput, fieldLabel } from "./range-fields";
import { SearchForm } from "./search-form";
import { SpaceCard } from "./space-card";
import { useNow } from "./use-now";

type Order = "recomendado" | "precio_asc" | "precio_desc";

/**
 * Búsqueda en escritorio (pantalla principal, "/"): lista (búsqueda, filtros,
 * tarjetas) a la izquierda y mapa a la derecha. En celulares se usa `Explore`.
 */
export function SearchResults() {
  const params = useSearchParams();
  const now = useNow();
  // Sin `zona` en la URL: la última buscada o CABA. `zona=` vacía: todas.
  const fallbackZone = useInitialZone();
  const urlZone = params.get("zona");
  const zona = urlZone !== null ? urlZone.trim() : fallbackZone;

  useEffect(() => {
    if (urlZone?.trim()) setLastZone(urlZone);
  }, [urlZone]);
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
        <SearchForm key={`${params.toString()}|${zona}`} initial={search} variant="compact" />
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
  const listRef = useRef<HTMLDivElement>(null);

  // La vista ocupa exactamente el alto libre bajo el encabezado: el documento
  // no se desplaza (la lista tiene su propio scroll) y el mapa nunca queda cortado.
  useLockBodyScroll();
  useEffect(() => {
    window.scrollTo(0, 0);
    const keepTop = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    window.addEventListener("scroll", keepTop, { passive: true });
    return () => window.removeEventListener("scroll", keepTop);
  }, []);

  const { mode, spaces, failed } = useSearchSource();
  const real = mode === "reales";
  // "Buscar en esta zona": vale para la búsqueda actual de la URL.
  const [areaState, setAreaState] = useState<{ key: string; area: Area } | null>(null);
  const [movedTo, setMovedTo] = useState<{ key: string; area: Area } | null>(null);
  const area = areaState?.key === queryKey ? areaState.area : null;
  const pendingArea = movedTo?.key === queryKey && movedTo.area !== area ? movedTo.area : null;
  const all = useMemo(() => searchSpaces(search, spaces ?? [], area), [search, spaces, area]);
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
    const list = listRef.current;
    if (!el || !list) return;
    // Se desplaza solo la columna de la lista (scrollIntoView movería también la página).
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elBox = el.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    const top = list.scrollTop + (elBox.top - listBox.top) - (listBox.height - elBox.height) / 2;
    list.scrollTo({ top: Math.max(0, top), behavior: reduce ? "auto" : "smooth" });
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
    <div
      className="grid grid-rows-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,48rem)_minmax(0,1fr)]"
      style={{ height: "calc(100dvh - var(--app-top))" }}
    >
      <div
        ref={listRef}
        className="min-h-0 min-w-0 space-y-6 overflow-y-auto overscroll-contain px-4 pb-10 sm:px-6"
      >
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
              {area ? " en esta zona del mapa" : search.zona ? ` en «${search.zona}»` : ""}
            </h2>
            {!real && <DemoBadge label="Datos de ejemplo" />}
          </div>
          {period && (
            <p className="text-sm text-ink-500">Período: {formatRange(period.start, period.end)}</p>
          )}
          <p className="text-xs text-ink-500">
            {real
              ? "En el mapa aparecen solo los garages disponibles en ese período. La dirección y cómo entrar se comparten cuando la reserva esté confirmada."
              : "En el mapa aparecen solo los espacios disponibles en ese período, en una ubicación aproximada (±200 m). La dirección exacta se comparte cuando la reserva esté confirmada y pagada."}
          </p>

          {spaces === null ? (
            <p className="text-sm text-ink-500">Cargando garages…</p>
          ) : failed ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              No pudimos cargar los garages. Revisá tu conexión y probá de nuevo.
            </p>
          ) : results.length > 0 ? (
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
                  className={`rounded-2xl transition-shadow ${
                    highlighted === r.space.id ? "ring-2 ring-brand-500 ring-offset-2" : ""
                  }`}
                >
                  <SpaceCard result={r} href={spaceHref(r.space, detailQuery)} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              real={real}
              zona={area ? "esta zona del mapa" : search.zona}
              noZoneMatch={all.length === 0}
              onClearFilters={filtersActive ? clearFilters : undefined}
              query={search}
            />
          )}

          {real ? (
            <DemoNotice>
              Estos garages los publicaron sus dueños. Todavía no se puede reservar ni pagar desde
              GuSpot.
            </DemoNotice>
          ) : (
            <DemoNotice>
              Los espacios, precios y calificaciones son de ejemplo. Reservar es solo una solicitud:
              el propietario tiene que aceptarla.
            </DemoNotice>
          )}
        </section>
      </div>

      <div className="hidden min-h-0 border-l border-ink-200 md:block">
        <ResultsMap
          results={matching}
          selectedId={highlighted}
          onSelect={onMapSelect}
          fitKey={`${queryKey}|${search.zona}|${filters.tipo}|${filters.vehiculo}|${mode}|${spaces?.length ?? -1}`}
          onUserMove={(a) => setMovedTo({ key: queryKey, area: a })}
          canSearchArea={!!pendingArea}
          onSearchArea={() => pendingArea && setAreaState({ key: queryKey, area: pendingArea })}
        />
      </div>
    </div>
  );
}

function EmptyState({
  real,
  zona,
  noZoneMatch,
  onClearFilters,
  query,
}: {
  real: boolean;
  zona: string;
  noZoneMatch: boolean;
  onClearFilters?: () => void;
  query: SearchParams;
}) {
  if (real) {
    return (
      <Card className="space-y-3 p-6 text-center">
        <p className="font-semibold text-ink-900">
          {noZoneMatch
            ? `Todavía no hay garages publicados en «${zona}».`
            : "Ningún garage coincide con los filtros elegidos."}
        </p>
        <p className="text-sm text-ink-500">
          {noZoneMatch ? "Probá con otra zona o mirá los garages de ejemplo." : "Probá ampliar los filtros o cambiar el horario."}
        </p>
        {!noZoneMatch && onClearFilters && (
          <Button variant="secondary" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        )}
      </Card>
    );
  }
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
                href={`/${rangeQuery({ ...query, zona: city })}`}
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
