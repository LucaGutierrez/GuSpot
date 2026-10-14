"use client";

// Pagos con Mercado Pago. Todo lo que usa claves o tokens lo hace la función
// del servidor supabase/functions/mercadopago; acá solo se la llama y se
// traducen los errores. Reglas en supabase/migrations/20261011160000_mercadopago.sql.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import { DataError } from "./types";

function db(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) throw new DataError("Los pagos no están disponibles en esta versión (modo demo).", "not_configured");
  return supabase;
}

const MESSAGES: Record<string, string> = {
  not_configured: "Los pagos con Mercado Pago todavía no están configurados. Probá más tarde.",
  not_signed_in: "Tenés que ingresar a tu cuenta.",
  not_found: "No encontramos esa reserva.",
  not_pending: "Esta reserva ya no está esperando el pago.",
  expired: "Se venció el tiempo para pagar. Hacé la reserva de nuevo.",
  no_online_payments: "Este garaje todavía no cobra reservas online.",
  connect_failed: "No pudimos conectar tu cuenta de Mercado Pago. Probá de nuevo.",
  has_active_bookings: "Tenés reservas activas: podés desconectar Mercado Pago cuando terminen.",
  not_active: "Esta reserva ya estaba cancelada.",
  started: "La reserva ya empezó: no se puede cancelar desde la app.",
  just_paid: "El pago se acaba de aprobar. Revisá la reserva antes de cancelar.",
  refund_failed: "No pudimos hacer la devolución en este momento. Probá de nuevo en unos minutos.",
  no_refund: "Ya pasó el tiempo para cancelar con devolución.",
  too_many: "Hiciste muchos intentos seguidos. Esperá un rato y probá de nuevo.",
};

async function callMP<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const supabase = db();
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) throw new DataError(MESSAGES.not_signed_in, "not_signed_in");
  const { data, error } = await supabase.functions.invoke("mercadopago", { body });
  if (error) {
    let code = "";
    try {
      code = ((await (error as { context?: Response }).context?.json()) as { error?: string })?.error ?? "";
    } catch {
      // sin cuerpo
    }
    if (MESSAGES[code]) throw new DataError(MESSAGES[code], code === "not_configured" ? "not_configured" : "validation");
    throw new DataError("No pudimos conectar con Mercado Pago. Probá de nuevo.", "network");
  }
  return data as T;
}

// --- Reglas -----------------------------------------------------------------

export interface PaymentSettings {
  /** Cargo de servicio de GuSpot en % de la tarifa total (sale de la seña). */
  serviceFeePercent: number;
  /** Seña que se cobra al reservar, en % de la tarifa (el resto se paga en el garaje). */
  depositPercent: number;
  /** Minutos después de pagar para cancelar con devolución total. */
  refundWindowMinutes: number;
  /** Minutos que se guarda el lugar esperando el pago. */
  holdMinutes: number;
}

const FALLBACK: PaymentSettings = { serviceFeePercent: 10, depositPercent: 50, refundWindowMinutes: 10, holdMinutes: 15 };
let cached: Promise<PaymentSettings> | null = null;

/** Nunca lanza: si no hay datos, usa los valores por defecto. */
export function getPaymentSettings(): Promise<PaymentSettings> {
  cached ??= (async () => {
    const supabase = getSupabase();
    if (!supabase) return FALLBACK;
    const { data, error } = await supabase.rpc("payment_settings");
    const row = (
      data as
        | { service_fee_percent: number; refund_window_minutes: number; payment_hold_minutes: number; deposit_percent: number }[]
        | null
    )?.[0];
    if (error || !row) return FALLBACK;
    return {
      serviceFeePercent: row.service_fee_percent,
      depositPercent: row.deposit_percent,
      refundWindowMinutes: row.refund_window_minutes,
      holdMinutes: row.payment_hold_minutes,
    };
  })();
  return cached;
}

/** Igual que create_booking: porcentaje de la tarifa, redondeado a pesos enteros (en centavos). */
export function serviceFeeOf(total: number, percent: number): number {
  return Math.round((total * percent) / 10000) * 100;
}

/** Igual que bookings_set_deposit: seña en pesos enteros, entre el cargo y la tarifa. */
export function depositOf(total: number, s: Pick<PaymentSettings, "depositPercent" | "serviceFeePercent">): number {
  return Math.min(total, Math.max(serviceFeeOf(total, s.serviceFeePercent), serviceFeeOf(total, s.depositPercent)));
}

// --- Conductor --------------------------------------------------------------

/** Crea el pago en Mercado Pago y devuelve la URL para pagar (abrirla en esta pestaña). */
export async function startCheckout(bookingId: string): Promise<string> {
  const data = await callMP<{ url?: string }>({ action: "checkout", booking_id: bookingId, origin: window.location.origin });
  if (!data.url) throw new DataError("No pudimos iniciar el pago. Probá de nuevo.");
  return data.url;
}

/** Consulta el pago al volver de Mercado Pago (el aviso del servidor puede tardar). */
export async function syncPayment(bookingId: string): Promise<void> {
  await callMP({ action: "sync", booking_id: bookingId });
}

/** Cancela la reserva. Devuelve si hubo devolución. */
export async function cancelPaidBooking(bookingId: string, acceptNoRefund = false): Promise<{ refunded: boolean }> {
  const data = await callMP<{ refunded?: boolean }>({ action: "cancel", booking_id: bookingId, accept_no_refund: acceptNoRefund });
  return { refunded: !!data.refunded };
}

// --- Garaje -----------------------------------------------------------------

export interface PaymentAccount {
  connected: boolean;
  liveMode: boolean;
  connectedAt: string | null;
}

export async function getMyPaymentAccount(): Promise<PaymentAccount> {
  const supabase = db();
  const { data, error } = await supabase.rpc("my_payment_account");
  if (error) throw new DataError("No pudimos consultar tu cuenta de cobro.", "network");
  const row = (data as { connected: boolean; live_mode: boolean; connected_at: string }[])[0];
  return row ? { connected: true, liveMode: row.live_mode, connectedAt: row.connected_at } : { connected: false, liveMode: false, connectedAt: null };
}

const STATE_KEY = "guspot:mp-state";
const CONNECT_RETURN_PATH = "/mis-garages/cobros/";

function redirectUri() {
  return `${window.location.origin}${CONNECT_RETURN_PATH}`;
}

/** URL de Mercado Pago para autorizar a GuSpot a cobrar en nombre del garaje. */
export async function startConnect(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const state = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
  sessionStorage.setItem(STATE_KEY, state);
  const data = await callMP<{ url?: string }>({ action: "connect_url", redirect: redirectUri(), state });
  if (!data.url) throw new DataError("No pudimos iniciar la conexión con Mercado Pago.");
  return data.url;
}

/** Al volver de Mercado Pago con ?code=&state=. */
export async function finishConnect(code: string, state: string): Promise<void> {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!expected || expected !== state) {
    throw new DataError("El enlace de conexión no es válido o ya se usó. Empezá de nuevo.", "validation");
  }
  await callMP({ action: "connect_finish", redirect: redirectUri(), code });
}

export async function disconnectPayments(): Promise<void> {
  await callMP({ action: "disconnect" });
}
