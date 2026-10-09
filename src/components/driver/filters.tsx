"use client";

import type { SearchResult } from "@/lib/search";
import type { SpaceType, VehicleSize } from "@/lib/types";
import { SPACE_TYPE_LABEL, VEHICLE_LABEL } from "@/lib/format";
import { bookability } from "./availability-status";
import { fieldInput, fieldLabel } from "./range-fields";
import { VEHICLE_ORDER, fitsVehicle } from "./vehicles";

/** Filtros de resultados que no viajan en la URL (estado local de la pantalla). */
export interface ResultFilters {
  tipo: SpaceType | "";
  vehiculo: VehicleSize | "";
}

export const NO_FILTERS: ResultFilters = { tipo: "", vehiculo: "" };

export function matchesFilters(r: SearchResult, f: ResultFilters): boolean {
  return (!f.tipo || r.space.type === f.tipo) && (!f.vehiculo || fitsVehicle(r.space.maxVehicle, f.vehiculo));
}

/** ¿Se puede solicitar en el período buscado? (disponible y con cotización válida) */
export function isBookable(r: SearchResult): boolean {
  return bookability(r.availability, r.quote).ok;
}

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
    </>
  );
}
