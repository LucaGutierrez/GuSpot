"use client";

// Acciones de cuenta sobre Supabase Auth. Devuelven mensajes en español listos
// para mostrar; nunca exponen detalles internos.

import { getSupabase } from "../supabase/client";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../supabase/config";

export type AuthResult = { ok: true; message?: string } | { ok: false; message: string };

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  message: "Las cuentas no están disponibles en esta copia del sitio.",
};

export const PASSWORD_MIN_LENGTH = 8;

function friendly(error: { message?: string; code?: string; status?: number }): string {
  const code = error.code ?? "";
  if (code === "invalid_credentials") return "Email o contraseña incorrectos.";
  if (code === "email_not_confirmed") return "Todavía no confirmaste tu email. Revisá tu correo (y la carpeta de spam).";
  if (code === "user_already_exists" || code === "email_exists") return "Ya existe una cuenta con ese email. Probá ingresar o recuperar la contraseña.";
  if (code === "weak_password") return `La contraseña es demasiado débil. Usá al menos ${PASSWORD_MIN_LENGTH} caracteres, mezclando letras y números.`;
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || error.status === 429)
    return "Hiciste demasiados intentos seguidos. Esperá unos minutos y probá de nuevo.";
  if (code === "same_password") return "La nueva contraseña tiene que ser distinta de la anterior.";
  if (error.status === 0 || /fetch|network/i.test(error.message ?? "")) return "No pudimos conectarnos. Revisá tu conexión.";
  return "No pudimos completar la operación. Probá de nuevo en unos minutos.";
}

function redirect(path: string): string {
  return `${window.location.origin}${path}`;
}

interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Solo números. */
  dni: string;
  birthDate: string; // YYYY-MM-DD
  /** +54… */
  phone: string;
}

/**
 * Crea la cuenta. Los datos personales viajan en los metadatos y la base los
 * copia al perfil (migración 20261011130000_signup_profile.sql).
 */
export async function signUp(input: SignUpData): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        display_name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
        dni: input.dni,
        birth_date: input.birthDate,
        phone: input.phone,
      },
      emailRedirectTo: redirect("/ingresar/?confirmado=1"),
    },
  });
  if (error) return { ok: false, message: friendly(error) };
  // Con confirmación de email activada no hay sesión hasta confirmar.
  if (!data.session)
    return { ok: true, message: "Te enviamos un email para confirmar tu cuenta. Abrí el enlace desde este mismo navegador." };
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? { ok: false, message: friendly(error) } : { ok: true };
}

export type OAuthProvider = "google" | "apple";

const PROVIDER_NAME: Record<OAuthProvider, string> = { google: "Google", apple: "Apple" };

/** Métodos de ingreso activados en Supabase (los botones solo aparecen si están activos). */
export async function enabledProviders(): Promise<OAuthProvider[]> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } });
    if (!res.ok) return [];
    const external = ((await res.json()) as { external?: Record<string, boolean> }).external ?? {};
    return (["google", "apple"] as const).filter((p) => external[p]);
  } catch {
    return [];
  }
}

/**
 * Ingreso (o registro) con Google o Apple. Abre la página del proveedor; al
 * volver, /ingresar/ termina el ingreso y sigue a `next` (o a completar datos).
 */
export async function signInWithProvider(provider: OAuthProvider, next: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirect(`/ingresar/?volver=${encodeURIComponent(next)}`) },
  });
  return error
    ? { ok: false, message: `No pudimos abrir el ingreso con ${PROVIDER_NAME[provider]}. Probá de nuevo.` }
    : { ok: true };
}

export async function signOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirect("/recuperar/nueva/"),
  });
  // Mismo mensaje exista o no la cuenta (no revelar qué emails están registrados).
  if (error && error.status === 429) return { ok: false, message: friendly(error) };
  return { ok: true, message: "Si hay una cuenta con ese email, te enviamos un enlace para crear una nueva contraseña." };
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.updateUser({ password });
  return error ? { ok: false, message: friendly(error) } : { ok: true, message: "Listo, actualizamos tu contraseña." };
}
