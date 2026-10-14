// Función del servidor (Supabase Edge Function) para verificar identidad con Didit.
// La clave de Didit es SECRETA: vive solo acá (secretos del proyecto), nunca en la página.
//
// Secretos a configurar en Supabase (Edge Functions → Secrets):
//   DIDIT_API_KEY      clave de API de Didit
//   DIDIT_WORKFLOW_ID  id del flujo KYC (DNI + prueba de vida + comparación de cara)
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya existen en toda Edge Function.
//
// Acciones (POST, con la sesión de la persona):
//   { action: "start", callback }  crea la sesión en Didit y devuelve { url }
//   { action: "sync" }             consulta el resultado y actualiza profiles.identity_status
//   { action: "phone_send" }       manda un código por SMS al celular del perfil
//   { action: "phone_check", code } controla el código y marca profiles.phone_verified

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const DIDIT = "https://verification.didit.me/v3";
const ALLOWED_CALLBACK = [/^https:\/\/([a-z0-9-]+\.)?guspot-demo\.pages\.dev\//, /^http:\/\/localhost:3000\//];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");

/**
 * Límite de uso (tabla rate_limits, función rate_limit_hit). Si la base no
 * responde, se rechaza: estas acciones tienen costo (SMS, verificaciones, pagos).
 */
async function allowed(admin: SupabaseClient, key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await admin.rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("rate_limit_hit", error.message);
    return false;
  }
  return data === true;
}

type IdentityStatus = "sin_verificar" | "en_revision" | "verificada" | "rechazada";

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const apiKey = Deno.env.get("DIDIT_API_KEY");
  const workflowId = Deno.env.get("DIDIT_WORKFLOW_ID");
  if (!apiKey || !workflowId) return json({ error: "not_configured" }, 500);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: "not_signed_in" }, 401);

  let body: { action?: string; callback?: string; code?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, dni_number, birth_date, phone, identity_status")
    .eq("id", user.id)
    .maybeSingle();

  // Límites por persona (las acciones de Didit tienen costo).
  const LIMITS: Record<string, [number, number]> = {
    start: [5, 86_400],
    sync: [60, 3_600],
    phone_send: [5, 3_600],
    phone_check: [10, 3_600],
  };
  const limit = LIMITS[body.action ?? ""];
  if (limit && !(await allowed(admin, `didit:${body.action}:${user.id}`, limit[0], limit[1]))) {
    return json({ error: "too_many" }, 429);
  }

  // ------------------------------------------------------------------ start
  if (body.action === "start") {
    if (!profile || !profile.first_name || !profile.last_name || !profile.dni_number || !profile.birth_date) {
      return json({ error: "datos_personales" }, 400);
    }
    const callback =
      body.callback && ALLOWED_CALLBACK.some((re) => re.test(body.callback!)) ? body.callback : undefined;

    const res = await fetch(`${DIDIT}/session/`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        workflow_id: workflowId,
        vendor_data: user.id,
        callback,
        language: "es",
        contact_details: { email: user.email, phone: profile.phone || undefined },
        expected_details: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          date_of_birth: profile.birth_date,
          identification_number: profile.dni_number,
          id_country: "ARG",
        },
      }),
    });
    if (!res.ok) {
      console.error("didit create session", res.status, await res.text());
      return json({ error: "provider" }, 502);
    }
    const session = await res.json();
    await admin.from("identity_checks").insert({ user_id: user.id, session_id: session.session_id, status: session.status });
    return json({ url: session.url });
  }

  // ------------------------------------------------------------------ sync
  if (body.action === "sync") {
    const { data: check } = await admin
      .from("identity_checks")
      .select("id, session_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!check) return json({ status: profile?.identity_status ?? "sin_verificar" });

    const res = await fetch(`${DIDIT}/session/${check.session_id}/decision/`, { headers: { "x-api-key": apiKey } });
    if (!res.ok) {
      console.error("didit decision", res.status, await res.text());
      return json({ error: "provider" }, 502);
    }
    const d = await res.json();
    await admin.from("identity_checks").update({ status: d.status, updated_at: new Date().toISOString() }).eq("id", check.id);

    let next: IdentityStatus | null = null;
    let reason = "";
    if (d.status === "Approved") {
      // El DNI escaneado tiene que ser el mismo que cargó la persona.
      const docNumbers = (d.id_verifications ?? []).map((v: { document_number?: string; personal_number?: string }) =>
        digits(v.document_number || v.personal_number),
      );
      if (docNumbers.includes(digits(profile?.dni_number))) {
        // Un DNI, una cuenta: si ya está verificado en otra, no se aprueba.
        const { data: other } = await admin
          .from("profiles")
          .select("id")
          .eq("dni_number", profile?.dni_number)
          .eq("identity_status", "verificada")
          .neq("id", user.id)
          .limit(1)
          .maybeSingle();
        if (other) {
          next = "rechazada";
          reason = "dni_en_uso";
        } else {
          next = "verificada";
        }
      } else {
        next = "rechazada";
        reason = "dni_distinto";
      }
    } else if (d.status === "Declined") {
      next = "rechazada";
    } else if (d.status === "In Review") {
      next = "en_revision";
    }

    if (next && profile?.identity_status !== "verificada") {
      await admin.from("profiles").update({ identity_status: next }).eq("id", user.id);
    }
    return json({ status: next ?? profile?.identity_status ?? "sin_verificar", provider_status: d.status, reason });
  }

  // ------------------------------------------------------------------ celular
  if (body.action === "phone_send") {
    const phone = String(profile?.phone ?? "");
    if (!/^\+[0-9]{8,15}$/.test(phone)) return json({ error: "phone_missing" }, 400);
    const res = await fetch(`${DIDIT}/phone/send/`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: phone,
        vendor_data: user.id,
        options: { code_size: 6, locale: "es", preferred_channel: "sms" },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 403 && /top-up|credits/i.test(JSON.stringify(data))) return json({ error: "phone_disabled" }, 503);
    if (res.status === 429) return json({ error: "too_many" }, 429);
    if (res.status === 400) return json({ error: "phone_invalid" }, 400);
    if (!res.ok) {
      console.error("didit phone send", res.status, JSON.stringify(data));
      return json({ error: "provider" }, 502);
    }
    if (data.status === "Blocked") return json({ error: "blocked" }, 400);
    return json({ sent: true });
  }

  if (body.action === "phone_check") {
    const phone = String(profile?.phone ?? "");
    const code = String(body.code ?? "").replace(/\D/g, "");
    if (!/^\+[0-9]{8,15}$/.test(phone)) return json({ error: "phone_missing" }, 400);
    if (!/^[0-9]{4,8}$/.test(code)) return json({ error: "wrong_code" }, 400);
    const res = await fetch(`${DIDIT}/phone/check/`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: phone, code, disposable_number_action: "DECLINE" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) return json({ error: "too_many" }, 429);
    if (!res.ok) {
      console.error("didit phone check", res.status, JSON.stringify(data));
      return json({ error: "provider" }, 502);
    }
    if (data.status === "Approved") {
      await admin.from("profiles").update({ phone_verified: true }).eq("id", user.id);
      return json({ verified: true });
    }
    if (data.status === "Failed") return json({ error: "wrong_code" }, 400);
    if (data.status === "Declined") return json({ error: "declined" }, 400);
    return json({ error: "expired" }, 400);
  }

  return json({ error: "bad_request" }, 400);
}

// Solo las páginas de GuSpot pueden llamar a esta función desde el navegador.
const SITE_ORIGINS = [/^https:\/\/([a-z0-9-]+\.)?guspot-demo\.pages\.dev$/, /^http:\/\/localhost:3000$/];

Deno.serve(async (req) => {
  const res = await handle(req);
  const origin = req.headers.get("Origin") ?? "";
  const headers = new Headers(res.headers);
  if (SITE_ORIGINS.some((re) => re.test(origin))) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  } else {
    headers.delete("Access-Control-Allow-Origin");
  }
  return new Response(res.body, { status: res.status, headers });
});
