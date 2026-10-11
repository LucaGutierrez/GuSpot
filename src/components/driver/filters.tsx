"use client";

import type { SearchResult } from "@/lib/search";
import type { SpaceType, VehicleSize } from "@/lib/types";
import { SPACE_TYPE_LABEL, VEHICLE_LABEL } from "@/lib/format";
import { bookability } from "./availability-status";
import { fieldInput, fieldLabel } from "./range-fields";
import { VEHICLE_ORDER, fitsVehicle } from "./vehicles";
import { liveStatus, type LiveStatus } from "@/lib/live";
import { nowInArgentina } from "./use-now";

/** Filtros de resultados que no viajan en la URL (estado local de la pantalla). */
export interface ResultFilters {
  tipo: SpaceType | "";
  vehiculo: VehicleSize | "";
  /** Solo los que atienden ahora. */
  abierto: boolean;
  /** Solo los que informan lugar libre. */
  conLugar: boolean;
  /** Precio máximo por hora, en pesos (null = sin límite). */
  precioMax: number | null;
}

export const NO_FILTERS: ResultFilters = { tipo: "", vehiculo: "", abierto: false, conLugar: false, precioMax: null };

export function activeFilterCount(f: ResultFilters): number {
  return Number(!!f.tipo) + Number(!!f.vehiculo) + Number(f.abierto) + Number(f.conLugar) + Number(f.precioMax !== null);
}

/** Disponibilidad en vivo de un garaje comercial (null para cocheras/ejemplos). */
export function liveOf(r: SearchResult): LiveStatus | null {
  return r.space.commercial ? liveStatus(r.space, nowInArgentina()) : null;
}

export function matchesFilters(r: SearchResult, f: ResultFilters): boolean {
  if (f.tipo && r.space.type !== f.tipo) return false;
  if (f.vehiculo && !fitsVehicle(r.space.maxVehicle, f.vehiculo)) return false;
  if (f.precioMax !== null && r.space.hourlyPrice > f.precioMax * 100) return false;
  const live = liveOf(r);
  if (f.abierto && !(live ? live.open : isBookable(r))) return false;
  if (f.conLugar && !(live ? live.tone === "ok" || live.tone === "few" : isBookable(r))) return false;
  return true;
}

/**
 * ¿Está disponible? Garajes comerciales: si recibe conductores ahora.
 * Resto: si se puede solicitar en el período buscado (con cotización válida).
 */
export function isBookable(r: SearchResult): boolean {
  const live = liveOf(r);
  if (live) return live.accepting;
  return bookability(r.availability, r.quote).ok;
}

const PRICE_STEPS = [2000, 3000, 4000, 5000, 7000, 10000];

/** Selectores de tipo de espacio y vehículo, compartidos entre la lista y el mapa. */
export function FilterSelects({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: ResultFilters;
  onChange: (next: ResultFilters) => void;
}) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-tipo`} className={fieldLabel}>
          Tipo de espacio
        </label>
        <select
          id={`${idPrefix}-tipo`}
          value={value.tipo}
          onChange={(e) => onChange({ ...value, tipo: e.target.value as SpaceType | "" })}
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
        <label htmlFor={`${idPrefix}-vehiculo`} className={fieldLabel}>
          Tu vehículo
        </label>
        <select
          id={`${idPrefix}-vehiculo`}
          value={value.vehiculo}
          onChange={(e) => onChange({ ...value, vehiculo: e.target.value as VehicleSize | "" })}
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
        <label htmlFor={`${idPrefix}-precio`} className={fieldLabel}>
          Precio por hora
        </label>
        <select
          id={`${idPrefix}-precio`}
          value={value.precioMax ?? ""}
          onChange={(e) => onChange({ ...value, precioMax: e.target.value ? Number(e.target.value) : null })}
          className={fieldInput}
        >
          <option value="">Cualquiera</option>
          {PRICE_STEPS.map((p) => (
            <option key={p} value={p}>
              Hasta ${p.toLocaleString("es-AR")}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col justify-end gap-2 pb-1">
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={value.abierto}
            onChange={(e) => onChange({ ...value, abierto: e.target.checked })}
            className="h-4 w-4 rounded border-ink-300 accent-brand-600"
          />
          Abierto ahora
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={value.conLugar}
            onChange={(e) => onChange({ ...value, conLugar: e.target.checked })}
            className="h-4 w-4 rounded border-ink-300 accent-brand-600"
          />
          Con lugares
        </label>
      </div>
    </>
  );
}
