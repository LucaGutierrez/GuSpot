import type {
  AccessType,
  BookingStatus,
  Centavos,
  Feature,
  LocalDateTime,
  PaymentMethod,
  PaymentStatus,
  SpaceType,
  VehicleSize,
} from "./types";
import { toMs } from "./datetime";

const ars = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatARS(amount: Centavos): string {
  return ars.format(amount / 100);
}

// Los LocalDateTime se tratan como UTC internamente (ver datetime.ts), por eso
// se formatean con timeZone "UTC": muestra exactamente la hora de pared.
const dateFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const timeFmt = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function formatDate(value: LocalDateTime): string {
  return dateFmt.format(new Date(toMs(value)));
}

export function formatTime(value: LocalDateTime): string {
  return timeFmt.format(new Date(toMs(value)));
}

export function formatDateTime(value: LocalDateTime): string {
  return `${formatDate(value)}, ${formatTime(value)} h`;
}

export function formatRange(start: LocalDateTime, end: LocalDateTime): string {
  if (start.slice(0, 10) === end.slice(0, 10)) {
    return `${formatDate(start)}, ${formatTime(start)} a ${formatTime(end)} h`;
  }
  return `${formatDateTime(start)} → ${formatDateTime(end)}`;
}

export const SPACE_TYPE_LABEL: Record<SpaceType, string> = {
  cubierta: "Cochera cubierta",
  semicubierta: "Cochera semicubierta",
  descubierta: "Espacio descubierto",
};

export const VEHICLE_LABEL: Record<VehicleSize, string> = {
  moto: "Moto",
  auto_chico: "Auto chico",
  auto_mediano: "Auto mediano",
  camioneta: "Camioneta / SUV",
};

export const FEATURE_LABEL: Record<Feature, string> = {
  acceso_24h: "Acceso 24 h",
  porton_electrico: "Portón eléctrico",
  camaras: "Cámaras",
  vigilancia: "Vigilancia",
  iluminacion: "Iluminado",
  techada: "Techada",
  apta_camioneta: "Apta camioneta",
  carga_electrica: "Carga eléctrica",
  sin_escalones: "Acceso sin escalones",
  valet: "Valet",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  mercado_pago: "Mercado Pago",
  transferencia: "Transferencia",
};

export const ACCESS_TYPE_LABEL: Record<Exclude<AccessType, "">, string> = {
  nivel: "A nivel de calle",
  rampa: "Rampa",
  montacargas: "Montacargas",
  mixto: "Rampa y montacargas",
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  solicitada: "Solicitada",
  pendiente_pago: "Esperando el pago",
  confirmada: "Confirmada",
  rechazada: "Rechazada",
  expirada: "Expirada",
  cancelada: "Cancelada",
  completada: "Completada",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  no_disponible: "Sin pago (prueba)",
  pendiente: "Pago pendiente",
  aprobado: "Pago aprobado",
  rechazado: "Pago rechazado",
  reembolsado: "Pago reembolsado",
};
