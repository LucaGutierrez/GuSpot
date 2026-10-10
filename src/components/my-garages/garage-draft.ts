import type { LatLng } from "@/lib/types";
import type { GarageInput, OwnerGarage } from "@/lib/data/types";
import {
  cityOf,
  emptyDraft,
  newRule,
  parsePesos,
  toRules,
  validateStep,
  type Draft,
  type Errors,
} from "@/components/owner/publish-wizard/draft";

// Formulario de un garage real: el mismo borrador del asistente de la demo
// (para reutilizar sus pasos) más el punto exacto elegido en el mapa.

export interface GarageDraft extends Draft {
  exactLocation: LatLng | null;
}

export function emptyGarageDraft(): GarageDraft {
  // Por ahora solo CABA.
  return { ...emptyDraft(), city: "CABA", exactLocation: null };
}

export function draftFromGarage(g: OwnerGarage): GarageDraft {
  const hasLocation = g.exactLocation.lat !== 0 || g.exactLocation.lng !== 0;
  return {
    title: g.title,
    description: g.description,
    type: g.type,
    maxVehicle: g.maxVehicle,
    city: g.city,
    otherCity: "",
    neighborhood: g.neighborhood,
    approxLocation: g.approxLocation,
    exactAddress: g.address,
    exactLocation: hasLocation ? g.exactLocation : null,
    features: [...g.features],
    conditions: g.accessConditions.length ? [...g.accessConditions] : [""],
    photo: null,
    hourly: g.hourlyPrice ? String(g.hourlyPrice / 100) : "",
    daily: g.dailyPrice ? String(g.dailyPrice / 100) : "",
    minHours: String(g.minHours),
    rules: g.availability.length
      ? g.availability.map((r) =>
          newRule({
            days: [...r.days],
            from: r.from,
            to: r.to === "24:00" ? "00:00" : r.to,
            allDay: r.from === "00:00" && r.to === "24:00",
          }),
        )
      : [newRule()],
  };
}

/** Pasos del asistente que se validan (0 básicos, 1 ubicación, 2 características, 4 precio, 5 disponibilidad). */
const STEPS_TO_CHECK = [0, 1, 2, 4, 5];

export function validateGarageDraft(d: GarageDraft): Errors {
  // Las condiciones vacías se descartan al guardar (toGarageInput), no son un error.
  const clean = { ...d, conditions: d.conditions.filter((c) => c.trim()) };
  const errors: Errors = Object.assign({}, ...STEPS_TO_CHECK.map((s) => validateStep(s, clean)));
  if (!d.exactLocation) errors.exactLocation = "Marcá en el mapa dónde está el garage.";
  return errors;
}

/** Solo llamar con un borrador válido. */
export function toGarageInput(d: GarageDraft): GarageInput {
  const daily = d.daily.trim() ? parsePesos(d.daily) : NaN;
  return {
    title: d.title.trim(),
    description: d.description.trim(),
    city: cityOf(d),
    neighborhood: d.neighborhood.trim(),
    approxLocation: d.approxLocation.trim(),
    address: d.exactAddress.trim(),
    exactLocation: d.exactLocation!,
    type: d.type as GarageInput["type"],
    maxVehicle: d.maxVehicle as GarageInput["maxVehicle"],
    features: d.features,
    hourlyPrice: parsePesos(d.hourly) * 100,
    dailyPrice: daily > 0 ? daily * 100 : undefined,
    minHours: Number(d.minHours),
    availability: toRules(d.rules),
    accessConditions: d.conditions.map((c) => c.trim()).filter(Boolean),
  };
}
