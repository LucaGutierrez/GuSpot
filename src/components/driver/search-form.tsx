"use client";

import Form from "next/form";
import { useId, useState } from "react";
import type { SearchParams } from "@/lib/search";
import { cities } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { PinIcon, SearchIcon } from "@/components/ui/icons";
import { RangeFields, fieldInput, fieldLabel } from "./range-fields";
import { useRange } from "./use-range";

const ZONE_SUGGESTIONS = cities().flatMap(({ city, neighborhoods }) => [
  city,
  ...neighborhoods.map((n) => `${n}, ${city}`),
]);

/**
 * Formulario de búsqueda. Envía GET a /buscar/ con zona, fecha, desde,
 * fechaHasta y hasta. `variant="compact"` es la barra editable de resultados.
 */
export function SearchForm({
  initial = {},
  variant = "hero",
}: {
  initial?: Partial<SearchParams>;
  variant?: "hero" | "compact";
}) {
  const id = useId();
  const [zona, setZona] = useState(initial.zona ?? "");
  const { value, setValue } = useRange(initial);
  const listId = `${id}-zonas`;
  const compact = variant === "compact";

  return (
    <Form action="/buscar/" role="search" aria-label="Buscar cocheras" className="space-y-3">
      <div>
        <label htmlFor={`${id}-zona`} className={fieldLabel}>
          Zona (ciudad o barrio)
        </label>
        <div className="relative">
          <PinIcon className="pointer-events-none absolute top-1/2 left-3 mt-0.5 -translate-y-1/2 text-ink-400" />
          <input
            id={`${id}-zona`}
            name="zona"
            type="text"
            list={listId}
            autoComplete="off"
            placeholder="Ej.: Palermo, Córdoba, Rosario"
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            className={`${fieldInput} pl-10`}
          />
          <datalist id={listId}>
            {ZONE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>
      <RangeFields
        value={value}
        onChange={setValue}
        idPrefix={id}
        withNames
        layout={compact ? "row" : "grid"}
      />
      <Button type="submit" size={compact ? "md" : "lg"} className="w-full">
        <SearchIcon />
        {compact ? "Actualizar búsqueda" : "Buscar cocheras"}
      </Button>
    </Form>
  );
}
