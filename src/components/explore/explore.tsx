"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapView } from "@/components/map/map-view";
import { searchQuery, searchSpaces, type SearchResult } from "@/lib/search";
import { distanceKm, formatDistance } from "@/lib/geo";
import { setLastZone } from "@/lib/last-zone";
import { formatRange } from "@/lib/format";
import { DemoBadge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { InfoIcon, SearchIcon } from "@/components/ui/icons";
import { NO_FILTERS, isBookable, matchesFilters, type ResultFilters } from "@/components/driver/filters";
import { defaultDay, rangeQuery, rangeToInterval, readRange, withDefaults } from "@/components/driver/range";
import { useNow } from "@/components/driver/use-now";
import { CloseIcon, FilterIcon, LocateIcon, RecenterIcon } from "./icons";
import { toMarkers, zoneCenter } from "./map-data";
import { ResultsSheet } from "./results-sheet";
import { SearchPanel, type ExploreQuery } from "./search-panel";
import { SelectedCard } from "./selected-card";
import { useDriverLocation } from "./use-driver-location";
import { useInitialZone } from "./use-initial-zone";
import { useElementHeight, useLockBodyScroll } from "./use-element-height";

/** Si el conductor está más lejos que esto del garage más cercano, no se lo encuadra. */
const FAR_KM = 50;

/**
 * Exploración con mapa a pantalla completa para celulares (estilo app de
 * movilidad). Lee la búsqueda de la URL y deja visible la barra inferior.
 * Usa useSearchParams: montarlo dentro de <Suspense>.
 */
export function Explore() {
  const id = useId();
  const params = useSearchParams();
  const router = useRouter();
  const now = useNow();

  // --- Búsqueda (URL) -------------------------------------------------------
  // Sin zona en la URL: la última buscada en este navegador o CABA.
  const fallbackZone = useInitialZone();
  const urlZone = params.get("zona")?.trim() ?? "";
  const zona = urlZone || fallbackZone;
  useEffect(() => {
    if (urlZone) setLastZone(urlZone);
  }, [urlZone]);
  const { fecha, desde, fechaHasta, hasta } = withDefaults(readRange(params), defaultDay(now));
  const range = useMemo(
    () => ({ fecha, desde, fechaHasta, hasta }),
    [fecha, desde, fechaHasta, hasta],
  );
  const search = useMemo(() => ({ zona, ...range }), [zona, range]);
  const period = rangeToInterval(range);

  // --- Estado de la pantalla ------------------------------------------------
  const [filters, setFilters] = useState<ResultFilters>(NO_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [fitNonce, setFitNonce] = useState(0);
  const [askLocation, setAskLocation] = useState(false);
  const [locationExplained, setLocationExplained] = useState(false);
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);
  const [focusCardTick, setFocusCardTick] = useState(0);

  const refit = useCallback(() => setFitNonce((n) => n + 1), []);
  const { state: location, request: requestLocation } = useDriverLocation(refit);
  const userCoords = location.status === "ok" ? location.coords : null;

  useLockBodyScroll();

  // --- Resultados -----------------------------------------------------------
  const zoneResults = useMemo(() => searchSpaces(search), [search]);
  const results = useMemo(
    () => zoneResults.filter((r) => matchesFilters(r, filters)),
    [zoneResults, filters],
  );
  const available = useMemo(() => results.filter(isBookable), [results]);
  const unavailable = useMemo(() => results.filter((r) => !isBookable(r)), [results]);
  const markers = useMemo(() => toMarkers(available), [available]);
  const fallbackCenter = useMemo(() => zoneCenter(zoneResults), [zoneResults]);

  const nearestKm = userCoords
    ? Math.min(...zoneResults.map((r) => distanceKm(userCoords, r.space.coords)))
    : Infinity;
  const userIsNear = nearestKm <= FAR_KM;
  const fitKey = `${params.toString()}|${zona}|${filters.tipo}|${filters.vehiculo}|${fitNonce}`;

  const selectedIndex = available.findIndex((r) => r.space.id === selectedId);
  const selected = selectedIndex >= 0 ? available[selectedIndex] : null;

  const hrefFor = (spaceId: string) => `/espacios/${spaceId}/${rangeQuery(search)}`;
  const distanceFor = (r: SearchResult) =>
    userCoords
      ? `${formatDistance(distanceKm(userCoords, r.space.coords))} de vos (ubicación aproximada)`
      : null;

  // --- Medidas para que el mapa no quede tapado -----------------------------
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topH = useElementHeight(topRef);
  const bottomH = useElementHeight(bottomRef);
  const padding = useMemo(
    () => ({ top: topH + 12, right: 64, bottom: listOpen ? 96 : bottomH + 12, left: 12 }),
    [topH, bottomH, listOpen],
  );

  // --- Foco -----------------------------------------------------------------
  const pillRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const locateRef = useRef<HTMLButtonElement>(null);
  const confirmLocateRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusCardTick > 0) cardRef.current?.focus({ preventScroll: true });
  }, [focusCardTick]);
  useEffect(() => {
    if (askLocation) confirmLocateRef.current?.focus();
  }, [askLocation]);

  // --- Acciones -------------------------------------------------------------
  const select = (spaceId: string | null) => {
    setSelectedId(spaceId);
    if (spaceId) {
      setListOpen(false);
      setFocusCardTick((n) => n + 1);
    }
  };

  const runSearch = (q: ExploreQuery) => {
    setFilters(q.filters);
    setSelectedId(null);
    setListOpen(false);
    setPanelOpen(false);
    refit();
    if (q.zona) setLastZone(q.zona);
    // La búsqueda vive en la URL de la pantalla principal ("/").
    const qs = searchQuery({ zona: q.zona, ...q.range });
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    pillRef.current?.focus();
  };

  const closePanel = () => {
    setPanelOpen(false);
    pillRef.current?.focus();
  };

  const step = (delta: number) => {
    if (available.length === 0) return;
    const i = selectedIndex < 0 ? 0 : (selectedIndex + delta + available.length) % available.length;
    setSelectedId(available[i].space.id);
  };

  const onLocate = () => {
    setDismissedNotice(null);
    if (location.status === "ok") {
      refit();
    } else if (!locationExplained) {
      setAskLocation(true);
    } else {
      requestLocation();
    }
  };
  const confirmLocate = () => {
    setLocationExplained(true);
    setAskLocation(false);
    requestLocation();
    locateRef.current?.focus();
  };
  const cancelLocate = () => {
    setAskLocation(false);
    locateRef.current?.focus();
  };

  // --- Avisos ---------------------------------------------------------------
  let notice: string | null = null;
  if (location.status === "denied") {
    notice =
      "No diste permiso para usar tu ubicación. Podés seguir buscando por zona; si cambiás de idea, habilitalo en tu navegador.";
  } else if (location.status === "error") {
    notice = "No pudimos obtener tu ubicación. Podés seguir buscando por zona.";
  } else if (location.status === "unsupported") {
    notice = "Tu navegador no permite compartir la ubicación. Podés seguir buscando por zona.";
  } else if (userCoords && zoneResults.length > 0 && !userIsNear) {
    notice = `Los garages de ejemplo están en ${zona}; mostramos esa zona.`;
  }
  const showNotice = notice !== null && notice !== dismissedNotice;

  const filterCount = Number(!!filters.tipo) + Number(!!filters.vehiculo);
  const periodText = period ? formatRange(period.start, period.end) : "Elegí fecha y horario";
  const n = available.length;
  const locating = location.status === "locating";

  return (
    <div className="fixed inset-x-0 top-0 bottom-[var(--mobile-nav-height)] z-40 overflow-hidden bg-ink-100 md:hidden">
      <h1 className="sr-only">Explorá cocheras en el mapa</h1>

      <MapView
        className="absolute inset-0 h-full w-full"
        markers={markers}
        selectedId={selected ? selected.space.id : null}
        onSelect={select}
        fitKey={fitKey}
        fallbackCenter={fallbackCenter}
        userLocation={userCoords}
        includeUserInFit={!!userCoords && userIsNear}
        padding={padding}
        minFitZoom={12}
      />

      {/* Arriba: búsqueda, chips y avisos */}
      <div
        ref={topRef}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 space-y-2 pt-[max(12px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pb-1 pl-[max(12px,env(safe-area-inset-left))]"
      >
        <button
          ref={pillRef}
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={panelOpen}
          aria-label={`Cambiar búsqueda. Zona: ${zona}. ${periodText}${
            filterCount ? `. ${filterCount} ${filterCount === 1 ? "filtro activo" : "filtros activos"}` : ""
          }`}
          className="pointer-events-auto flex w-full items-center gap-3 rounded-full bg-white py-2 pr-2 pl-4 text-left shadow-lg ring-1 ring-ink-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <SearchIcon className="shrink-0 text-brand-600" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink-900">{zona}</span>
            <span className="block truncate text-xs text-ink-500">{periodText}</span>
          </span>
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-700">
            <FilterIcon width={18} height={18} />
            {filterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {filterCount}
              </span>
            )}
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="pointer-events-auto rounded-full bg-white shadow-sm">
            <DemoBadge label="Datos de demostración" />
          </span>
          <span
            className="pointer-events-auto rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-ink-900 shadow-sm ring-1 ring-ink-200"
            aria-live="polite"
          >
            {n} {n === 1 ? "garage disponible" : "garages disponibles"}
          </span>
        </div>

        <div aria-live="polite" className="empty:hidden">
          {locating && (
            <p className="pointer-events-auto inline-flex rounded-xl bg-white px-3 py-2 text-xs text-ink-700 shadow-sm">
              Buscando tu ubicación…
            </p>
          )}
          {showNotice && (
            <div className="pointer-events-auto flex items-start gap-2 rounded-xl border border-accent-300 bg-accent-100 p-3 text-xs text-ink-900 shadow-sm">
              <InfoIcon width={16} height={16} className="mt-0.5 shrink-0 text-accent-700" />
              <p className="flex-1">{notice}</p>
              <button
                type="button"
                onClick={() => setDismissedNotice(notice)}
                aria-label="Cerrar aviso"
                className="-m-1 grid h-7 w-7 shrink-0 place-items-center rounded-full hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <CloseIcon width={14} height={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Botones flotantes, por encima de la atribución del mapa (debe quedar visible). */}
      {!listOpen && (
        <div className="absolute right-3 z-10 flex flex-col gap-2" style={{ bottom: bottomH + 40 }}>
          <button
            ref={locateRef}
            type="button"
            onClick={onLocate}
            aria-label="Mi ubicación"
            aria-busy={locating}
            disabled={locating}
            className={`grid h-11 w-11 place-items-center rounded-full bg-white shadow-lg ring-1 ring-ink-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-70 ${
              userCoords ? "text-brand-600" : "text-ink-700"
            }`}
          >
            <LocateIcon className={locating ? "animate-pulse" : ""} />
          </button>
          <button
            type="button"
            onClick={refit}
            aria-label="Volver a centrar"
            className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink-700 shadow-lg ring-1 ring-ink-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            <RecenterIcon />
          </button>
        </div>
      )}

      {/* Explicación antes de pedir la ubicación */}
      {askLocation && (
        <div
          role="dialog"
          aria-labelledby={`${id}-ubic-titulo`}
          aria-describedby={`${id}-ubic-texto`}
          onKeyDown={(e) => e.key === "Escape" && cancelLocate()}
          className="absolute inset-x-3 z-20 rounded-2xl border border-ink-200 bg-white p-4 shadow-xl"
          style={{ bottom: bottomH + 12 }}
        >
          <h2 id={`${id}-ubic-titulo`} className="font-semibold text-ink-900">
            ¿Usamos tu ubicación?
          </h2>
          <p id={`${id}-ubic-texto`} className="mt-1 text-sm text-ink-700">
            Solo para mostrarte en el mapa y la distancia a cada garage. No se guarda ni se envía:
            queda en tu teléfono mientras tengas esta pantalla abierta.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" onClick={cancelLocate}>
              Ahora no
            </Button>
            <button
              ref={confirmLocateRef}
              type="button"
              onClick={confirmLocate}
              className={buttonClass("primary")}
            >
              Usar mi ubicación
            </button>
          </div>
        </div>
      )}

      {/* Abajo: tarjeta del garage elegido o hoja con la lista */}
      <div ref={bottomRef} className="absolute inset-x-0 bottom-0 z-10">
        {selected ? (
          <div className="px-3 pb-3">
            <SelectedCard
              ref={cardRef}
              result={selected}
              href={hrefFor(selected.space.id)}
              distance={distanceFor(selected)}
              position={{ index: selectedIndex, total: available.length }}
              onPrev={() => step(-1)}
              onNext={() => step(1)}
              onClose={() => setSelectedId(null)}
            />
          </div>
        ) : (
          <ResultsSheet
            available={available}
            unavailable={unavailable}
            zona={zona}
            noZoneMatch={zoneResults.length === 0}
            filtersActive={filterCount > 0}
            expanded={listOpen}
            onExpandedChange={setListOpen}
            onShowOnMap={select}
            hrefFor={hrefFor}
            distanceFor={distanceFor}
            onChangeSearch={() => setPanelOpen(true)}
            onPickCity={(city) => runSearch({ zona: city, range, filters })}
            onClearFilters={() => {
              setFilters(NO_FILTERS);
              refit();
            }}
          />
        )}
      </div>

      {panelOpen && (
        <SearchPanel
          initial={{ zona, range, filters }}
          onSubmit={runSearch}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
