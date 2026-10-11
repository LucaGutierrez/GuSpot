// CONTRATO de acceso a datos reales (Supabase). Lo mantiene el coordinador.
// Implementación: src/lib/data/garages.ts. Lo usan las pantallas de búsqueda
// y las de "Mis garages". Si hace falta cambiarlo, se acuerda antes.
//
// La misma estructura (tablas + reglas RLS en supabase/migrations) es la que
// usará la futura app móvil con el SDK oficial de Supabase.

import type {
  AvailabilityRule,
  Centavos,
  Feature,
  LatLng,
  ListingStatus,
  Space,
  SpaceType,
  VehicleSize,
} from "../types";

/** Datos que carga o edita el propietario. */
export interface GarageInput {
  title: string;
  description: string;
  city: string;
  neighborhood: string;
  /** Referencia pública ("a 3 cuadras de Plaza Serrano"). */
  approxLocation: string;
  /** PRIVADO: dirección exacta. Solo la ve el propietario (y, en una etapa futura, el conductor con reserva confirmada y pagada). */
  address: string;
  /** PRIVADO: punto exacto elegido en el mapa. Desde 2026-10-10 el punto público es igual al exacto (lo copia la base). */
  exactLocation: LatLng;
  /** PRIVADO: cómo entrar y dónde estacionar ("portón negro, 2º subsuelo, cochera 14"). Mismas reglas que `address`. */
  arrivalInstructions: string;
  type: SpaceType;
  maxVehicle: VehicleSize;
  features: Feature[];
  hourlyPrice: Centavos;
  dailyPrice?: Centavos;
  minHours: number;
  availability: AvailabilityRule[];
  accessConditions: string[];
}

export interface GaragePhoto {
  /** Ruta dentro del bucket (para borrar). */
  path: string;
  /** URL pública para mostrar. */
  url: string;
  position: number;
}

/** Garage del propio propietario: incluye los datos privados. */
export interface OwnerGarage extends GarageInput {
  id: string;
  status: ListingStatus;
  /** Punto público calculado por la base (null hasta que haya ubicación). */
  publicLocation: LatLng | null;
  photos: GaragePhoto[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** Error con mensaje listo para mostrar (en español). */
export class DataError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_configured"
      | "not_signed_in"
      | "not_found"
      | "validation"
      | "forbidden"
      | "network"
      | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "DataError";
  }
}

/**
 * Funciones que exporta src/lib/data/garages.ts. Todas lanzan `DataError`
 * ante un problema. Requieren sesión salvo las de lectura pública.
 */
export interface GaragesApi {
  /** Garages PUBLICADOS por cualquier propietario, como `Space` con `source: "real"` y `coords` = punto público. Sin datos privados. */
  listPublishedGarages(): Promise<Space[]>;
  /** Uno publicado (o null si no existe o no está publicado). */
  getPublishedGarage(id: string): Promise<Space | null>;

  listMyGarages(): Promise<OwnerGarage[]>;
  getMyGarage(id: string): Promise<OwnerGarage | null>;
  /** Crea en estado "borrador". */
  createGarage(input: GarageInput): Promise<{ id: string }>;
  updateGarage(id: string, input: GarageInput): Promise<void>;
  /** Publicar exige ubicación, al menos una franja de disponibilidad y precio > 0 (lo valida también la base). */
  setGarageStatus(id: string, status: ListingStatus): Promise<void>;
  deleteGarage(id: string): Promise<void>;

  /** Máx. 6 fotos por garage, JPG/PNG/WebP, hasta 5 MB cada una. */
  uploadGaragePhoto(garageId: string, file: File): Promise<GaragePhoto>;
  removeGaragePhoto(garageId: string, path: string): Promise<void>;
}

export const PHOTO_LIMITS = {
  maxPerGarage: 6,
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;
