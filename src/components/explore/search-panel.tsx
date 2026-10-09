"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { PinIcon, SearchIcon } from "@/components/ui/icons";
import { FilterSelects, NO_FILTERS, type ResultFilters } from "@/components/driver/filters";
import type { RangeValue } from "@/components/driver/range";
import { RangeFields, fieldInput, fieldLabel } from "@/components/driver/range-fields";
import { ZONE_SUGGESTIONS } from "@/components/driver/search-form";
import { CloseIcon } from "./icons";

export interface ExploreQuery {
  zona: string;
  range: RangeValue;
  filters: ResultFilters;
}

/**
 * Panel (diálogo) para cambiar zona, período y filtros en la exploración con
 * mapa del celular. Se monta al abrirlo, así arranca siempre con la búsqueda actual.
 */
export function SearchPanel({
  initial,
  onSubmit,
  onClose,
}: {
  initial: ExploreQuery;
  onSubmit: (q: ExploreQuery) => void;
  onClose: () => void;
}) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [zona, setZona] = useState(initial.zona);
  const [range, setRange] = useState(initial.range);
  const [filters, setFilters] = useState(initial.filters);

  // Foco en el título (no en el input, para no abrir el teclado de golpe).
  useEffect(() => titleRef.current?.focus(), []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ zona: zona.trim(), range, filters });
  };

  // Escape cierra; Tab queda dentro del diálogo.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      "button, input, select, a[href], [tabindex]:not([tabindex='-1'])",
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const filtersActive = !!filters.tipo || !!filters.vehiculo;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-titulo`}
      onKeyDown={onKeyDown}
      className="absolute inset-0 z-30 flex flex-col bg-white"
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
        <h2
          id={`${id}-titulo`}
          ref={titleRef}
          tabIndex={-1}
          className="text-lg font-semibold text-ink-900 focus:outline-none"
        >
          ¿Dónde y cuándo?
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar sin buscar"
          className="grid h-10 w-10 place-items-center rounded-full text-ink-700 hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <CloseIcon />
        </button>
      </div>

      <form
        role="search"
        aria-label="Buscar cocheras"
        onSubmit={submit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <label htmlFor={`${id}-zona`} className={fieldLabel}>
              Zona (ciudad o barrio)
            </label>
            <div className="relative">
              <PinIcon className="pointer-events-none absolute top-1/2 left-3 mt-0.5 -translate-y-1/2 text-ink-400" />
              <input
                id={`${id}-zona`}
                type="text"
                list={`${id}-zonas`}
                autoComplete="off"
                enterKeyHint="search"
                placeholder="Ej.: Palermo, Córdoba, Rosario"
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                className={`${fieldInput} pl-10`}
              />
              <datalist id={`${id}-zonas`}>
                {ZONE_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          <RangeFields value={range} onChange={setRange} idPrefix={id} />

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-ink-900">Filtros</legend>
            <div className="grid grid-cols-2 gap-3">
              <FilterSelects idPrefix={id} value={filters} onChange={setFilters} />
            </div>
            {filtersActive && (
              <button
                type="button"
                onClick={() => setFilters(NO_FILTERS)}
                className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                Limpiar filtros
              </button>
            )}
          </fieldset>
          <p className="text-xs text-ink-500">
            En el mapa ves solo los espacios disponibles en ese horario. Datos de demostración.
          </p>
        </div>

        <div className="border-t border-ink-200 px-4 py-3">
          <Button type="submit" size="lg" className="w-full">
            <SearchIcon />
            Buscar
          </Button>
        </div>
      </form>
    </div>
  );
}
