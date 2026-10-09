"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isBackendConfigured } from "./config";

let client: SupabaseClient | null = null;

/**
 * Cliente de Supabase para el navegador (una sola instancia). Devuelve `null`
 * en modo demo (sin configuración) o durante el build estático.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isBackendConfigured || typeof window === "undefined") return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      // PKCE: los enlaces de confirmación/recuperación traen un código de un
      // solo uso que se canjea en este navegador.
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
