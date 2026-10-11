import type { AvailabilityRule, Feature, PhotoVariant, SpaceType, VehicleSize } from "@/lib/types";

// Estado del asistente de publicación (solo en memoria) y sus validaciones.

export const OTHER_CITY = "__otra__";

export interface RuleDraft {
  key: number;
  days: number[];
  from: string;
  /** "00:00" en el campo equivale a "hasta medianoche" (24:00). */
  to: string;
  allDay: boolean;
}

export interface Draft {
  title: string;
  description: string;
  type: SpaceType | "";
  maxVehicle: VehicleSize | "";
  city: string;
  otherCity: string;
  neighborhood: string;
  approxLocation: string;
  exactAddress: string;
  features: Feature[];
  conditions: string[];
  photo: PhotoVariant | null;
  hourly: string;
  daily: string;
  minHours: string;
  rules: RuleDraft[];
}

export type Errors = Record<string, string>;

export const STEPS = [
  "Datos básicos",
  "Ubicación",
  "Características",
  "Fotos",
  "Precio",
  "Disponibilidad",
  "Revisión",
] as const;

let ruleKey = 0;
export function newRule(partial: Partial<RuleDraft> = {}): RuleDraft {
  ruleKey += 1;
  return { key: ruleKey, days: [1, 2, 3, 4, 5], from: "08:00", to: "20:00", allDay: false, ...partial };
}

export function emptyDraft(): Draft {
  return {
    title: "",
    description: "",
    type: "",
    maxVehicle: "",
    city: "",
    otherCity: "",
    neighborhood: "",
    approxLocation: "",
    exactAddress: "",
    features: [],
    conditions: [""],
    photo: null,
    hourly: "",
    daily: "",
    minHours: "1",
    rules: [newRule()],
  };
}

/** "3.000" → 3000; devuelve NaN si no es un entero positivo. */
export function parsePesos(value: string): number {
  const clean = value.replace(/[.\s$]/g, "");
  if (!/^\d+$/.test(clean)) return NaN;
  return Number(clean);
}

export function cityOf(d: Draft): string {
  return d.city === OTHER_CITY ? d.otherCity.trim() : d.city;
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toRules(rules: RuleDraft[]): AvailabilityRule[] {
  return rules
    .filter((r) => r.days.length > 0)
    .map((r) =>
      r.allDay
        ? { days: [...r.days].sort(), from: "00:00", to: "24:00" }
        : { days: [...r.days].sort(), from: r.from, to: r.to === "00:00" ? "24:00" : r.to },
    );
}

export function validateStep(step: number, d: Draft): Errors {
  const e: Errors = {};
  switch (step) {
    case 0: {
      const t = d.title.trim();
      if (!t) e.title = "Escribí un título para tu espacio.";
      else if (t.length < 10) e.title = "El título es muy corto: usá al menos 10 caracteres.";
      else if (t.length > 80) e.title = "El título es muy largo: usá como máximo 80 caracteres.";
      if (d.description.trim().length < 20)
        e.description = "Contá un poco más: la descripción necesita al menos 20 caracteres.";
      if (!d.type) e.type = "Elegí el tipo de espacio.";
      if (!d.maxVehicle) e.maxVehicle = "Elegí el vehículo más grande que entra.";
      break;
    }
    case 1: {
      if (!d.city) e.city = "Elegí una ciudad.";
      else if (d.city === OTHER_CITY && !d.otherCity.trim()) e.otherCity = "Escribí el nombre de la ciudad.";
      if (!d.neighborhood.trim()) e.neighborhood = "Escribí el barrio.";
      if (d.approxLocation.trim().length < 5)
        e.approxLocation = "Escribí una referencia aproximada (por ejemplo, “a 3 cuadras de la plaza”).";
      if (d.exactAddress.trim().length < 5) e.exactAddress = "Escribí la dirección exacta.";
      break;
    }
    case 2: {
      if (d.conditions.some((c) => !c.trim()))
        e.conditions = "Completá o quitá las condiciones vacías.";
      break;
    }
    case 4: {
      const hourly = parsePesos(d.hourly);
      if (!d.hourly.trim()) e.hourly = "Indicá el precio por hora.";
      else if (!(hourly > 0)) e.hourly = "Usá solo números enteros mayores a 0 (sin centavos).";
      if (d.daily.trim()) {
        const daily = parsePesos(d.daily);
        if (!(daily > 0)) e.daily = "Usá solo números enteros mayores a 0, o dejalo vacío.";
        else if (hourly > 0 && daily < hourly)
          e.daily = "El precio por día no puede ser menor que el precio por hora.";
      }
      const min = Number(d.minHours);
      if (!Number.isInteger(min) || min < 1 || min > 24)
        e.minHours = "El mínimo tiene que ser un número entero entre 1 y 24 horas.";
      break;
    }
    case 5: {
      if (d.rules.length === 0) e.rules = "Agregá al menos una franja horaria.";
      for (const r of d.rules) {
        if (r.days.length === 0) e[`rule-${r.key}-days`] = "Elegí al menos un día.";
        if (!r.allDay) {
          if (!r.from || !r.to) e[`rule-${r.key}-time`] = "Completá el horario de inicio y de fin.";
          else {
            const to = r.to === "00:00" ? 24 * 60 : minutes(r.to);
            if (minutes(r.from) >= to)
              e[`rule-${r.key}-time`] = "El horario de fin tiene que ser posterior al de inicio.";
          }
        }
      }
      break;
    }
  }
  return e;
}
