"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { searchSpaces, type Area, type SearchParams } from "@/lib/search";
import { setLastZone } from "@/lib/last-zone";
import { formatRange } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { ResultsMap } from "@/components/explore/results-map";
import { useInitialZone } from "@/components/explore/use-initial-zone";
import { useLockBodyScroll } from "@/components/explore/use-element-height";
import { spaceHref, useSearchSource } from "@/components/explore/space-source";
import { FilterSelects, NO_FILTERS, isBookable, liveOf, matchesFilters, type ResultFilters } from "./filters";
import { rangeOrEmpty, rangeQuery, rangeToInterval, readRange } from "./range";
import { fieldInput, fieldLabel } from "./range-fields";
import { SearchForm } from "./search-form";
import { SpaceCard } from "./space-card";

type Order = "recomendado" | "precio_asc" | "precio_desc";

/**
 * Búsqueda en escritorio (pantalla principal, "/"): lista (búsqueda, filtros,
 * tarjetas) a la izquierda y mapa a la derecha. En celulares se usa `Explore`.
 */
export function SearchResults() {
  const params = useSearchParams();
  // Sin `zona` en la URL: la última buscada o CABA. `zona=` vacía: todas.
  const fallbackZone = useInitialZone();
  const urlZone = params.get("zona");
  const zona = urlZone !== null ? urlZone.trim() : fallbackZone;

  useEffect(() => {
    if (urlZone?.trim()) setLastZone(urlZone);
  }, [urlZone]);
  // Sin horario por defecto: se busca por zona y el horario se elige al reservar.
  const { fecha, desde, fechaHasta, hasta } = rangeOrEmpty(readRange(params));
  const search = useMemo<SearchParams>(
    () => ({ zona, fecha, desde, fechaHasta, hasta }),
    [zona, fecha, desde, fechaHasta, hasta],
  );

  return (
    <Results search={search} hasDates={!!fecha} queryKey={params.toString()}>
      <PageHeader
        title="Buscar cocheras"
        subtitle="Buscá por zona. Ves los lugares libres en vivo y el horario lo elegís al entrar al garaje."
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

  const { spaces, failed } = useSearchSource();
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
  const onMap = new Set(matching.filter((r) => liveOf(r) || isBookable(r)).map((r) => r.space.id));
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
          </div>
          {period && (
            <p className="text-sm text-ink-500">Período: {formatRange(period.start, period.end)}</p>
          )}
          <p className="text-xs text-ink-500">
            Los lugares libres los informa cada garaje en vivo. La dirección y cómo entrar se comparten cuando avisás
            que vas o reservás.
          </p>

          {spaces === null ? (
            <p className="text-sm text-ink-500">Cargando garajes…</p>
          ) : failed ? (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              No pudimos cargar los garajes. Revisá tu conexión y probá de nuevo.
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
              zona={area ? "esta zona del mapa" : search.zona}
              noZoneMatch={all.length === 0}
              onClearFilters={filtersActive ? clearFilters : undefined}
            />
          )}

        </section>
      </div>

      <div className="hidden min-h-0 border-l border-ink-200 md:block">
        <ResultsMap
          results={matching}
          selectedId={highlighted}
          onSelect={onMapSelect}
          fitKey={`${queryKey}|${search.zona}|${filters.tipo}|${filters.vehiculo}|${spaces?.length ?? -1}`}
          onUserMove={(a) => setMovedTo({ key: queryKey, area: a })}
          canSearchArea={!!pendingArea}
          onSearchArea={() => pendingArea && setAreaState({ key: queryKey, area: pendingArea })}
        />
      </div>
    </div>
  );
}

function EmptyState({
  zona,
  noZoneMatch,
  onClearFilters,
}: {
  zona: string;
  noZoneMatch: boolean;
  onClearFilters?: () => void;
}) {
  return (
      <Card className="space-y-3 p-6 text-center">
        <p className="font-semibold text-ink-900">
          {noZoneMatch
            ? `Todavía no hay garajes publicados en «${zona}».`
            : "Ningún garaje coincide con los filtros elegidos."}
        </p>
        <p className="text-sm text-ink-500">
          {noZoneMatch ? "Probá con otra zona." : "Probá ampliar los filtros."}
        </p>
        {!noZoneMatch && onClearFilters && (
          <Button variant="secondary" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        )}
      </Card>
  );
}
