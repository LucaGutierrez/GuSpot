// Implementación de `GaragesApi` (contrato en ./types.ts) sobre Supabase.
// La seguridad la imponen las reglas de supabase/migrations: acá solo se
// valida para dar mensajes claros antes de ir a la base.

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import { GARAGE_PHOTOS_BUCKET } from "../supabase/config";
import type { AvailabilityRule, LatLng, ListingStatus, Space } from "../types";
import {
  DataError,
  PHOTO_LIMITS,
  type GarageInput,
  type GaragePhoto,
  type GaragesApi,
  type OwnerGarage,
} from "./types";

// --- Filas tal como vienen de la base --------------------------------------

interface PhotoRow {
  path: string;
  position: number;
}

interface GarageRow {
  id: string;
  owner_id: string;
  status: ListingStatus;
  title: string;
  description: string;
  city: string;
  neighborhood: string;
  approx_location: string;
  type: Space["type"];
  max_vehicle: Space["maxVehicle"];
  features: Space["features"];
  hourly_price: number;
  daily_price: number | null;
  min_hours: number;
  availability: AvailabilityRule[];
  access_conditions: string[];
  public_lat: number | null;
  public_lng: number | null;
  created_at: string;
  updated_at: string;
  garage_photos?: PhotoRow[];
}

interface PrivateRow {
  address: string;
  exact_lat: number;
  exact_lng: number;
}

type OwnerGarageRow = GarageRow & { garage_private: PrivateRow | null };

const PUBLIC_COLUMNS =
  "id, owner_id, status, title, description, city, neighborhood, approx_location, type, max_vehicle, " +
  "features, hourly_price, daily_price, min_hours, availability, access_conditions, public_lat, public_lng, " +
  "created_at, updated_at, garage_photos(path, position)";

const OWNER_COLUMNS = `${PUBLIC_COLUMNS}, garage_private(address, exact_lat, exact_lng)`;

// --- Utilidades -------------------------------------------------------------

function db(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase)
    throw new DataError("Los garages reales todavía no están disponibles en esta versión (modo demo).", "not_configured");
  return supabase;
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new DataError("Tenés que ingresar a tu cuenta para hacer esto.", "not_signed_in");
  return id;
}

function toDataError(error: Pick<PostgrestError, "code" | "message"> | { message?: string; code?: string }): DataError {
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (message.includes("publish_requirements"))
    return new DataError(
      "Para publicar hacen falta la ubicación en el mapa, al menos una franja de disponibilidad y un precio por hora.",
      "validation",
    );
  if (message.includes("photo_limit"))
    return new DataError(`Podés subir hasta ${PHOTO_LIMITS.maxPerGarage} fotos por garage.`, "validation");
  if (code === "23514" || code === "22P02" || code === "23502")
    return new DataError("Hay datos inválidos. Revisá el formulario.", "validation");
  if (code === "42501" || /row-level security|permission denied/i.test(message))
    return new DataError("No tenés permiso para hacer esto.", "forbidden");
  if (/fetch|network/i.test(message)) return new DataError("No pudimos conectarnos. Revisá tu conexión.", "network");
  return new DataError("No pudimos completar la operación. Probá de nuevo en unos minutos.");
}

function photoUrl(supabase: SupabaseClient, path: string): string {
  return supabase.storage.from(GARAGE_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

function photosOf(supabase: SupabaseClient, row: GarageRow): GaragePhoto[] {
  return [...(row.garage_photos ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ path: p.path, position: p.position, url: photoUrl(supabase, p.path) }));
}

function publicLocation(row: GarageRow): LatLng | null {
  return row.public_lat == null || row.public_lng == null ? null : { lat: row.public_lat, lng: row.public_lng };
}

function toSpace(supabase: SupabaseClient, row: GarageRow): Space | null {
  const coords = publicLocation(row);
  if (!coords) return null;
  return {
    id: row.id,
    source: "real",
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    city: row.city,
    neighborhood: row.neighborhood,
    approxLocation: row.approx_location,
    coords,
    type: row.type,
    maxVehicle: row.max_vehicle,
    features: row.features,
    photos: photosOf(supabase, row).map((p, i) => ({
      variant: "garage",
      caption: `Foto ${i + 1} de ${row.title}`,
      url: p.url,
    })),
    hourlyPrice: row.hourly_price,
    dailyPrice: row.daily_price ?? undefined,
    minHours: row.min_hours,
    availability: row.availability,
    // Sin reservas reales en esta etapa.
    busy: [],
    accessConditions: row.access_conditions,
    status: row.status,
  };
}

function toOwnerGarage(supabase: SupabaseClient, row: OwnerGarageRow): OwnerGarage {
  const priv = row.garage_private;
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    description: row.description,
    city: row.city,
    neighborhood: row.neighborhood,
    approxLocation: row.approx_location,
    address: priv?.address ?? "",
    // Sin fila privada (alta interrumpida): 0,0 indica "sin ubicación"; publicLocation es null.
    exactLocation: priv ? { lat: priv.exact_lat, lng: priv.exact_lng } : { lat: 0, lng: 0 },
    type: row.type,
    maxVehicle: row.max_vehicle,
    features: row.features,
    hourlyPrice: row.hourly_price,
    dailyPrice: row.daily_price ?? undefined,
    minHours: row.min_hours,
    availability: row.availability,
    accessConditions: row.access_conditions,
    publicLocation: publicLocation(row),
    photos: photosOf(supabase, row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

/** Validación previa (mensajes en español). Devuelve null si está todo bien. */
export function validateGarageInput(input: GarageInput): string | null {
  if (input.title.trim().length < 3 || input.title.trim().length > 80) return "El título debe tener entre 3 y 80 caracteres.";
  if (input.description.length > 2000) return "La descripción puede tener hasta 2000 caracteres.";
  if (input.city.trim().length < 2) return "Indicá la ciudad.";
  if (input.address.trim().length < 3) return "Indicá la dirección (solo la vas a ver vos).";
  const { lat, lng } = input.exactLocation;
  if (!(lat >= -56 && lat <= -21 && lng >= -74 && lng <= -53)) return "Marcá la ubicación del garage en el mapa.";
  if (!Number.isInteger(input.hourlyPrice) || input.hourlyPrice < 0) return "El precio por hora no es válido.";
  if (input.dailyPrice !== undefined && (!Number.isInteger(input.dailyPrice) || input.dailyPrice <= 0))
    return "El precio por día no es válido.";
  if (!Number.isInteger(input.minHours) || input.minHours < 1 || input.minHours > 24)
    return "La estadía mínima debe ser de 1 a 24 horas.";
  for (const rule of input.availability) {
    if (rule.days.length === 0 || rule.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
      return "Elegí los días de cada franja de disponibilidad.";
    if (!HHMM.test(rule.from) || !HHMM.test(rule.to) || rule.from >= rule.to)
      return "Revisá los horarios de disponibilidad: el inicio tiene que ser anterior al fin.";
  }
  if (input.accessConditions.length > 20) return "Podés cargar hasta 20 condiciones de acceso.";
  return null;
}

function publicFields(input: GarageInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    city: input.city.trim(),
    neighborhood: input.neighborhood.trim(),
    approx_location: input.approxLocation.trim(),
    type: input.type,
    max_vehicle: input.maxVehicle,
    features: input.features,
    hourly_price: input.hourlyPrice,
    daily_price: input.dailyPrice ?? null,
    min_hours: input.minHours,
    availability: input.availability,
    access_conditions: input.accessConditions.map((c) => c.trim()).filter(Boolean),
  };
}

function privateFields(input: GarageInput) {
  return {
    address: input.address.trim(),
    exact_lat: input.exactLocation.lat,
    exact_lng: input.exactLocation.lng,
  };
}

function checkInput(input: GarageInput): void {
  const problem = validateGarageInput(input);
  if (problem) throw new DataError(problem, "validation");
}

// --- API ---------------------------------------------------------------------

export async function listPublishedGarages(): Promise<Space[]> {
  const supabase = db();
  const { data, error } = await supabase
    .from("garages")
    .select(PUBLIC_COLUMNS)
    .eq("status", "publicado")
    .order("created_at", { ascending: false })
    .returns<GarageRow[]>();
  if (error) throw toDataError(error);
  return data.map((row) => toSpace(supabase, row)).filter((s): s is Space => s !== null);
}

export async function getPublishedGarage(id: string): Promise<Space | null> {
  const supabase = db();
  const { data, error } = await supabase
    .from("garages")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .eq("status", "publicado")
    .maybeSingle<GarageRow>();
  if (error) {
    if (error.code === "22P02") return null; // id con formato inválido
    throw toDataError(error);
  }
  return data ? toSpace(supabase, data) : null;
}

export async function listMyGarages(): Promise<OwnerGarage[]> {
  const supabase = db();
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("garages")
    .select(OWNER_COLUMNS)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .returns<OwnerGarageRow[]>();
  if (error) throw toDataError(error);
  return data.map((row) => toOwnerGarage(supabase, row));
}

export async function getMyGarage(id: string): Promise<OwnerGarage | null> {
  const supabase = db();
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("garages")
    .select(OWNER_COLUMNS)
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle<OwnerGarageRow>();
  if (error) {
    if (error.code === "22P02") return null;
    throw toDataError(error);
  }
  return data ? toOwnerGarage(supabase, data) : null;
}

export async function createGarage(input: GarageInput): Promise<{ id: string }> {
  checkInput(input);
  const supabase = db();
  await requireUserId(supabase);
  const { data, error } = await supabase
    .from("garages")
    .insert({ ...publicFields(input), status: "borrador" })
    .select("id")
    .single<{ id: string }>();
  if (error) throw toDataError(error);

  const { error: privError } = await supabase
    .from("garage_private")
    .insert({ garage_id: data.id, ...privateFields(input) });
  if (privError) {
    // No dejar un borrador sin ubicación a medio crear.
    await supabase.from("garages").delete().eq("id", data.id);
    throw toDataError(privError);
  }
  return { id: data.id };
}

export async function updateGarage(id: string, input: GarageInput): Promise<void> {
  checkInput(input);
  const supabase = db();
  await requireUserId(supabase);

  // Primero lo privado: si el garage está publicado, el punto público tiene que existir.
  const { data: updatedPriv, error: privError } = await supabase
    .from("garage_private")
    .update(privateFields(input))
    .eq("garage_id", id)
    .select("garage_id");
  if (privError) throw toDataError(privError);
  if (updatedPriv.length === 0) {
    const { error: insError } = await supabase.from("garage_private").insert({ garage_id: id, ...privateFields(input) });
    if (insError) throw toDataError(insError);
  }

  const { data, error } = await supabase.from("garages").update(publicFields(input)).eq("id", id).select("id");
  if (error) throw toDataError(error);
  if (data.length === 0) throw new DataError("No encontramos ese garage entre los tuyos.", "not_found");
}

export async function setGarageStatus(id: string, status: ListingStatus): Promise<void> {
  const supabase = db();
  await requireUserId(supabase);
  const { data, error } = await supabase.from("garages").update({ status }).eq("id", id).select("id");
  if (error) throw toDataError(error);
  if (data.length === 0) throw new DataError("No encontramos ese garage entre los tuyos.", "not_found");
}

export async function deleteGarage(id: string): Promise<void> {
  const supabase = db();
  await requireUserId(supabase);
  // Primero los archivos: las reglas de Storage exigen que el garage exista.
  const { data: photos, error: listError } = await supabase.from("garage_photos").select("path").eq("garage_id", id);
  if (listError) throw toDataError(listError);
  if (photos.length > 0) {
    const { error: rmError } = await supabase.storage.from(GARAGE_PHOTOS_BUCKET).remove(photos.map((p) => p.path));
    if (rmError) throw toDataError(rmError);
  }
  const { data, error } = await supabase.from("garages").delete().eq("id", id).select("id");
  if (error) throw toDataError(error);
  if (data.length === 0) throw new DataError("No encontramos ese garage entre los tuyos.", "not_found");
}

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function uploadGaragePhoto(garageId: string, file: File): Promise<GaragePhoto> {
  if (!(PHOTO_LIMITS.mimeTypes as readonly string[]).includes(file.type))
    throw new DataError("La foto tiene que ser JPG, PNG o WebP.", "validation");
  if (file.size > PHOTO_LIMITS.maxBytes) throw new DataError("Cada foto puede pesar hasta 5 MB.", "validation");

  const supabase = db();
  await requireUserId(supabase);

  const { data: existing, error: countError } = await supabase
    .from("garage_photos")
    .select("position")
    .eq("garage_id", garageId);
  if (countError) throw toDataError(countError);
  if (existing.length >= PHOTO_LIMITS.maxPerGarage)
    throw new DataError(`Podés subir hasta ${PHOTO_LIMITS.maxPerGarage} fotos por garage.`, "validation");
  const position = existing.reduce((max, p) => Math.max(max, p.position + 1), 0);

  const path = `${garageId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const bucket = supabase.storage.from(GARAGE_PHOTOS_BUCKET);
  const { error: upError } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (upError) throw toDataError(upError);

  const { error } = await supabase.from("garage_photos").insert({ garage_id: garageId, path, position });
  if (error) {
    await bucket.remove([path]);
    throw toDataError(error);
  }
  return { path, position, url: photoUrl(supabase, path) };
}

export async function removeGaragePhoto(garageId: string, path: string): Promise<void> {
  if (!path.startsWith(`${garageId}/`)) throw new DataError("Esa foto no corresponde a este garage.", "validation");
  const supabase = db();
  await requireUserId(supabase);
  const { error } = await supabase.from("garage_photos").delete().eq("garage_id", garageId).eq("path", path);
  if (error) throw toDataError(error);
  const { error: rmError } = await supabase.storage.from(GARAGE_PHOTOS_BUCKET).remove([path]);
  if (rmError) throw toDataError(rmError);
}

// Verificación en compilación de que se cumple el contrato.
export const garagesApi: GaragesApi = {
  listPublishedGarages,
  getPublishedGarage,
  listMyGarages,
  getMyGarage,
  createGarage,
  updateGarage,
  setGarageStatus,
  deleteGarage,
  uploadGaragePhoto,
  removeGaragePhoto,
};
