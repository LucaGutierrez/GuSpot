"use client";

// Perfil, documentos de identidad (privados) y vehículos. Reglas y permisos en
// supabase/migrations/20261010150000_profiles_identity.sql.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import { DataError, type IdentityDoc, type Profile, type Requirement, type Vehicle } from "./types";

const IDENTITY_BUCKET = "identity-docs";
const INSURANCE_BUCKET = "insurance-docs";

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
  // Controles de la base (migración 20261014120000_trust_checks.sql).
  if (m.includes("dni_in_use") || m.includes("profiles_verified_dni_key"))
    return new DataError("Ese DNI ya está verificado en otra cuenta. Si es tuyo, escribinos para revisarlo.", "validation");
  if (m.includes("birth_date_invalid")) return new DataError("La fecha de nacimiento no es válida.", "validation");
  if (m.includes("license_expiry_invalid"))
    return new DataError("El vencimiento de la licencia no es válido: revisá el año.", "validation");
  if (m.includes("insurance_expiry_invalid"))
    return new DataError("El vencimiento del seguro no es válido: revisá el año (las pólizas duran hasta un año).", "validation");
  if (m.includes("license_category")) return new DataError("Elegí una categoría de licencia de la lista.", "validation");
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
const AVATAR_BUCKET = "avatars";

/** URL pública de una foto de perfil ("" si no tiene). */
export function avatarUrl(path: string): string {
  const supabase = getSupabase();
  if (!path || !supabase) return "";
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Recorte cuadrado centrado de 512 px (JPEG). */
async function squareAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext("2d")
    ?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new DataError("No pudimos leer esa foto. Probá con otra.", "validation");
  return blob;
}

/** Ruta de mi foto de perfil ("" si no tengo). */
export async function getMyAvatarPath(): Promise<string> {
  const supabase = db();
  const me = await requireUserId(supabase);
  const { data } = await supabase.from("profiles").select("avatar_path").eq("id", me).maybeSingle<{ avatar_path: string }>();
  return data?.avatar_path ?? "";
}

async function setAvatarPath(supabase: ReturnType<typeof db>, me: string, path: string): Promise<void> {
  const { data: updated, error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", me).select("id");
  if (error) throw toDataError(error);
  if (updated.length === 0) {
    const { error: insError } = await supabase.from("profiles").insert({ id: me, avatar_path: path });
    if (insError) throw toDataError(insError);
  }
}

/** Sube una foto de perfil nueva (reemplaza la anterior). Devuelve la ruta. */
export async function uploadAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new DataError("Tiene que ser una foto.", "validation");
  const supabase = db();
  const me = await requireUserId(supabase);
  const previous = await getMyAvatarPath();
  const body = await squareAvatar(file);
  const path = `${me}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, body, { contentType: "image/jpeg" });
  if (error) throw toDataError(error);
  await setAvatarPath(supabase, me, path);
  if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
  return path;
}

export async function removeAvatar(): Promise<void> {
  const supabase = db();
  const me = await requireUserId(supabase);
  const previous = await getMyAvatarPath();
  await setAvatarPath(supabase, me, "");
  if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
}

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
  const me = await requireUserId(supabase);
  const [{ data, error }, photos] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, brand, model, color, plate, size, insurer, insurance_policy, insurance_expiry")
      .order("created_at")
      .returns<
        (Omit<Vehicle, "insurancePolicy" | "insuranceExpiry" | "insurancePhoto"> & {
          insurance_policy: string;
          insurance_expiry: string | null;
        })[]
      >(),
    supabase.storage.from(INSURANCE_BUCKET).list(me),
  ]);
  if (error) throw toDataError(error);
  const withPhoto = new Set((photos.data ?? []).map((o) => o.name));
  return data.map(({ insurance_policy, insurance_expiry, ...v }) => ({
    ...v,
    insurancePolicy: insurance_policy,
    insuranceExpiry: insurance_expiry ?? "",
    insurancePhoto: withPhoto.has(v.id),
  }));
}

/** Seguro vigente: compañía, póliza, vencimiento hoy o después y foto del certificado. */
export function isInsured(
  v: Pick<Vehicle, "insurer" | "insurancePolicy" | "insuranceExpiry" | "insurancePhoto">,
  today: string,
): boolean {
  return (
    !!v.insurer.trim() && !!v.insurancePolicy.trim() && !!v.insuranceExpiry && v.insuranceExpiry >= today && v.insurancePhoto
  );
}

/** Sube (o reemplaza) la foto del certificado del seguro de un vehículo propio. */
export async function uploadInsurancePhoto(vehicleId: string, file: File): Promise<void> {
  if (!file.type.startsWith("image/")) throw new DataError("Tiene que ser una foto.", "validation");
  const supabase = db();
  const me = await requireUserId(supabase);
  const body = await shrink(file);
  const { error } = await supabase.storage
    .from(INSURANCE_BUCKET)
    .upload(`${me}/${vehicleId}`, body, { contentType: "image/jpeg", upsert: true });
  if (error) throw toDataError(error);
}

/**
 * Enlace temporal (5 min) a la foto del seguro: la propia, o la de un conductor
 * con reserva o aviso activo en tu garaje (lo controla la base).
 */
export async function insurancePhotoUrl(path: string): Promise<string | null> {
  const supabase = db();
  await requireUserId(supabase);
  const { data } = await supabase.storage.from(INSURANCE_BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

const insuranceRow = (v: Pick<Vehicle, "insurer" | "insurancePolicy" | "insuranceExpiry">) => ({
  insurer: v.insurer.trim(),
  insurance_policy: v.insurancePolicy.trim(),
  insurance_expiry: v.insuranceExpiry || null,
});

export async function updateVehicleInsurance(
  id: string,
  v: Pick<Vehicle, "insurer" | "insurancePolicy" | "insuranceExpiry">,
): Promise<void> {
  const supabase = db();
  await requireUserId(supabase);
  const { error } = await supabase.from("vehicles").update(insuranceRow(v)).eq("id", id);
  if (error) throw toDataError(error);
}

/** Agrega el vehículo y devuelve su id (para subir la foto del seguro). */
export async function addVehicle(v: Omit<Vehicle, "id" | "insurancePhoto">): Promise<string> {
  const supabase = db();
  await requireUserId(supabase);
  const { data, error } = await supabase.from("vehicles").insert({
    brand: v.brand.trim(),
    model: v.model.trim(),
    color: v.color.trim(),
    plate: normalizePlate(v.plate),
    size: v.size,
    ...insuranceRow(v),
  }).select("id").single<{ id: string }>();
  if (error) throw toDataError(error);
  return data.id;
}

export async function deleteVehicle(id: string): Promise<void> {
  const supabase = db();
  const me = await requireUserId(supabase);
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw toDataError(error);
  await supabase.storage.from(INSURANCE_BUCKET).remove([`${me}/${id}`]);
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
    const phoneMessages: Record<string, string> = {
      phone_disabled: "El envío de códigos por SMS todavía no está habilitado. Probá más tarde.",
      phone_missing: "Primero guardá tu celular en Datos personales.",
      phone_invalid: "Ese número no puede recibir SMS. Revisalo en Datos personales.",
      too_many: "Hiciste muchos intentos seguidos. Esperá un rato y probá de nuevo.",
      wrong_code: "El código no es correcto.",
      expired: "El código venció. Pedí uno nuevo.",
      declined: "No pudimos verificar ese número.",
      blocked: "No pudimos enviar el código a ese número.",
    };
    if (phoneMessages[code]) throw new DataError(phoneMessages[code], "validation");
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

/** Manda un código por SMS al celular guardado en el perfil. */
export async function sendPhoneCode(): Promise<void> {
  await callDidit({ action: "phone_send" });
}

/** Controla el código. Si es correcto, el celular queda verificado. */
export async function checkPhoneCode(code: string): Promise<void> {
  await callDidit({ action: "phone_check", code });
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
  telefono: "Verificar tu celular con un código",
  dni_fotos: "Fotos del DNI (frente y dorso)",
  selfie: "Selfie para verificar que sos vos",
  licencia: "Licencia de conducir (datos y fotos de frente y dorso)",
  licencia_vencida: "Tu licencia de conducir está vencida",
  vehiculo: "Al menos un vehículo",
  seguro: "El seguro vigente de tu vehículo (compañía, póliza, vencimiento y foto del certificado)",
  licencia_dni: "El número de tu licencia tiene que ser el mismo que el de tu DNI",
};
