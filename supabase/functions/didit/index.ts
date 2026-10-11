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

import { createClient } from "npm:@supabase/supabase-js@2";

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

type IdentityStatus = "sin_verificar" | "en_revision" | "verificada" | "rechazada";

Deno.serve(async (req) => {
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

  let body: { action?: string; callback?: string } = {};
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
        next = "verificada";
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

  return json({ error: "bad_request" }, 400);
});
