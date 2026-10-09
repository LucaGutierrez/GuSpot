"use client";

import type { RangeValue } from "./range";

export const fieldLabel = "block text-xs font-semibold text-ink-700";
export const fieldInput =
  "mt-1 block h-11 w-full min-w-0 rounded-xl border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 focus-visible:border-brand-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand-500";

/**
 * Campos de entrada/salida (fecha + hora). Controlados: el padre guarda el
 * valor. Si se pasan `names`, los inputs viajan en un formulario GET.
 */
export function RangeFields({
  value,
  onChange,
  idPrefix,
  withNames = false,
  layout = "grid",
}: {
  value: RangeValue;
  onChange: (next: RangeValue) => void;
  idPrefix: string;
  withNames?: boolean;
  layout?: "grid" | "row";
}) {
  const set = (key: keyof RangeValue, v: string) => {
    const next = { ...value, [key]: v };
    // Si la entrada pasa a ser posterior a la fecha de salida, la acompañamos.
    if (key === "fecha" && v && next.fechaHasta < v) next.fechaHasta = v;
    onChange(next);
  };
  const n = (name: string) => (withNames ? name : undefined);
  const grid =
    layout === "row" ? "grid grid-cols-2 gap-3 lg:grid-cols-4" : "grid grid-cols-2 gap-3";

  return (
    <div className={grid}>
      <fieldset className="contents">
        <legend className="sr-only">Entrada</legend>
        <div>
          <label htmlFor={`${idPrefix}-fecha`} className={fieldLabel}>
            Fecha de entrada
          </label>
          <input
            id={`${idPrefix}-fecha`}
            name={n("fecha")}
            type="date"
            required
            value={value.fecha}
            onChange={(e) => set("fecha", e.target.value)}
            className={fieldInput}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-desde`} className={fieldLabel}>
            Hora de entrada
          </label>
          <input
            id={`${idPrefix}-desde`}
            name={n("desde")}
            type="time"
            step={900}
            required
            value={value.desde}
            onChange={(e) => set("desde", e.target.value)}
            className={fieldInput}
          />
        </div>
      </fieldset>
      <fieldset className="contents">
        <legend className="sr-only">Salida</legend>
        <div>
          <label htmlFor={`${idPrefix}-fechaHasta`} className={fieldLabel}>
            Fecha de salida
          </label>
          <input
            id={`${idPrefix}-fechaHasta`}
            name={n("fechaHasta")}
            type="date"
            required
            min={value.fecha || undefined}
            value={value.fechaHasta}
            onChange={(e) => set("fechaHasta", e.target.value)}
            className={fieldInput}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-hasta`} className={fieldLabel}>
            Hora de salida
          </label>
          <input
            id={`${idPrefix}-hasta`}
            name={n("hasta")}
            type="time"
            step={900}
            required
            value={value.hasta}
            onChange={(e) => set("hasta", e.target.value)}
            className={fieldInput}
          />
        </div>
      </fieldset>
    </div>
  );
}
