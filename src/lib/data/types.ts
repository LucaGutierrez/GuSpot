// CONTRATO de acceso a datos reales (Supabase). Lo mantiene el coordinador.
// Implementación: src/lib/data/garages.ts. Lo usan las pantallas de búsqueda
// y las de "Mis garages". Si hace falta cambiarlo, se acuerda antes.
//
// La misma estructura (tablas + reglas RLS en supabase/migrations) es la que
// usará la futura app móvil con el SDK oficial de Supabase.

import type {
  AvailabilityRule,
  BookingStatus,
  Centavos,
  Feature,
  LatLng,
  ListingStatus,
  LocalDateTime,
  PaymentStatus,
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

// --- Reservas reales (src/lib/data/bookings.ts) -----------------------------

/** Reserva real. Confirmación automática; el pago se integra más adelante. */
export interface RealBooking {
  id: string;
  garageId: string;
  /** Copia al reservar (para el historial). */
  garageTitle: string;
  garageNeighborhood: string;
  driverName: string;
  start: LocalDateTime;
  end: LocalDateTime;
  status: Extract<BookingStatus, "confirmada" | "cancelada">;
  /** Hasta integrar Mercado Pago es siempre "no_disponible". */
  paymentStatus: PaymentStatus;
  vehicle: VehicleSize;
  plate: string;
  /** "Fiat Cronos Gris" (copia del vehículo al reservar). */
  car: string;
  hours: number;
  total: Centavos;
  createdAt: string; // ISO
  /** Quién la mira: conductor o dueño del garage. */
  role: "driver" | "owner";
}

/** Lo que ve el CONDUCTOR de una reserva confirmada. */
export interface BookingAccess {
  address: string;
  arrivalInstructions: string;
  location: LatLng;
}

// --- Perfil, identidad y vehículos (src/lib/data/profile.ts) ----------------

export interface Profile {
  firstName: string;
  lastName: string;
  /** Solo números, 7 u 8 dígitos. */
  dni: string;
  birthDate: string; // YYYY-MM-DD o ""
  phone: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: string; // YYYY-MM-DD o ""
  /** Lo cambia solo el sistema de verificación. */
  identityStatus: "sin_verificar" | "en_revision" | "verificada" | "rechazada";
  phoneVerified: boolean;
}

/** Fotos privadas (bucket identity-docs). */
export type IdentityDoc = "dni-frente" | "dni-dorso" | "selfie" | "licencia-frente" | "licencia-dorso";

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  color: string;
  /** Mayúsculas y números, sin espacios (AB123CD / ABC123). */
  plate: string;
  size: VehicleSize;
}

/** Lo que falta para reservar ("conductor") o publicar ("propietario"). */
export type Requirement =
  | "datos_personales"
  | "identidad"
  | "dni_fotos"
  | "selfie"
  | "licencia"
  | "licencia_vencida"
  | "vehiculo";
