"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import type { SpaceType, VehicleSize } from "@/lib/types";
import { searchSpaces, type SearchParams } from "@/lib/search";
import { cities } from "@/lib/demo-data";
import { SPACE_TYPE_LABEL, VEHICLE_LABEL, formatRange } from "@/lib/format";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoNotice } from "@/components/ui/demo-notice";
import { bookability } from "./availability-status";
import { defaultDay, rangeQuery, rangeToInterval, readRange, withDefaults } from "./range";
import { fieldInput, fieldLabel } from "./range-fields";
import { SearchForm } from "./search-form";
import { SpaceCard } from "./space-card";
import { useNow } from "./use-now";
import { VEHICLE_ORDER, fitsVehicle } from "./vehicles";

type Order = "recomendado" | "precio_asc" | "precio_desc";

export function SearchResults() {
  const params = useSearchParams();
  const now = useNow();
  const zona = params.get("zona")?.trim() ?? "";
  const partial = readRange(params);
  const range = withDefaults(partial, defaultDay(now));
  const search: SearchParams = { zona, ...range };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h2 className="sr-only">Modificar búsqueda</h2>
        <SearchForm key={params.toString()} initial={search} variant="compact" />
      </Card>
      <Results search={search} hasDates={!!range.fecha} />
    </div>
  );
}

function Results({ search, hasDates }: { search: SearchParams; hasDates: boolean }) {
  const id = useId();
  const [tipo, setTipo] = useState<SpaceType | "">("");
  const [vehiculo, setVehiculo] = useState<VehicleSize | "">("");
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [orden, setOrden] = useState<Order>("recomendado");

  const all = searchSpaces(search);
  const filtered = all.filter(
    (r) =>
      (!tipo || r.space.type === tipo) &&
      (!vehiculo || fitsVehicle(r.space.maxVehicle, vehiculo)) &&
      (!soloDisponibles || bookability(r.availability, r.quote).ok),
  );
  const results =
    orden === "recomendado"
      ? filtered
      : [...filtered].sort((a, b) => {
          // Los que no tienen precio para el período van siempre al final.
          if (!a.quote.ok || !b.quote.ok) return Number(!a.quote.ok) - Number(!b.quote.ok);
          return orden === "precio_asc" ? a.quote.total - b.quote.total : b.quote.total - a.quote.total;
        });

  const filtersActive = !!tipo || !!vehiculo || soloDisponibles;
  const clearFilters = () => {
    setTipo("");
    setVehiculo("");
    setSoloDisponibles(false);
  };
  const detailQuery = rangeQuery(search);
  const period = hasDates ? rangeToInterval(search) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <aside aria-labelledby={`${id}-filtros`} className="space-y-4">
        <h2 id={`${id}-filtros`} className="text-sm font-semibold text-ink-900">
          Filtros
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div>
            <label htmlFor={`${id}-tipo`} className={fieldLabel}>
              Tipo de espacio
            </label>
            <select
              id={`${id}-tipo`}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as SpaceType | "")}
              className={fieldInput}
            >
              <option value="">Todos</option>
              {(Object.keys(SPACE_TYPE_LABEL) as SpaceType[]).map((t) => (
                <option key={t} value={t}>
                  {SPACE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-vehiculo`} className={fieldLabel}>
              Tu vehículo
            </label>
            <select
              id={`${id}-vehiculo`}
              value={vehiculo}
              onChange={(e) => setVehiculo(e.target.value as VehicleSize | "")}
              className={fieldInput}
            >
              <option value="">Cualquiera</option>
              {VEHICLE_ORDER.map((v) => (
                <option key={v} value={v}>
                  {VEHICLE_LABEL[v]}
                </option>
              ))}
            </select>
          </div>
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
          <label className="flex items-center gap-2 self-end pb-3 text-sm text-ink-700 lg:pb-0">
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
        <p className="rounded-xl border border-dashed border-ink-300 p-3 text-xs text-ink-500">
          Mapa: próximamente. Por ahora mostramos la ubicación aproximada de cada espacio.
        </p>
      </aside>

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

        {results.length > 0 ? (
          <ul className="space-y-4">
            {results.map((r) => (
              <li key={r.space.id}>
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
