"use client";

import Form from "next/form";
import { useId, useState } from "react";
import type { SearchParams } from "@/lib/search";
import { setLastZone } from "@/lib/last-zone";
import { Button } from "@/components/ui/button";
import { PinIcon, SearchIcon } from "@/components/ui/icons";
import { fieldInput, fieldLabel } from "./range-fields";

/** Sugerencias de zona: barrios porteños y las ciudades más grandes del país. */
export const ZONE_SUGGESTIONS = [
  "CABA",
  "Córdoba", "Rosario", "Mendoza", "La Plata", "Mar del Plata", "San Miguel de Tucumán", "Salta",
  "Santa Fe", "Neuquén", "Bahía Blanca", "San Juan", "Bariloche",
  ...[
    "Microcentro", "San Nicolás", "Retiro", "Monserrat", "San Telmo", "Puerto Madero", "Recoleta", "Palermo",
    "Belgrano", "Núñez", "Colegiales", "Villa Crespo", "Almagro", "Balvanera", "Caballito", "Flores",
    "Boedo", "Barracas", "La Boca", "Constitución", "Villa Urquiza", "Saavedra", "Chacarita", "Villa Devoto",
  ].map((b) => `${b}, CABA`),
];

/**
 * Formulario de búsqueda. Envía GET al mapa ("/") con la zona y la recuerda
 * como última buscada. El horario no se pide acá: se elige al reservar.
 * `variant="compact"` es la barra editable de resultados (reemplaza la URL).
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
  const listId = `${id}-zonas`;
  const compact = variant === "compact";

  return (
    <Form
      action="/"
      replace={compact}
      scroll={!compact}
      onSubmit={() => setLastZone(zona)}
      role="search"
      aria-label="Buscar cocheras"
      className="space-y-3"
    >
      <div>
        <label htmlFor={`${id}-zona`} className={fieldLabel}>
          Zona o barrio
        </label>
        <div className="relative">
          <PinIcon className="pointer-events-none absolute top-1/2 left-3 mt-0.5 -translate-y-1/2 text-ink-400" />
          <input
            id={`${id}-zona`}
            name="zona"
            type="text"
            list={listId}
            autoComplete="off"
            placeholder="Ej.: Palermo, Microcentro, Recoleta"
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
      <Button type="submit" size={compact ? "md" : "lg"} className="w-full">
        <SearchIcon />
        {compact ? "Actualizar búsqueda" : "Buscar cocheras"}
      </Button>
    </Form>
  );
}
