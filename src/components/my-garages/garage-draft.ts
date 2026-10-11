import type { AccessType, LatLng, PaymentMethod } from "@/lib/types";
import { normalizePhone } from "@/lib/data/profile";
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
  arrivalInstructions: string;
  // Garage comercial
  capacity: string;
  reservableSpots: string;
  contactPhone: string;
  paymentMethods: PaymentMethod[];
  payAtGarage: boolean;
  /** Metros, como lo escribe la persona ("2,10"). */
  maxHeight: string;
  accessType: AccessType;
}

export function emptyGarageDraft(): GarageDraft {
  // Por ahora solo CABA.
  return { ...emptyDraft(), city: "CABA",
    exactLocation: null,
    arrivalInstructions: "",
    capacity: "",
    reservableSpots: "0",
    contactPhone: "",
    paymentMethods: [],
    payAtGarage: true,
    maxHeight: "",
    accessType: "",
  };
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
    arrivalInstructions: g.arrivalInstructions,
    capacity: g.capacity ? String(g.capacity) : "",
    reservableSpots: String(g.reservableSpots),
    contactPhone: g.contactPhone.replace(/^\+54/, ""),
    paymentMethods: [...g.paymentMethods],
    payAtGarage: g.payAtGarage,
    maxHeight: g.maxHeightCm ? (g.maxHeightCm / 100).toFixed(2).replace(".", ",") : "",
    accessType: g.accessType,
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

/** Pasos del asistente que se reutilizan: 2 características, 4 precio, 5 horario. */
const STEPS_TO_CHECK = [2, 4, 5];

export function validateGarageDraft(d: GarageDraft): Errors {
  // Las condiciones vacías se descartan al guardar (toGarageInput), no son un error.
  const clean = { ...d, conditions: d.conditions.filter((c) => c.trim()) };
  const errors: Errors = Object.assign({}, ...STEPS_TO_CHECK.map((s) => validateStep(s, clean)));
  const name = d.title.trim();
  if (name.length < 3 || name.length > 80) errors.title = "Escribí el nombre del establecimiento (3 a 80 caracteres).";
  if (d.description.length > 2000) errors.description = "La descripción puede tener hasta 2000 caracteres.";
  if (!d.type) errors.type = "Elegí el tipo de espacio.";
  if (!d.maxVehicle) errors.maxVehicle = "Elegí el vehículo más grande que entra.";
  if (!d.neighborhood.trim()) errors.neighborhood = "Escribí el barrio.";
  if (d.exactAddress.trim().length < 5) errors.exactAddress = "Escribí la dirección y elegila de la lista.";
  if (!d.exactLocation) errors.exactLocation = "Elegí la dirección del garage de la lista.";
  const cap = Number(d.capacity);
  if (!Number.isInteger(cap) || cap < 1 || cap > 5000) errors.capacity = "Indicá cuántos lugares tiene el garage (número entero).";
  const res = Number(d.reservableSpots || "0");
  if (!Number.isInteger(res) || res < 0) errors.reservableSpots = "Usá un número entero (0 si no querés reservas).";
  else if (Number.isInteger(cap) && res > cap) errors.reservableSpots = "No puede ser mayor que la capacidad.";
  if (d.contactPhone.trim() && normalizePhone(d.contactPhone).replace(/\D/g, "").length < 12)
    errors.contactPhone = "Escribí el teléfono con código de área (ej.: 11 4321 0000).";
  if (d.maxHeight.trim()) {
    const h = Number(d.maxHeight.replace(",", "."));
    if (!(h >= 1.2 && h <= 6)) errors.maxHeight = "Escribí la altura en metros, por ejemplo 2,10.";
  }
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
    arrivalInstructions: d.arrivalInstructions.trim(),
    kind: "comercial",
    capacity: Number(d.capacity),
    reservableSpots: Number(d.reservableSpots || "0"),
    contactPhone: d.contactPhone.trim() ? normalizePhone(d.contactPhone) : "",
    paymentMethods: d.paymentMethods,
    payAtGarage: d.payAtGarage,
    maxHeightCm: d.maxHeight.trim() ? Math.round(Number(d.maxHeight.replace(",", ".")) * 100) : null,
    accessType: d.accessType,
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
