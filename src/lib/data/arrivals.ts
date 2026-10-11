"use client";

// "Voy a este": avisos de llegada a garages comerciales. No reservan lugar.
// Reglas en supabase/migrations/20261011140000_commercial_garages.sql
// (notify_arrival, update_arrival, arrival_access). El panel del garage los
// recibe en tiempo real (Supabase Realtime, respeta las reglas de acceso).

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import { DataError, type ArrivalNotice, type ArrivalStatus, type BookingAccess } from "./types";
import { avatarUrl } from "./profile";

function db(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) throw new DataError("Los avisos no están disponibles en esta versión (modo demo).", "not_configured");
  return supabase;
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new DataError("Tenés que ingresar a tu cuenta.", "not_signed_in");
  return id;
}

const MESSAGES: Record<string, string> = {
  driver_profile_incomplete: "Antes de avisar, completá tus datos y tu verificación (identidad, licencia y vehículo).",
  not_found: "Este garage ya no está publicado.",
  own_garage: "Es tu propio garage.",
  not_accepting: "Este garage no está recibiendo conductores en este momento.",
  vehicle_not_found: "Elegí uno de tus vehículos.",
  insurance_missing: "Ese vehículo no tiene el seguro vigente cargado. Completalo en Tu cuenta → Mis vehículos.",
  forbidden: "No podés hacer esto.",
  closed_notice: "Este aviso ya terminó.",
};

function toDataError(error: { message?: string; code?: string }): DataError {
  const m = error.message ?? "";
  for (const [key, text] of Object.entries(MESSAGES)) if (m.includes(key)) return new DataError(text, "validation");
  if (/fetch|network/i.test(m)) return new DataError("No pudimos conectarnos. Revisá tu conexión.", "network");
  return new DataError("No pudimos completar la operación. Probá de nuevo.");
}

interface Row {
  id: string;
  garage_id: string;
  driver_name: string;
  car: string;
  plate: string;
  car_insurance: string;
  driver_avatar: string;
  eta_minutes: number;
  status: ArrivalStatus;
  created_at: string;
  updated_at: string;
}

const COLUMNS = "id, garage_id, driver_name, car, plate, car_insurance, driver_avatar, eta_minutes, status, created_at, updated_at";

function toNotice(r: Row): ArrivalNotice {
  return {
    id: r.id,
    garageId: r.garage_id,
    driverName: r.driver_name,
    car: r.car,
    plate: r.plate,
    carInsurance: r.car_insurance,
    driverAvatarUrl: avatarUrl(r.driver_avatar),
    etaMinutes: r.eta_minutes,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Avisa al garage. Devuelve el id del aviso. */
export async function notifyArrival(garageId: string, etaMinutes: number, vehicleId: string): Promise<string> {
  const supabase = db();
  await requireUserId(supabase);
  const { data, error } = await supabase.rpc("notify_arrival", {
    p_garage_id: garageId,
    p_eta_minutes: etaMinutes,
    p_vehicle_id: vehicleId,
  });
  if (error) throw toDataError(error);
  return data as string;
}

export async function setArrivalStatus(id: string, status: ArrivalStatus): Promise<void> {
  const supabase = db();
  await requireUserId(supabase);
  const { error } = await supabase.rpc("update_arrival", { p_id: id, p_status: status });
  if (error) throw toDataError(error);
}

export async function getArrival(id: string): Promise<ArrivalNotice | null> {
  const supabase = db();
  await requireUserId(supabase);
  const { data, error } = await supabase.from("arrival_notices").select(COLUMNS).eq("id", id).maybeSingle<Row>();
  if (error) {
    if (error.code === "22P02") return null;
    throw toDataError(error);
  }
  return data ? toNotice(data) : null;
}

/** Dirección e indicaciones para quien avisó (aviso activo, últimas 3 h). */
export async function getArrivalAccess(id: string): Promise<BookingAccess | null> {
  const supabase = db();
  await requireUserId(supabase);
  const { data, error } = await supabase.rpc("arrival_access", { p_id: id });
  if (error) throw toDataError(error);
  const row = (data as { address: string; arrival_instructions: string; exact_lat: number; exact_lng: number }[])[0];
  return row
    ? { address: row.address, arrivalInstructions: row.arrival_instructions, location: { lat: row.exact_lat, lng: row.exact_lng } }
    : null;
}

/** Avisos recientes de un garage propio (últimas 12 h). */
export async function listGarageArrivals(garageId: string): Promise<ArrivalNotice[]> {
  const supabase = db();
  await requireUserId(supabase);
  const since = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("arrival_notices")
    .select(COLUMNS)
    .eq("garage_id", garageId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  if (error) throw toDataError(error);
  return data.map(toNotice);
}

/** Escucha cambios en tiempo real. Devuelve la función para dejar de escuchar. */
export function subscribeArrivals(filter: { garageId?: string; id?: string }, onChange: () => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const f = filter.id ? `id=eq.${filter.id}` : `garage_id=eq.${filter.garageId}`;
  const channel: RealtimeChannel = supabase
    .channel(`arrivals:${f}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "arrival_notices", filter: f }, () => onChange())
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
