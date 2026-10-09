// Conexión con Supabase (base de datos, cuentas y fotos).
//
// Se configura con dos variables PÚBLICAS en `.env.local` (ver .env.example):
//   NEXT_PUBLIC_SUPABASE_URL              URL del proyecto
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  clave "publishable" (sb_publishable_…)
//
// La clave publishable puede estar en el navegador o en una app móvil: solo
// accede a lo que permiten las reglas de seguridad (RLS) de la base de datos.
// NUNCA usar aquí una clave secreta (sb_secret_… / service_role).
//
// Sin estas variables la app funciona en "modo demo": solo datos de ejemplo,
// sin cuentas.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export const isBackendConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

if (SUPABASE_PUBLISHABLE_KEY.startsWith("sb_secret_")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY contiene una clave SECRETA. Usá la clave publishable.",
  );
}

/** Bucket de Storage con las fotos de los garages (lectura pública). */
export const GARAGE_PHOTOS_BUCKET = "garage-photos";
