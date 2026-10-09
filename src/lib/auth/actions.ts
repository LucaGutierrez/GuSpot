"use client";

// Acciones de cuenta sobre Supabase Auth. Devuelven mensajes en español listos
// para mostrar; nunca exponen detalles internos.

import { getSupabase } from "../supabase/client";

export type AuthResult = { ok: true; message?: string } | { ok: false; message: string };

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  message: "Las cuentas todavía no están configuradas en esta versión (modo demo).",
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

export async function signUp(email: string, password: string, displayName: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { display_name: displayName.trim() },
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

export async function updateDisplayName(displayName: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return NOT_CONFIGURED;
  const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
  return error ? { ok: false, message: friendly(error) } : { ok: true, message: "Guardamos tu nombre." };
}
