// Tipos de dominio de GuSpot. En la demo se llenan con datos de ejemplo
// (src/lib/demo-data.ts); más adelante los mismos tipos describirán lo que
// devuelve la base de datos.

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
  | "sin_escalones";

/** Ilustración usada como "foto de muestra" (no son fotos reales). */
export type PhotoVariant = "garage" | "cochera" | "patio" | "subsuelo" | "porton";

export interface DemoPhoto {
  variant: PhotoVariant;
  caption: string;
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

export type ListingStatus = "publicado" | "pausado" | "borrador";

export interface Space {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  city: string;
  neighborhood: string;
  /** Referencia aproximada visible antes de reservar (nunca la dirección exacta). */
  approxLocation: string;
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
