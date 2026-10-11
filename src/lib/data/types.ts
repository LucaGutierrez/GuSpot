// CONTRATO de acceso a datos reales (Supabase). Lo mantiene el coordinador.
// Implementación: src/lib/data/garages.ts. Lo usan las pantallas de búsqueda
// y las de "Mis garages". Si hace falta cambiarlo, se acuerda antes.
//
// La misma estructura (tablas + reglas RLS en supabase/migrations) es la que
// usará la futura app móvil con el SDK oficial de Supabase.

import type {
  AccessType,
  AvailabilityRule,
  CommercialInfo,
  BookingStatus,
  Centavos,
  Feature,
  LatLng,
  ListingStatus,
  LocalDateTime,
  PaymentMethod,
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
  /** Garage comercial (lanzamiento) o cochera particular (etapa 2). */
  kind: "comercial" | "particular";
  /** Capacidad total (garages comerciales). */
  capacity: number | null;
  /** Lugares que se pueden reservar a la vez desde GuSpot (0 = sin reservas). */
  reservableSpots: number;
  /** Teléfono del garage, para que el conductor pueda llamar. */
  contactPhone: string;
  paymentMethods: PaymentMethod[];
  payAtGarage: boolean;
  maxHeightCm: number | null;
  accessType: AccessType;
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
  /** Disponibilidad en vivo (la maneja el panel del operador). */
  live: CommercialInfo;
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

/** Reserva real. Se confirma sola cuando Mercado Pago aprueba el pago. */
export interface RealBooking {
  id: string;
  garageId: string;
  /** Copia al reservar (para el historial). */
  garageTitle: string;
  garageNeighborhood: string;
  driverName: string;
  start: LocalDateTime;
  end: LocalDateTime;
  status: Extract<BookingStatus, "pendiente_pago" | "confirmada" | "cancelada">;
  /** "no_disponible" = reserva de prueba hecha antes de los pagos. */
  paymentStatus: PaymentStatus;
  vehicle: VehicleSize;
  plate: string;
  /** "Fiat Cronos Gris" (copia del vehículo al reservar). */
  car: string;
  /** "La Caja · póliza 123 · vence 01/01/2027" (copia al reservar). */
  carInsurance: string;
  /** Foto de perfil del conductor (URL pública o ""). */
  driverAvatarUrl: string;
  hours: number;
  /** Tarifa del garage. */
  total: Centavos;
  /** Cargo de servicio de GuSpot (lo paga el conductor). */
  serviceFee: Centavos;
  /** Hasta cuándo se guarda el lugar esperando el pago (ISO). */
  holdUntil: string | null;
  paidAt: string | null;
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
  /** Seguro del vehículo: compañía, número de póliza y vencimiento ("YYYY-MM-DD" o ""). */
  insurer: string;
  insurancePolicy: string;
  insuranceExpiry: string;
}

/** Lo que falta para reservar ("conductor") o publicar ("propietario"). */
export type Requirement =
  | "datos_personales"
  | "identidad"
  | "telefono"
  | "dni_fotos"
  | "selfie"
  | "licencia"
  | "licencia_vencida"
  | "vehiculo"
  | "seguro"
  | "licencia_dni";

// --- Avisos de llegada: "Voy a este" (src/lib/data/arrivals.ts) -------------

export type ArrivalStatus = "en_camino" | "recibido" | "llego" | "cancelado" | "no_hay_lugar";

/** Aviso de un conductor que va a un garage. NO reserva lugar. */
export interface ArrivalNotice {
  id: string;
  garageId: string;
  driverName: string;
  car: string;
  plate: string;
  /** Seguro del vehículo (copia al avisar). */
  carInsurance: string;
  /** Foto de perfil del conductor (URL pública o ""). */
  driverAvatarUrl: string;
  etaMinutes: number;
  status: ArrivalStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
