// Función del servidor (Supabase Edge Function) para cobrar reservas con Mercado Pago.
// Modelo "marketplace": cada garage conecta su cuenta (OAuth) y cobra directo;
// GuSpot se queda con el cargo de servicio (`marketplace_fee`).
// Las claves y los tokens son SECRETOS: viven solo acá y en la tabla mp_accounts
// (sin acceso desde la página).
//
// Secretos a configurar en Supabase (Edge Functions → Secrets):
//   MP_CLIENT_ID      número de la aplicación de Mercado Pago
//   MP_CLIENT_SECRET  clave secreta de la aplicación
//   MP_TEST_MODE      "true" mientras se prueba. Las pruebas se hacen con CUENTAS DE PRUEBA de
//                     Mercado Pago (vendedor = garage, comprador = conductor): ellas hacen que la
//                     plata sea ficticia. No se usan los tokens "TEST-" ni el sandbox viejo, que fallan.
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya existen en toda Edge Function.
//
// Se publica SIN verificación de JWT (--no-verify-jwt) porque Mercado Pago
// llama al aviso de pago sin sesión; las demás acciones controlan la sesión acá.
//
// Acciones (POST, con la sesión de la persona):
//   { action: "connect_url", redirect, state }  URL para conectar la cuenta del garage
//   { action: "connect_finish", redirect, code } guarda la cuenta conectada
//   { action: "disconnect" }                     desconecta la cuenta
//   { action: "checkout", booking_id, origin }   crea el pago y devuelve { url }
//   { action: "sync", booking_id }               consulta el pago (al volver de Mercado Pago)
//   { action: "cancel", booking_id, accept_no_refund? }  cancela (con devolución si corresponde)
// Aviso de Mercado Pago: POST ?webhook=1&booking=<id>

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const MP = "https://api.mercadopago.com";
const ORIGINS = [/^https:\/\/([a-z0-9-]+\.)?guspot-demo\.pages\.dev$/, /^http:\/\/localhost:3000$/];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const allowedOrigin = (o: unknown) => typeof o === "string" && ORIGINS.some((re) => re.test(o));
/** Página a la que vuelve Mercado Pago después de conectar la cuenta. */
const allowedRedirect = (r: unknown) =>
  typeof r === "string" && allowedOrigin(r.replace(/\/mis-garages\/cobros\/$/, "")) && r.endsWith("/mis-garages/cobros/");

interface Booking {
  id: string;
  garage_id: string;
  driver_id: string;
  garage_title: string;
  start_at: string;
  hours: number;
  status: "pendiente_pago" | "confirmada" | "cancelada";
  payment_status: string;
  total_price: number;
  service_fee: number;
  hold_until: string | null;
  paid_at: string | null;
  mp_payment_id: string | null;
}

interface Account {
  owner_id: string;
  mp_user_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
}

interface Payment {
  id: number;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
  date_approved: string | null;
}

const BOOKING_COLUMNS =
  "id, garage_id, driver_id, garage_title, start_at, hours, status, payment_status, total_price, service_fee, hold_until, paid_at, mp_payment_id";

const pesos = (centavos: number) => Math.round(centavos) / 100;
/** start_at es hora local argentina (UTC−3, sin horario de verano). */
const arDate = (local: string) => new Date(`${local.slice(0, 19)}-03:00`);

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`missing ${name}`);
  return v;
}

const testMode = () => Deno.env.get("MP_TEST_MODE") === "true";

/** Guarda el error en public.function_errors (además del log) para poder diagnosticarlo. */
async function logError(step: string, detail: unknown) {
  const text = typeof detail === "string" ? detail : JSON.stringify(detail);
  console.error("mp", step, text);
  try {
    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    await admin.from("function_errors").insert({ fn: "mercadopago", step, detail: text.slice(0, 4000) });
  } catch {
    // sin registro
  }
}

async function oauthToken(body: Record<string, string>) {
  const res = await fetch(`${MP}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: env("MP_CLIENT_ID"), client_secret: env("MP_CLIENT_SECRET"), ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    await logError("oauth", { status: res.status, body: body.grant_type, data });
    return null;
  }
  return data as {
    access_token: string;
    refresh_token?: string;
    public_key?: string;
    user_id: number;
    live_mode?: boolean;
    expires_in?: number;
  };
}

const expiresAt = (seconds?: number) => (seconds ? new Date(Date.now() + seconds * 1000).toISOString() : null);

/** Token del garage, renovado si vence en menos de un día. */
async function sellerToken(admin: SupabaseClient, ownerId: string): Promise<string | null> {
  const { data: acc } = await admin.from("mp_accounts").select("*").eq("owner_id", ownerId).maybeSingle<Account>();
  if (!acc) return null;
  if (acc.expires_at && new Date(acc.expires_at).getTime() - Date.now() < 86_400_000 && acc.refresh_token) {
    const t = await oauthToken({ grant_type: "refresh_token", refresh_token: acc.refresh_token });
    if (t) {
      await admin
        .from("mp_accounts")
        .update({
          access_token: t.access_token,
          refresh_token: t.refresh_token ?? acc.refresh_token,
          expires_at: expiresAt(t.expires_in),
        })
        .eq("owner_id", ownerId);
      return t.access_token;
    }
  }
  return acc.access_token;
}

async function ownerOf(admin: SupabaseClient, garageId: string): Promise<string | null> {
  const { data } = await admin.from("garages").select("owner_id").eq("id", garageId).maybeSingle();
  return data?.owner_id ?? null;
}

async function setting(admin: SupabaseClient, key: string, fallback: number): Promise<number> {
  const { data } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
  const n = Number(data?.value);
  return Number.isFinite(n) ? n : fallback;
}

async function refund(token: string, paymentId: string, key: string): Promise<boolean> {
  const res = await fetch(`${MP}/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": key },
    body: "{}",
  });
  if (!res.ok) await logError("refund", { status: res.status, body: await res.text() });
  return res.ok;
}

/** Aplica a la reserva lo que dice Mercado Pago del pago (fuente de verdad: la API, nunca el aviso). */
async function applyPayment(admin: SupabaseClient, b: Booking, p: Payment, token: string) {
  if (p.external_reference !== b.id) return;
  const pid = String(p.id);
  if (p.status === "approved") {
    if (Math.abs(p.transaction_amount - pesos(b.total_price + b.service_fee)) > 0.01) {
      await logError("amount_mismatch", { booking: b.id, amount: p.transaction_amount });
      return;
    }
    if (b.status === "pendiente_pago") {
      await admin
        .from("bookings")
        .update({
          status: "confirmada",
          payment_status: "aprobado",
          paid_at: p.date_approved ?? new Date().toISOString(),
          mp_payment_id: pid,
        })
        .eq("id", b.id)
        .eq("status", "pendiente_pago");
    } else if (b.status === "cancelada" && b.payment_status !== "reembolsado" && b.mp_payment_id !== pid) {
      // Pagó una reserva que ya estaba cancelada (o vencida): se devuelve todo.
      if (await refund(token, pid, `late-${b.id}`)) {
        await admin
          .from("bookings")
          .update({ payment_status: "reembolsado", refunded_at: new Date().toISOString(), mp_payment_id: pid })
          .eq("id", b.id);
      }
    }
  } else if (p.status === "refunded" || p.status === "charged_back") {
    if (b.mp_payment_id === pid) {
      await admin.from("bookings").update({ payment_status: "reembolsado" }).eq("id", b.id).neq("status", "confirmada");
    }
  } else if (p.status === "rejected" || p.status === "cancelled") {
    await admin.from("bookings").update({ payment_status: "rechazado" }).eq("id", b.id).eq("status", "pendiente_pago");
  }
}

/** Busca el último pago de la reserva en la cuenta del garage y lo aplica. */
async function syncBooking(admin: SupabaseClient, b: Booking): Promise<void> {
  const owner = await ownerOf(admin, b.garage_id);
  const token = owner && (await sellerToken(admin, owner));
  if (!token) return;
  const res = await fetch(
    `${MP}/v1/payments/search?external_reference=${b.id}&sort=date_created&criteria=desc&limit=5`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    await logError("search", { status: res.status, body: await res.text() });
    return;
  }
  const { results } = (await res.json()) as { results: Payment[] };
  const approved = results.find((p) => p.status === "approved");
  const latest = approved ?? results[0];
  if (latest) await applyPayment(admin, b, latest, token);
}

async function loadBooking(admin: SupabaseClient, id: unknown): Promise<Booking | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await admin.from("bookings").select(BOOKING_COLUMNS).eq("id", id).maybeSingle<Booking>();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const url = new URL(req.url);

  // ------------------------------------------------------------ aviso de Mercado Pago
  if (url.searchParams.get("webhook") === "1") {
    const b = await loadBooking(admin, url.searchParams.get("booking"));
    if (b) await syncBooking(admin, b);
    return json({ ok: true });
  }

  if (!Deno.env.get("MP_CLIENT_ID") || !Deno.env.get("MP_CLIENT_SECRET")) return json({ error: "not_configured" }, 503);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: "not_signed_in" }, 401);

  let body: {
    action?: string;
    redirect?: string;
    state?: string;
    code?: string;
    booking_id?: string;
    origin?: string;
    accept_no_refund?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  // ------------------------------------------------------------ conectar la cuenta del garage
  if (body.action === "connect_url") {
    if (!allowedRedirect(body.redirect) || !body.state || !/^[A-Za-z0-9_-]{16,64}$/.test(body.state)) {
      return json({ error: "bad_request" }, 400);
    }
    const q = new URLSearchParams({
      client_id: env("MP_CLIENT_ID"),
      response_type: "code",
      platform_id: "mp",
      state: body.state,
      redirect_uri: body.redirect!,
    });
    return json({ url: `https://auth.mercadopago.com/authorization?${q}` });
  }

  if (body.action === "connect_finish") {
    if (!allowedRedirect(body.redirect) || !body.code) return json({ error: "bad_request" }, 400);
    const t = await oauthToken({
      grant_type: "authorization_code",
      code: body.code,
      redirect_uri: body.redirect!,
      test_token: "false",
    });
    if (!t) return json({ error: "connect_failed" }, 400);
    const { error } = await admin.from("mp_accounts").upsert({
      owner_id: user.id,
      mp_user_id: t.user_id,
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? "",
      public_key: t.public_key ?? "",
      live_mode: t.live_mode ?? !testMode(),
      expires_at: expiresAt(t.expires_in),
      connected_at: new Date().toISOString(),
    });
    if (error) {
      await logError("save_account", error.message);
      return json({ error: "provider" }, 502);
    }
    // El trigger de inserción solo corre la primera vez: al reconectar, se marca igual.
    await admin.from("garages").update({ online_payments: true }).eq("owner_id", user.id);
    return json({ connected: true });
  }

  if (body.action === "disconnect") {
    const { data: garages } = await admin.from("garages").select("id").eq("owner_id", user.id);
    const ids = (garages ?? []).map((g: { id: string }) => g.id);
    if (ids.length > 0) {
      const { count } = await admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .in("garage_id", ids)
        .in("status", ["confirmada", "pendiente_pago"])
        .gt("end_at", new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 19));
      if ((count ?? 0) > 0) return json({ error: "has_active_bookings" }, 409);
    }
    await admin.from("mp_accounts").delete().eq("owner_id", user.id);
    return json({ connected: false });
  }

  // ------------------------------------------------------------ pagar una reserva
  const b = await loadBooking(admin, body.booking_id);

  if (body.action === "checkout") {
    if (!b || b.driver_id !== user.id) return json({ error: "not_found" }, 404);
    if (b.status !== "pendiente_pago") return json({ error: "not_pending" }, 409);
    if (!b.hold_until || new Date(b.hold_until).getTime() <= Date.now() + 30_000) return json({ error: "expired" }, 409);
    if (!allowedOrigin(body.origin)) return json({ error: "bad_request" }, 400);
    const owner = await ownerOf(admin, b.garage_id);
    const sellerAccess = owner && (await sellerToken(admin, owner));
    if (!sellerAccess) return json({ error: "no_online_payments" }, 409);

    const back = `${body.origin}/reserva/?id=${b.id}&pago=1`;
    const res = await fetch(`${MP}/checkout/preferences`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sellerAccess}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            id: b.id,
            title: `Reserva en ${b.garage_title}`.slice(0, 250),
            description: `${b.hours} h de estacionamiento`,
            quantity: 1,
            currency_id: "ARS",
            unit_price: pesos(b.total_price + b.service_fee),
          },
        ],
        marketplace_fee: pesos(b.service_fee),
        external_reference: b.id,
        // En modo prueba el comprador tiene que ser un usuario de prueba: no se manda el email real.
        payer: testMode() ? undefined : { email: user.email },
        back_urls: { success: back, failure: back, pending: back },
        auto_return: "approved",
        notification_url: `${env("SUPABASE_URL")}/functions/v1/mercadopago?webhook=1&booking=${b.id}`,
        binary_mode: true,
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(b.hold_until).toISOString(),
        statement_descriptor: "GUSPOT",
      }),
    });
    const pref = await res.json().catch(() => ({}));
    if (!res.ok) {
      await logError("preference", { status: res.status, pref });
      return json({ error: "provider" }, 502);
    }
    await admin.from("bookings").update({ mp_preference_id: pref.id }).eq("id", b.id);
    return json({ url: pref.init_point });
  }

  if (body.action === "sync") {
    if (!b || b.driver_id !== user.id) return json({ error: "not_found" }, 404);
    if (b.status === "pendiente_pago" || (b.status === "cancelada" && b.payment_status !== "reembolsado")) {
      await syncBooking(admin, b);
    }
    const fresh = await loadBooking(admin, b.id);
    return json({ status: fresh?.status, payment_status: fresh?.payment_status });
  }

  if (body.action === "cancel") {
    if (!b || b.driver_id !== user.id) return json({ error: "not_found" }, 404);
    if (b.status === "cancelada") return json({ error: "not_active" }, 409);
    const now = new Date().toISOString();

    if (b.status === "pendiente_pago") {
      // Por si pagó justo ahora: primero se consulta el pago.
      await syncBooking(admin, b);
      const fresh = await loadBooking(admin, b.id);
      if (fresh?.status === "pendiente_pago") {
        await admin.from("bookings").update({ status: "cancelada", cancelled_at: now }).eq("id", b.id);
        return json({ cancelled: true, refunded: false });
      }
      return json({ error: "just_paid" }, 409);
    }

    // Confirmada
    if (arDate(b.start_at).getTime() <= Date.now()) return json({ error: "started" }, 409);
    if (b.payment_status !== "aprobado") {
      await admin.from("bookings").update({ status: "cancelada", cancelled_at: now }).eq("id", b.id);
      return json({ cancelled: true, refunded: false });
    }
    const windowMin = await setting(admin, "refund_window_minutes", 10);
    const inWindow = !!b.paid_at && Date.now() - new Date(b.paid_at).getTime() <= windowMin * 60_000;
    if (inWindow) {
      const owner = await ownerOf(admin, b.garage_id);
      const sellerAccess = owner && (await sellerToken(admin, owner));
      if (!sellerAccess || !b.mp_payment_id || !(await refund(sellerAccess, b.mp_payment_id, `cancel-${b.id}`))) {
        return json({ error: "refund_failed" }, 502);
      }
      await admin
        .from("bookings")
        .update({ status: "cancelada", cancelled_at: now, payment_status: "reembolsado", refunded_at: now })
        .eq("id", b.id);
      return json({ cancelled: true, refunded: true });
    }
    if (!body.accept_no_refund) return json({ error: "no_refund" }, 409);
    await admin.from("bookings").update({ status: "cancelada", cancelled_at: now }).eq("id", b.id);
    return json({ cancelled: true, refunded: false });
  }

  return json({ error: "bad_request" }, 400);
});
