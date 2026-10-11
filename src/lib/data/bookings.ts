"use client";

// Reservas reales sobre Supabase. Las reglas (horario, superposición, precio)
// las aplica la base en create_booking / cancel_booking
// (supabase/migrations/20261010140000_bookings.sql); acá solo se llaman y se
// traducen los errores a mensajes en español.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Interval, LocalDateTime, VehicleSize } from "../types";
import { getSupabase } from "../supabase/client";
import { DataError, type BookingAccess, type RealBooking } from "./types";

function db(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) throw new DataError("Las reservas no están disponibles en esta versión (modo demo).", "not_configured");
  return supabase;
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new DataError("Tenés que ingresar a tu cuenta para reservar.", "not_signed_in");
  return id;
}

const MESSAGES: Record<string, string> = {
  not_signed_in: "Tenés que ingresar a tu cuenta para reservar.",
  not_found: "Este garage ya no está publicado.",
  own_garage: "No podés reservar tu propio garage.",
  past: "El horario de entrada ya pasó. Elegí uno futuro.",
  min_hours: "El período es más corto que el mínimo de horas del garage.",
  too_long: "Podés reservar hasta 30 días seguidos.",
  closed: "El garage no está disponible en todo ese horario.",
  busy: "Alguien reservó ese horario recién. Elegí otro.",
  not_active: "Esta reserva ya estaba cancelada.",
  started: "La reserva ya empezó: no se puede cancelar desde la app.",
  driver_profile_incomplete: "Antes de reservar completá tu verificación (datos, DNI, selfie, licencia y vehículo).",
  vehicle_not_found: "Elegí uno de tus vehículos.",
  vehicle_too_big: "Ese vehículo no entra en este garage.",
};

function toDataError(error: { message?: string; code?: string }): DataError {
  const message = error.message ?? "";
  for (const [key, text] of Object.entries(MESSAGES)) {
    if (message === key || message.includes(key))
      return new DataError(text, key === "not_signed_in" ? "not_signed_in" : "validation");
  }
  if (/fetch|network/i.test(message)) return new DataError("No pudimos conectarnos. Revisá tu conexión.", "network");
  if (error.code === "42501") return new DataError("No tenés permiso para hacer esto.", "forbidden");
  return new DataError("No pudimos completar la operación. Probá de nuevo en unos minutos.");
}

/** "2026-10-11T10:00:00" → "2026-10-11T10:00" */
const local = (ts: string): LocalDateTime => ts.slice(0, 16) as LocalDateTime;

interface BookingRow {
  id: string;
  garage_id: string;
  driver_id: string;
  driver_name: string;
  garage_title: string;
  garage_neighborhood: string;
  start_at: string;
  end_at: string;
  status: RealBooking["status"];
  payment_status: RealBooking["paymentStatus"];
  vehicle: VehicleSize;
  plate: string;
  car_brand: string;
  car_model: string;
  car_color: string;
  hours: number;
  total_price: number;
  created_at: string;
}

const COLUMNS =
  "id, garage_id, driver_id, driver_name, garage_title, garage_neighborhood, start_at, end_at, status, " +
  "payment_status, vehicle, plate, car_brand, car_model, car_color, hours, total_price, created_at";

function toBooking(row: BookingRow, me: string): RealBooking {
  return {
    id: row.id,
    garageId: row.garage_id,
    garageTitle: row.garage_title,
    garageNeighborhood: row.garage_neighborhood,
    driverName: row.driver_name,
    start: local(row.start_at),
    end: local(row.end_at),
    status: row.status,
    paymentStatus: row.payment_status,
    vehicle: row.vehicle,
    plate: row.plate,
    car: [row.car_brand, row.car_model, row.car_color].filter(Boolean).join(" "),
    hours: row.hours,
    total: row.total_price,
    createdAt: row.created_at,
    role: row.driver_id === me ? "driver" : "owner",
  };
}

/** Reserva con confirmación automática. Devuelve el id. */
export async function createBooking(input: {
  garageId: string;
  start: LocalDateTime;
  end: LocalDateTime;
  vehicleId: string;
}): Promise<string> {
  const supabase = db();
  await requireUserId(supabase);
  const { data, error } = await supabase.rpc("create_booking", {
    p_garage_id: input.garageId,
    p_start: input.start,
    p_end: input.end,
    p_vehicle_id: input.vehicleId,
  });
  if (error) throw toDataError(error);
  return data as string;
}

export async function cancelBooking(id: string): Promise<void> {
  const supabase = db();
  await requireUserId(supabase);
  const { error } = await supabase.rpc("cancel_booking", { p_booking_id: id });
  if (error) throw toDataError(error);
}

/** Reservas que hice como conductor (más nuevas primero). */
export async function listMyBookings(): Promise<RealBooking[]> {
  const supabase = db();
  const me = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("bookings")
    .select(COLUMNS)
    .eq("driver_id", me)
    .order("start_at", { ascending: false })
    .returns<BookingRow[]>();
  if (error) throw toDataError(error);
  return data.map((r) => toBooking(r, me));
}

/** Reservas de mis garages (como dueño). */
export async function listOwnerBookings(): Promise<RealBooking[]> {
  const supabase = db();
  const me = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("bookings")
    .select(COLUMNS)
    .neq("driver_id", me)
    .order("start_at", { ascending: true })
    .returns<BookingRow[]>();
  if (error) throw toDataError(error);
  return data.map((r) => toBooking(r, me));
}

export async function getBooking(id: string): Promise<RealBooking | null> {
  const supabase = db();
  const me = await requireUserId(supabase);
  const { data, error } = await supabase.from("bookings").select(COLUMNS).eq("id", id).maybeSingle<BookingRow>();
  if (error) {
    if (error.code === "22P02") return null;
    throw toDataError(error);
  }
  return data ? toBooking(data, me) : null;
}

/** Dirección e indicaciones: solo para el conductor de una reserva confirmada. */
export async function getBookingAccess(id: string): Promise<BookingAccess | null> {
  const supabase = db();
  await requireUserId(supabase);
  const { data, error } = await supabase.rpc("booking_access", { p_booking_id: id });
  if (error) throw toDataError(error);
  const row = (data as { address: string; arrival_instructions: string; exact_lat: number; exact_lng: number }[])[0];
  return row
    ? { address: row.address, arrivalInstructions: row.arrival_instructions, location: { lat: row.exact_lat, lng: row.exact_lng } }
    : null;
}

/** Horarios ocupados de los garages publicados (para la búsqueda). Nunca lanza: sin datos, sin ocupación. */
export async function busyByGarage(): Promise<Map<string, Interval[]>> {
  const map = new Map<string, Interval[]>();
  const supabase = getSupabase();
  if (!supabase) return map;
  const { data, error } = await supabase.rpc("busy_periods");
  if (error || !data) return map;
  for (const r of data as { garage_id: string; start_at: string; end_at: string }[]) {
    const list = map.get(r.garage_id) ?? [];
    list.push({ start: local(r.start_at), end: local(r.end_at) });
    map.set(r.garage_id, list);
  }
  return map;
}
