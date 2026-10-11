"use client";

// Perfil, documentos de identidad (privados) y vehículos. Reglas y permisos en
// supabase/migrations/20261010150000_profiles_identity.sql.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import { DataError, type IdentityDoc, type Profile, type Requirement, type Vehicle } from "./types";

export const IDENTITY_BUCKET = "identity-docs";

function db(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) throw new DataError("Las cuentas no están disponibles en esta versión (modo demo).", "not_configured");
  return supabase;
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new DataError("Tenés que ingresar a tu cuenta.", "not_signed_in");
  return id;
}

function toDataError(error: { message?: string; code?: string }): DataError {
  const m = error.message ?? "";
  if (m.includes("vehicles_plate_check")) return new DataError("La patente no es válida (ej.: AB123CD o ABC123).", "validation");
  if (m.includes("vehicles_user_id_plate_key") || error.code === "23505")
    return new DataError("Ya tenés un vehículo con esa patente.", "validation");
  if (m.includes("dni_number")) return new DataError("El DNI tiene que tener 7 u 8 números.", "validation");
  if (m.includes("phone")) return new DataError("El celular no es válido.", "validation");
  if (error.code === "23514" || error.code === "22P02" || error.code === "22007" || error.code === "22008")
    return new DataError("Hay datos inválidos. Revisá el formulario.", "validation");
  if (/fetch|network/i.test(m)) return new DataError("No pudimos conectarnos. Revisá tu conexión.", "network");
  if (/payload too large|exceeded|size/i.test(m)) return new DataError("La foto es demasiado pesada.", "validation");
  return new DataError("No pudimos guardar. Probá de nuevo en unos minutos.");
}

const EMPTY: Profile = {
  firstName: "",
  lastName: "",
  dni: "",
  birthDate: "",
  phone: "",
  licenseNumber: "",
  licenseCategory: "",
  licenseExpiry: "",
  identityStatus: "sin_verificar",
  phoneVerified: false,
};

interface ProfileRow {
  first_name: string;
  last_name: string;
  dni_number: string;
  birth_date: string | null;
  phone: string;
  license_number: string;
  license_category: string;
  license_expiry: string | null;
  identity_status: Profile["identityStatus"];
  phone_verified: boolean;
}

export async function getMyProfile(): Promise<Profile> {
  const supabase = db();
  const me = await requireUserId(supabase);
  const { data, error } = await supabase.from("profiles").select("*").eq("id", me).maybeSingle<ProfileRow>();
  if (error) throw toDataError(error);
  if (!data) return { ...EMPTY };
  return {
    firstName: data.first_name,
    lastName: data.last_name,
    dni: data.dni_number,
    birthDate: data.birth_date ?? "",
    phone: data.phone,
    licenseNumber: data.license_number,
    licenseCategory: data.license_category,
    licenseExpiry: data.license_expiry ?? "",
    identityStatus: data.identity_status,
    phoneVerified: data.phone_verified,
  };
}

/** Guarda los datos editables (no toca el estado de verificación). */
export async function saveMyProfile(p: Omit<Profile, "identityStatus" | "phoneVerified">): Promise<void> {
  const supabase = db();
  const me = await requireUserId(supabase);
  const row = {
    first_name: p.firstName.trim(),
    last_name: p.lastName.trim(),
    dni_number: p.dni.replace(/\D/g, ""),
    birth_date: p.birthDate || null,
    phone: normalizePhone(p.phone),
    license_number: p.licenseNumber.trim(),
    license_category: p.licenseCategory,
    license_expiry: p.licenseExpiry || null,
  };
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", me).maybeSingle();
  const { error } = existing
    ? await supabase.from("profiles").update(row).eq("id", me)
    : await supabase.from("profiles").insert({ id: me, ...row });
  if (error) throw toDataError(error);
  // El nombre visible en todo el sitio es el del perfil.
  const displayName = `${row.first_name} ${row.last_name}`.trim();
  if (displayName) await supabase.auth.updateUser({ data: { display_name: displayName } });
}

/** Celular argentino a formato internacional: "11 2345-6789" / "011 15 2345 6789" → "+541123456789". */
export function normalizePhone(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return `+${raw.replace(/\D/g, "")}`;
  let d = raw.replace(/\D/g, "").replace(/^0/, "");
  // Quitar el "15" de los celulares escritos a la antigua (11 15 2345 6789).
  // Solo si sobra el 15: código de área + 15 + número = 12 dígitos.
  if (d.length === 12) d = d.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
  return `+54${d}`;
}

// --- Documentos -------------------------------------------------------------

/** Achica la foto (máx. 1600 px, JPEG) para que suba rápido desde el celular. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function uploadIdentityDoc(doc: IdentityDoc, file: File): Promise<void> {
  if (!file.type.startsWith("image/")) throw new DataError("Tiene que ser una foto.", "validation");
  const supabase = db();
  const me = await requireUserId(supabase);
  const body = await shrink(file);
  const { error } = await supabase.storage
    .from(IDENTITY_BUCKET)
    .upload(`${me}/${doc}`, body, { contentType: "image/jpeg", upsert: true });
  if (error) throw toDataError(error);
}

/** Qué documentos ya subió la persona. */
export async function myUploadedDocs(): Promise<Set<IdentityDoc>> {
  const supabase = db();
  const me = await requireUserId(supabase);
  const { data, error } = await supabase.storage.from(IDENTITY_BUCKET).list(me);
  if (error) throw toDataError(error);
  return new Set(data.map((o) => o.name as IdentityDoc));
}

/** Enlace temporal (5 min) para ver la propia foto. */
export async function docPreviewUrl(doc: IdentityDoc): Promise<string | null> {
  const supabase = db();
  const me = await requireUserId(supabase);
  const { data } = await supabase.storage.from(IDENTITY_BUCKET).createSignedUrl(`${me}/${doc}`, 300);
  return data?.signedUrl ?? null;
}

// --- Vehículos --------------------------------------------------------------

export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function listMyVehicles(): Promise<Vehicle[]> {
  const supabase = db();
  await requireUserId(supabase);
  const { data, error } = await supabase
    .from("vehicles")
    .select("id, brand, model, color, plate, size")
    .order("created_at")
    .returns<Vehicle[]>();
  if (error) throw toDataError(error);
  return data;
}

export async function addVehicle(v: Omit<Vehicle, "id">): Promise<void> {
  const supabase = db();
  await requireUserId(supabase);
  const { error } = await supabase.from("vehicles").insert({
    brand: v.brand.trim(),
    model: v.model.trim(),
    color: v.color.trim(),
    plate: normalizePlate(v.plate),
    size: v.size,
  });
  if (error) throw toDataError(error);
}

export async function deleteVehicle(id: string): Promise<void> {
  const supabase = db();
  await requireUserId(supabase);
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw toDataError(error);
}

// --- Verificación con Didit (función del servidor supabase/functions/didit) ---

async function callDidit(body: Record<string, unknown>): Promise<Record<string, string>> {
  const supabase = db();
  await requireUserId(supabase);
  const { data, error } = await supabase.functions.invoke("didit", { body });
  if (error) {
    let code = "";
    try {
      code = ((await (error as { context?: Response }).context?.json()) as { error?: string })?.error ?? "";
    } catch {
      // sin cuerpo
    }
    if (code === "datos_personales") throw new DataError("Primero guardá tus datos personales.", "validation");
    if (code === "not_configured")
      throw new DataError("La verificación todavía no está configurada. Probá más tarde.", "not_configured");
    throw new DataError("No pudimos conectar con el servicio de verificación. Probá de nuevo.", "network");
  }
  return data as Record<string, string>;
}

/** Crea la sesión de verificación y devuelve la URL de Didit (abrirla en esta pestaña). */
export async function startIdentityCheck(callback: string): Promise<string> {
  const data = await callDidit({ action: "start", callback });
  if (!data.url) throw new DataError("No pudimos iniciar la verificación. Probá de nuevo.");
  return data.url;
}

/** Consulta el resultado en Didit y devuelve el estado actualizado. */
export async function syncIdentityCheck(): Promise<{ status: Profile["identityStatus"]; reason: string }> {
  const data = await callDidit({ action: "sync" });
  return { status: (data.status as Profile["identityStatus"]) ?? "sin_verificar", reason: data.reason ?? "" };
}

// --- Requisitos -------------------------------------------------------------

export async function myMissingRequirements(role: "conductor" | "propietario"): Promise<Requirement[]> {
  const supabase = db();
  await requireUserId(supabase);
  const { data, error } = await supabase.rpc("my_missing_requirements", { p_role: role });
  if (error) throw toDataError(error);
  return (data ?? []) as Requirement[];
}

export const REQUIREMENT_LABEL: Record<Requirement, string> = {
  datos_personales: "Datos personales (nombre, DNI, fecha de nacimiento —18 años o más— y celular)",
  identidad: "Verificar tu identidad (DNI + reconocimiento facial)",
  dni_fotos: "Fotos del DNI (frente y dorso)",
  selfie: "Selfie para verificar que sos vos",
  licencia: "Licencia de conducir (datos y fotos de frente y dorso)",
  licencia_vencida: "Tu licencia de conducir está vencida",
  vehiculo: "Al menos un vehículo",
};
