// Tipos de dominio de GuSpot (lo que la página muestra a partir de la base de datos).

/** Montos en centavos de ARS (enteros) para evitar errores de redondeo. */
export type Centavos = number;

/**
 * Fecha y hora "de pared" en Argentina, sin zona: "YYYY-MM-DDTHH:mm".
 * Toda la plataforma opera en America/Argentina/Buenos_Aires.
 */
export type LocalDateTime = string;

export type SpaceType = "cubierta" | "semicubierta" | "descubierta";

export type VehicleSize = "moto" | "auto_chico" | "auto_mediano" | "camioneta";

export type Feature =
  | "acceso_24h"
  | "porton_electrico"
  | "camaras"
  | "vigilancia"
  | "iluminacion"
  | "techada"
  | "apta_camioneta"
  | "carga_electrica"
  | "sin_escalones"
  | "valet";

/** Estado de disponibilidad que informa un garaje comercial. */
export type AvailabilityState = "disponible" | "pocos" | "sin_lugar" | "cerrado";

export type PaymentMethod = "efectivo" | "debito" | "credito" | "mercado_pago" | "transferencia";

export type AccessType = "" | "nivel" | "rampa" | "montacargas" | "mixto";

/** Datos propios de un garaje comercial (lanzamiento). */
export interface CommercialInfo {
  /** Capacidad total, si se conoce. */
  capacity: number | null;
  /** Lugares libres informados por el operador (null = no informa número). */
  availableSpots: number | null;
  state: AvailabilityState;
  /** Última actualización de la disponibilidad (ISO). */
  updatedAt: string | null;
  /** El operador puede pausar la recepción de conductores. */
  acceptingDrivers: boolean;
  /** Lugares que se pueden reservar a la vez desde GuSpot (0 = sin reservas). */
  reservableSpots: number;
  contactPhone: string;
  paymentMethods: PaymentMethod[];
  /** Se paga en el garaje (no en GuSpot). */
  payAtGarage: boolean;
  /** El garaje conectó Mercado Pago: puede cobrar reservas online. */
  onlinePayments: boolean;
  maxHeightCm: number | null;
  accessType: AccessType;
}

/** Ilustración usada como "foto de muestra" (no son fotos reales). */
export type PhotoVariant = "garage" | "cochera" | "patio" | "subsuelo" | "porton";

export interface DemoPhoto {
  /** Ilustración a mostrar si no hay `url` (o mientras carga). */
  variant: PhotoVariant;
  caption: string;
  /** Foto real subida por el propietario (solo garajes reales). */
  url?: string;
}

/** Franja semanal de disponibilidad. day: 0 = domingo … 6 = sábado. */
export interface AvailabilityRule {
  days: number[];
  from: string; // "HH:mm"
  to: string; // "HH:mm"; "24:00" = hasta medianoche
}

export interface Interval {
  start: LocalDateTime;
  end: LocalDateTime;
}

/** Coordenadas WGS84. */
export interface LatLng {
  lat: number;
  lng: number;
}

export type ListingStatus = "publicado" | "pausado" | "borrador";

/**
 * Origen del garaje. Los de ejemplo ("demo") y los publicados de verdad
 * ("real") NUNCA se muestran mezclados ni pueden reservarse igual.
 */
export type SpaceSource = "demo" | "real";

export interface Space {
  id: string;
  source: SpaceSource;
  /** Garaje comercial o cochera particular (garajes reales). */
  kind?: "comercial" | "particular";
  /** Solo garajes comerciales reales. */
  commercial?: CommercialInfo;
  ownerId: string;
  title: string;
  description: string;
  city: string;
  neighborhood: string;
  /** Referencia aproximada visible antes de reservar (nunca la dirección exacta). */
  approxLocation: string;
  /**
   * Punto aproximado para el mapa (nunca la dirección exacta). En la demo son
   * ubicaciones de ejemplo dentro del barrio, no corresponden a cocheras reales.
   */
  coords: LatLng;
  type: SpaceType;
  maxVehicle: VehicleSize;
  features: Feature[];
  photos: DemoPhoto[];
  hourlyPrice: Centavos;
  dailyPrice?: Centavos;
  minHours: number;
  availability: AvailabilityRule[];
  /** Intervalos ya ocupados o bloqueados (datos de ejemplo). */
  busy: Interval[];
  accessConditions: string[];
  status: ListingStatus;
  rating?: number;
}

/** Estado de la reserva: independiente del estado del pago. */
export type BookingStatus =
  | "solicitada"
  | "pendiente_pago"
  | "confirmada"
  | "rechazada"
  | "expirada"
  | "cancelada"
  | "completada";

/**
 * Estado del pago. En la demo siempre es "no_disponible": no hay
 * integración de pagos y nunca se debe mostrar un pago como realizado.
 */
export type PaymentStatus =
  | "no_disponible"
  | "pendiente"
  | "aprobado"
  | "rechazado"
  | "reembolsado";

export interface Booking {
  id: string;
  spaceId: string;
  driverName: string;
  start: LocalDateTime;
  end: LocalDateTime;
  /** Precio calculado al solicitar; no cambia si después cambia la tarifa. */
  totalPrice: Centavos;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  vehicle?: string;
  createdAt: LocalDateTime;
}

export interface Owner {
  id: string;
  displayName: string;
  memberSince: string;
}
